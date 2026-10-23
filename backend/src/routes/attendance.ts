import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getTodayRange, calculateDurationSeconds, getISTTodayString, combineDateAndTimeToISTDate, getISTMinutes } from '../utils/time';
import { attendances, attendanceEvents, workSessions, users, settings, permissions, holidays, wfhDays } from '../mongo';
import { calculateDistanceMeters } from '../utils/geo';

// Ensure connection is established (mongo.ts connects on import)

const router = Router();

// Helper to fetch today's attendance with related events & sessions
const getTodayAttendance = async (employeeId: string) => {
  const { start, end } = getTodayRange();
  const attendance = await attendances().findOne({
    employeeId,
    date: { $gte: start, $lte: end },
  });
  if (!attendance) return null;
  const [events, sessions] = await Promise.all([
    attendanceEvents().find({ attendanceId: attendance._id }).sort({ timestamp: 1 }).toArray(),
    workSessions().find({ attendanceId: attendance._id }).sort({ startTime: 1 }).toArray(),
  ]);
  return { ...attendance, events, workSessions: sessions } as any;
};

router.post('/check-in', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = req.user!.employeeId;
    const { latitude, longitude, customTime, workMode: requestedWorkMode } = req.body;
    const now = new Date();
    const existing = await getTodayAttendance(employeeId);
    if (existing && existing.status !== 'CHECKED_OUT') {
      return res.status(400).json({ error: 'Already signed in today' });
    }

    const todayStr = getISTTodayString(now);
    // Check if user has an individual approved WFH request OR if today is a Company-Wide WFH Day
    const [approvedWfh, companyWfhDay] = await Promise.all([
      permissions().findOne({
        employeeId,
        requestType: 'WFH',
        date: todayStr,
        status: 'APPROVED',
      }),
      wfhDays().findOne({ date: todayStr }),
    ]);

    const user = await users().findOne({ employeeId });
    const isWfhToday = !!approvedWfh || !!companyWfhDay;
    let workMode = isWfhToday ? 'WFH' : (user?.workMode || 'WFO');
    // Allow employee to explicitly sign in as WFO (e.g. on a company WFH day when they come into office)
    if (requestedWorkMode === 'WFO') {
      workMode = 'WFO';
    } else if (requestedWorkMode === 'WFH') {
      workMode = 'WFH';
    }
    let locationData: any = null;

    let checkInTimestamp = now;
    const isCustomSignInRequested = !!(customTime && typeof customTime === 'string');

    if (approvedWfh && approvedWfh.startTime) {
      checkInTimestamp = combineDateAndTimeToISTDate(todayStr, approvedWfh.startTime);
    } else if (isCustomSignInRequested) {
      // Validate monthly custom sign-in limit (Maximum 3 times per calendar month)
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const customSignInCount = await attendances().countDocuments({
        employeeId,
        date: { $gte: startOfMonth, $lte: endOfMonth },
        isCustomSignIn: true,
      });

      if (customSignInCount >= 3) {
        return res.status(400).json({
          error: 'Monthly earlier sign-in limit reached (Maximum 3 times per month allowed). Please sign in with current time.',
        });
      }
      checkInTimestamp = combineDateAndTimeToISTDate(todayStr, customTime);
    }

    const currentSettings = await settings().findOne({});
    const geofenceEnabled = currentSettings?.geofenceEnabled !== false; // default enabled for backward compat

    // Geofence is only enforced on the day's initial sign-in. A re-sign-in after an earlier
    // check-out (e.g. signed out from office, signing in again later from home) skips it.
    if (!existing && (workMode === 'WFO' || workMode === 'SSC') && geofenceEnabled) {
      const officeLoc = currentSettings?.officeLocation;
      const allowedRadius = (officeLoc && officeLoc.radiusMeters) ? Number(officeLoc.radiusMeters) : 500;
      if (officeLoc && officeLoc.latitude && officeLoc.longitude) {
        if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
          if (!companyWfhDay) {
            return res.status(400).json({
              error: 'Office Location Required: Please enable GPS location to verify sign-in within office premises.',
            });
          }
        } else {
          const userLat = Number(latitude);
          const userLon = Number(longitude);
          if (isNaN(userLat) || isNaN(userLon)) {
            if (!companyWfhDay) {
              return res.status(400).json({ error: 'Invalid GPS coordinates provided.' });
            }
          } else {
            const distance = calculateDistanceMeters(userLat, userLon, officeLoc.latitude, officeLoc.longitude);
            if (distance > allowedRadius && !companyWfhDay) {
              return res.status(400).json({
                error: `Outside Office Perimeter: You are ${distance}m away (Allowed radius: ${allowedRadius}m). Please be within 500m of the office to sign in.`,
                distance,
                allowedRadius,
              });
            }
            locationData = { latitude: userLat, longitude: userLon, distanceMeters: distance };
          }
        }
      }
    } else if (latitude !== undefined && longitude !== undefined) {
      locationData = { latitude: Number(latitude), longitude: Number(longitude) };
    }

    let attendanceId;
    if (existing) {
      // Re-sign-in after an earlier check-out today: reopen the same day's attendance record
      attendanceId = existing._id;
      await attendances().updateOne(
        { _id: attendanceId },
        {
          $set: { status: 'WORKING', workMode },
          $unset: { checkOut: '' },
        }
      );
      await attendanceEvents().insertOne({
        attendanceId,
        employeeId,
        eventType: 'CHECK_IN',
        timestamp: checkInTimestamp,
        location: locationData,
      });
      await workSessions().insertOne({ attendanceId, employeeId, startTime: checkInTimestamp });
    } else {
      // Create attendance record
      const attendanceResult = await attendances().insertOne({
        employeeId,
        date: now,
        checkIn: checkInTimestamp,
        status: 'WORKING',
        workMode,
        location: locationData,
        isGeofenceVerified: (workMode === 'WFO' || workMode === 'SSC') ? geofenceEnabled : false,
        wfhApprovedFromRequest: !!approvedWfh,
        totalWorkingSeconds: 0,
        totalStoppedSeconds: 0,
        isCustomSignIn: isCustomSignInRequested,
      });
      attendanceId = attendanceResult.insertedId;
      // Create initial event and work session
      await attendanceEvents().insertOne({
        attendanceId,
        employeeId,
        eventType: 'CHECK_IN',
        timestamp: checkInTimestamp,
        location: locationData,
      });
      await workSessions().insertOne({ attendanceId, employeeId, startTime: checkInTimestamp });
    }
    // Update user status
    await users().updateOne({ employeeId }, { $set: { status: 'WORKING' } });
    const attendance = await getTodayAttendance(employeeId);
    res.json(attendance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Check-in failed' });
  }
});

router.post('/stop', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = req.user!.employeeId;
    const now = new Date();
    const attendance = await getTodayAttendance(employeeId);
    if (!attendance || attendance.status !== 'WORKING') {
      return res.status(400).json({ error: 'Cannot stop. Status must be WORKING.' });
    }
    const activeSession = attendance.workSessions.find((s: any) => !s.endTime);
    if (activeSession) {
      const duration = calculateDurationSeconds(activeSession.startTime, now);
      await workSessions().updateOne({ _id: activeSession._id }, { $set: { endTime: now, durationSeconds: duration } });
      await attendances().updateOne({ _id: attendance._id }, { $inc: { totalWorkingSeconds: duration }, $set: { status: 'STOPPED' } });
    }
    await attendanceEvents().insertOne({ attendanceId: attendance._id, employeeId, eventType: 'STOP', timestamp: now });
    await users().updateOne({ employeeId }, { $set: { status: 'STOPPED' } });
    const updated = await getTodayAttendance(employeeId);
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Stop failed' });
  }
});

router.post('/resume', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = req.user!.employeeId;
    const now = new Date();
    const attendance = await getTodayAttendance(employeeId);
    if (!attendance || attendance.status !== 'STOPPED') {
      return res.status(400).json({ error: 'Cannot resume. Status must be STOPPED.' });
    }
    const lastStopEvent = attendance.events
      .filter((e: any) => e.eventType === 'STOP')
      .sort((a: any, b: any) => b.timestamp - a.timestamp)[0];
    let additionalStoppedSeconds = 0;
    if (lastStopEvent) {
      additionalStoppedSeconds = calculateDurationSeconds(lastStopEvent.timestamp, now);
    }
    await workSessions().insertOne({ attendanceId: attendance._id, employeeId, startTime: now });
    await attendances().updateOne({ _id: attendance._id }, { $inc: { totalStoppedSeconds: additionalStoppedSeconds }, $set: { status: 'WORKING' } });
    await attendanceEvents().insertOne({ attendanceId: attendance._id, employeeId, eventType: 'RESUME', timestamp: now });
    await users().updateOne({ employeeId }, { $set: { status: 'WORKING' } });
    const updated = await getTodayAttendance(employeeId);
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Resume failed' });
  }
});

router.post('/check-out', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = req.user!.employeeId;
    const { customTime } = req.body;
    const now = new Date();
    const todayStr = getISTTodayString(now);
    const attendance = await getTodayAttendance(employeeId);
    if (!attendance) {
      return res.status(400).json({ error: 'No active attendance today' });
    }
    if (attendance.status === 'CHECKED_OUT') {
      return res.status(400).json({ error: 'Already checked out' });
    }
    if (attendance.status === 'STOPPED') {
      return res.status(400).json({ error: 'You are currently stopped. Please resume before checking out.' });
    }

    let checkOutTimestamp = now;
    if (customTime && typeof customTime === 'string') {
      checkOutTimestamp = combineDateAndTimeToISTDate(todayStr, customTime);
    }

    const activeSession = attendance.workSessions.find((s: any) => !s.endTime);
    let sessionDuration = 0;
    if (activeSession) {
      sessionDuration = calculateDurationSeconds(activeSession.startTime, checkOutTimestamp);
      if (sessionDuration < 0) sessionDuration = 0;
      await workSessions().updateOne({ _id: activeSession._id }, { $set: { endTime: checkOutTimestamp, durationSeconds: sessionDuration } });
    }
    // Auto-flag as Half Day Leave if this is the day's only sign-in session (no re-sign-in after an
    // earlier check-out) and the final check-out happens after 8:00 PM IST. Employees who genuinely
    // worked late can clear this via a regularization request to their reporting manager.
    const LATE_CHECKOUT_THRESHOLD_MINUTES = 20 * 60; // 8:00 PM
    const checkInEventCount = attendance.events.filter((e: any) => e.eventType === 'CHECK_IN').length;
    const isSingleSessionDay = checkInEventCount <= 1;
    const shouldFlagHalfDay = isSingleSessionDay && getISTMinutes(checkOutTimestamp) >= LATE_CHECKOUT_THRESHOLD_MINUTES;

    const checkoutUpdate: any = {
      status: 'CHECKED_OUT',
      checkOut: checkOutTimestamp,
    };
    if (shouldFlagHalfDay) {
      checkoutUpdate.isHalfDayFlagged = true;
      checkoutUpdate.halfDayFlagReason = 'LATE_CHECKOUT';
      checkoutUpdate.regularizationStatus = 'NONE';
    }

    await attendances().updateOne(
      { _id: attendance._id },
      { $set: checkoutUpdate, $inc: { totalWorkingSeconds: sessionDuration } }
    );
    await attendanceEvents().insertOne({ attendanceId: attendance._id, employeeId, eventType: 'CHECK_OUT', timestamp: checkOutTimestamp });
    await users().updateOne({ employeeId }, { $set: { status: 'CHECKED_OUT' } });
    const updated = await getTodayAttendance(employeeId);
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Check-out failed' });
  }
});

// --- Submit a regularization request for a half-day-flagged attendance record ---
router.post('/regularize/:attendanceId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = req.user!.employeeId;
    const { remark } = req.body;
    if (!remark || !String(remark).trim()) {
      return res.status(400).json({ error: 'A remark explaining the late sign-out is required' });
    }

    const attendanceId = new ObjectId(String(req.params.attendanceId));
    const attendance = await attendances().findOne({ _id: attendanceId, employeeId });
    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    if (!attendance.isHalfDayFlagged) {
      return res.status(400).json({ error: 'This attendance record is not flagged as half day' });
    }
    if (attendance.regularizationStatus === 'PENDING') {
      return res.status(400).json({ error: 'A regularization request is already pending for this day' });
    }
    if (attendance.regularizationStatus === 'APPROVED') {
      return res.status(400).json({ error: 'This day has already been regularized' });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const usedThisMonth = await attendances().countDocuments({
      employeeId,
      regularizationRequestedAt: { $gte: startOfMonth, $lte: endOfMonth },
    });
    if (usedThisMonth >= 3) {
      return res.status(400).json({ error: 'Regularization limit reached (maximum 3 times per month)' });
    }

    const employee = await users().findOne({ employeeId });
    let managerUserId: ObjectId | null = null;
    let managerInfo: any = null;
    if (employee?.reportingManagerId) {
      try {
        const mgr = await users().findOne({ _id: new ObjectId(String(employee.reportingManagerId)) });
        if (mgr) {
          managerUserId = mgr._id;
          managerInfo = { id: mgr._id, name: mgr.name, employeeId: mgr.employeeId, email: mgr.email };
        }
      } catch (err) {
        console.error('Error fetching reporting manager for regularization:', err);
      }
    }

    await attendances().updateOne(
      { _id: attendanceId },
      {
        $set: {
          regularizationStatus: 'PENDING',
          regularizationRemark: String(remark).trim(),
          regularizationRequestedAt: now,
          regularizationManagerUserId: managerUserId,
          regularizationManagerInfo: managerInfo,
        },
      }
    );

    const updated = await attendances().findOne({ _id: attendanceId });
    res.json({ message: 'Regularization request submitted successfully', attendance: updated });
  } catch (error) {
    console.error('Failed to submit regularization request:', error);
    res.status(500).json({ error: 'Failed to submit regularization request' });
  }
});

// --- Get regularization requests awaiting this manager's (or admin's) review ---
router.get('/regularize/team', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const filter: any = { regularizationStatus: { $in: ['PENDING', 'APPROVED', 'REJECTED'] } };
    if (role !== 'ADMIN') {
      filter.regularizationManagerUserId = new ObjectId(String(userId));
    }
    const records = await attendances()
      .find(filter)
      .sort({ regularizationRequestedAt: -1 })
      .toArray();

    const withEmployeeInfo = await Promise.all(
      records.map(async (rec) => {
        const emp = await users().findOne({ employeeId: rec.employeeId }, { projection: { name: 1, employeeId: 1, email: 1 } });
        return { ...rec, employeeName: emp?.name || rec.employeeId, employeeEmail: emp?.email };
      })
    );
    res.json(withEmployeeInfo);
  } catch (error) {
    console.error('Failed to fetch regularization requests:', error);
    res.status(500).json({ error: 'Failed to fetch regularization requests' });
  }
});

// --- Approve / Reject a regularization request (Reporting Manager or Admin) ---
router.put('/regularize/:attendanceId/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const { status, managerComment } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
    }

    const attendanceId = new ObjectId(String(req.params.attendanceId));
    const attendance = await attendances().findOne({ _id: attendanceId });
    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    if (attendance.regularizationStatus !== 'PENDING') {
      return res.status(400).json({ error: 'This request is not pending review' });
    }

    const isManager = attendance.regularizationManagerUserId && attendance.regularizationManagerUserId.toString() === userId;
    const isAdmin = role === 'ADMIN';
    if (!isManager && !isAdmin) {
      return res.status(403).json({ error: 'You are not authorized to review this request' });
    }

    const reviewer = await users().findOne({ _id: new ObjectId(userId) });
    const updateFields: any = {
      regularizationStatus: status,
      regularizationManagerComment: managerComment || '',
      regularizationReviewedAt: new Date(),
      regularizationReviewedBy: { id: reviewer?._id, name: reviewer?.name, employeeId: reviewer?.employeeId },
    };
    if (status === 'APPROVED') {
      updateFields.isHalfDayFlagged = false;
    }

    await attendances().updateOne({ _id: attendanceId }, { $set: updateFields });
    res.json({ message: `Regularization request ${status.toLowerCase()} successfully` });
  } catch (error) {
    console.error('Failed to update regularization status:', error);
    res.status(500).json({ error: 'Failed to update regularization status' });
  }
});

router.get('/custom-signin-quota', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = req.user!.employeeId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const count = await attendances().countDocuments({
      employeeId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
      isCustomSignIn: true,
    });

    res.json({
      usedCount: count,
      limit: 3,
      remainingCount: Math.max(0, 3 - count),
      canUseCustomSignIn: count < 3,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch custom sign-in quota' });
  }
});

router.get('/today', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const todayStr = getISTTodayString(new Date());
    const [attendance, companyWfhDay] = await Promise.all([
      getTodayAttendance(req.user!.employeeId),
      wfhDays().findOne({ date: todayStr }),
    ]);

    if (attendance) {
      res.json({
        ...attendance,
        isCompanyWfhDay: !!companyWfhDay,
        companyWfhDay: companyWfhDay || null,
      });
    } else {
      res.json(null);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch today attendance' });
  }
});

router.get('/today-status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const todayStr = getISTTodayString(new Date());
    const [attendance, companyWfhDay] = await Promise.all([
      getTodayAttendance(req.user!.employeeId),
      wfhDays().findOne({ date: todayStr }),
    ]);
    res.json({
      attendance: attendance || null,
      isCompanyWfhDay: !!companyWfhDay,
      companyWfhDay: companyWfhDay || null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch today status' });
  }
});

router.get('/wfh-days', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const list = await wfhDays().find({}).sort({ date: 1 }).toArray();
    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch company WFH days' });
  }
});

router.get('/monthly', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = req.user!.employeeId;
    const { month, year, startDate: rangeStart, endDate: rangeEnd } = req.query as any;
    let startDate: Date, endDate: Date;
    if (rangeStart && rangeEnd) {
      startDate = new Date(`${rangeStart}T00:00:00`);
      endDate = new Date(`${rangeEnd}T23:59:59`);
    } else if (month && year) {
      startDate = new Date(Number(year), Number(month) - 1, 1);
      endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }
    const records = await attendances()
      .find({ employeeId, date: { $gte: startDate, $lte: endDate } })
      .sort({ date: 1 })
      .toArray();

    // Attach events so frontend can extract lunch start/end
    const recordsWithEvents = await Promise.all(
      records.map(async (rec) => {
        const events = await attendanceEvents()
          .find({ attendanceId: rec._id })
          .sort({ timestamp: 1 })
          .toArray();
        return { ...rec, events };
      })
    );
    res.json(recordsWithEvents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch monthly attendance' });
  }
});

// --- Fetch Salary & Payroll details for logged-in employee ---
router.get('/salary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = req.user!.employeeId;
    const { month, year } = req.query as any;
    
    if (!month || !year) {
      return res.status(400).json({ error: 'Missing month and year' });
    }

    const m = Number(month);
    const y = Number(year);
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);
    const daysInMonth = new Date(y, m, 0).getDate();

    const emp = await users().findOne({ employeeId });
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const records = await attendances()
      .find({ employeeId, date: { $gte: startDate, $lte: endDate } })
      .toArray();

    let currentSettings = await settings().findOne({});
    if (!currentSettings) {
      currentSettings = { pfEmployeeRate: 0.12, pfEmployerRate: 0.12, esiEmployeeRate: 0.0075, esiEmployerRate: 0.0325, workWeekPattern: '6_DAYS' };
    }

    // Calculate month working days excluding weekly offs and company holidays
    const mm = String(m).padStart(2, '0');
    const startDateStr = `${y}-${mm}-01`;
    const endDateStr = `${y}-${mm}-${String(daysInMonth).padStart(2, '0')}`;

    const monthHolidays = await holidays().find({
      date: { $gte: startDateStr, $lte: endDateStr }
    }).toArray();
    const holidayDateSet = new Set(monthHolidays.map(h => h.date));

    let workingDaysCount = 0;
    let holidaysCount = 0;
    let weeklyOffsCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(y, m - 1, day);
      const dayOfWeek = d.getDay(); // 0 = Sun, 6 = Sat
      const dd = String(day).padStart(2, '0');
      const dateStr = `${y}-${mm}-${dd}`;

      let isWeeklyOff = false;
      const pattern = currentSettings.workWeekPattern || '6_DAYS';
      if (pattern === '5_DAYS') {
        isWeeklyOff = (dayOfWeek === 0 || dayOfWeek === 6);
      } else if (pattern === 'ALTERNATE_SATURDAYS') {
        const weekNum = Math.ceil(day / 7);
        isWeeklyOff = (dayOfWeek === 0 || (dayOfWeek === 6 && (weekNum === 2 || weekNum === 4)));
      } else {
        isWeeklyOff = (dayOfWeek === 0);
      }

      if (isWeeklyOff) {
        weeklyOffsCount++;
      } else if (holidayDateSet.has(dateStr)) {
        holidaysCount++;
      } else {
        workingDaysCount++;
      }
    }

    if (workingDaysCount === 0) workingDaysCount = daysInMonth;

    const eligibleDays = Math.min(workingDaysCount, records.length);
    const basicSalary = emp.basicSalary || 0;
    const grossSalary = emp.grossSalary || 0;
    const otherDeductions = emp.otherDeductions || 0;

    const earnedBasic = (basicSalary / workingDaysCount) * eligibleDays;
    const earnedGross = (grossSalary / workingDaysCount) * eligibleDays;

    const employeePF = emp.pfApplicable ? earnedBasic * currentSettings.pfEmployeeRate : 0;
    const employerPF = emp.pfApplicable ? earnedBasic * currentSettings.pfEmployerRate : 0;

    const employeeESI = emp.esiApplicable && grossSalary <= 21000 ? earnedGross * currentSettings.esiEmployeeRate : 0;
    const employerESI = emp.esiApplicable && grossSalary <= 21000 ? earnedGross * currentSettings.esiEmployerRate : 0;

    const netSalary = Math.max(0, earnedGross - employeePF - employeeESI - otherDeductions);

    res.json({
      employeeId: emp.employeeId,
      name: emp.name,
      basicSalary,
      grossSalary,
      daysInMonth,
      totalWorkingDays: workingDaysCount,
      holidaysInMonth: holidaysCount,
      weeklyOffsInMonth: weeklyOffsCount,
      eligibleDays,
      earnedBasic,
      earnedGross,
      employeePF,
      employerPF,
      employeeESI,
      employerESI,
      otherDeductions,
      netSalary
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to calculate salary' });
  }
});

// --- Public/Employee Holidays List ---
router.get('/holidays', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const holidayList = await holidays().find({}).sort({ date: 1 }).toArray();
    res.json(holidayList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

// --- Employee Leave Summary & Holidays Worked ---
router.get('/leave-summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = req.user!.employeeId;
    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

    const approvedLeaves = await permissions().find({
      employeeId,
      requestType: { $in: ['LEAVE', 'WEEK_OFF'] },
      status: 'APPROVED',
    }).sort({ date: -1 }).toArray();

    const currentMonthLeaves = approvedLeaves.filter(l => l.date && l.date.startsWith(`${currentYear}-${currentMonth}`));

    const approvedPermissionsThisMonth = await permissions().countDocuments({
      employeeId,
      requestType: 'PERMISSION',
      status: 'APPROVED',
      date: { $regex: `^${currentYear}-${currentMonth}` },
    });

    // Calculate Holidays Worked (attendance on holidays or Sundays)
    const allAttendance = await attendances().find({ employeeId }).toArray();
    const allHolidays = await holidays().find({}).toArray();
    const holidayDateMap = new Map(allHolidays.map(h => [h.date, h.name]));

    const holidaysWorkedList: any[] = [];
    let wfoCountMonth = 0;
    let wfhCountMonth = 0;
    for (const rec of allAttendance) {
      const recDate = new Date(rec.date);
      const yyyy = recDate.getFullYear();
      const mm = String(recDate.getMonth() + 1).padStart(2, '0');
      const dd = String(recDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const isSunday = recDate.getDay() === 0;

      if (holidayDateMap.has(dateStr) || isSunday) {
        holidaysWorkedList.push({
          date: dateStr,
          holidayName: holidayDateMap.get(dateStr) || (isSunday ? 'Sunday Weekend' : 'Declared Holiday'),
          checkIn: rec.checkIn,
          checkOut: rec.checkOut,
          status: rec.status,
          workingSeconds: rec.totalWorkingSeconds || 0,
        });
      }

      if (yyyy === currentYear && mm === currentMonth) {
        if (rec.workMode === 'WFH') wfhCountMonth++;
        else if (rec.workMode === 'WFO') wfoCountMonth++;
      }
    }

    res.json({
      totalLeaveDaysYear: approvedLeaves.length,
      totalLeaveDaysMonth: currentMonthLeaves.length,
      approvedPermissionsMonth: approvedPermissionsThisMonth,
      wfoCountMonth,
      wfhCountMonth,
      approvedLeaves,
      holidaysWorkedCount: holidaysWorkedList.length,
      holidaysWorkedList,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch leave summary' });
  }
});

export default router;

