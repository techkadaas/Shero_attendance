import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getTodayRange, calculateDurationSeconds, getISTTodayString, combineDateAndTimeToISTDate } from '../utils/time';
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
    const { latitude, longitude, customTime } = req.body;
    const now = new Date();
    const existing = await getTodayAttendance(employeeId);
    if (existing) {
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
    const workMode = isWfhToday ? 'WFH' : (user?.workMode || 'WFO');
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

    if (workMode === 'WFO' || workMode === 'SSC') {
      const currentSettings = await settings().findOne({});
      const officeLoc = currentSettings?.officeLocation;
      const allowedRadius = (officeLoc && officeLoc.radiusMeters) ? Number(officeLoc.radiusMeters) : 500;
      if (officeLoc && officeLoc.latitude && officeLoc.longitude) {
        if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
          return res.status(400).json({
            error: 'Office Location Required: Please enable GPS location to verify sign-in within office premises.',
          });
        }
        const userLat = Number(latitude);
        const userLon = Number(longitude);
        if (isNaN(userLat) || isNaN(userLon)) {
          return res.status(400).json({ error: 'Invalid GPS coordinates provided.' });
        }
        const distance = calculateDistanceMeters(userLat, userLon, officeLoc.latitude, officeLoc.longitude);
        if (distance > allowedRadius) {
          return res.status(400).json({
            error: `Outside Office Perimeter: You are ${distance}m away (Allowed radius: ${allowedRadius}m). Please be within 500m of the office to sign in.`,
            distance,
            allowedRadius,
          });
        }
        locationData = { latitude: userLat, longitude: userLon, distanceMeters: distance };
      }
    } else if (latitude !== undefined && longitude !== undefined) {
      locationData = { latitude: Number(latitude), longitude: Number(longitude) };
    }

    // Create attendance record
    const attendanceResult = await attendances().insertOne({
      employeeId,
      date: now,
      checkIn: checkInTimestamp,
      status: 'WORKING',
      workMode,
      location: locationData,
      isGeofenceVerified: (workMode === 'WFO' || workMode === 'SSC') ? true : false,
      wfhApprovedFromRequest: !!approvedWfh,
      totalWorkingSeconds: 0,
      totalStoppedSeconds: 0,
      isCustomSignIn: isCustomSignInRequested,
    });
    const attendanceId = attendanceResult.insertedId;
    // Create initial event and work session
    await attendanceEvents().insertOne({ 
      attendanceId, 
      employeeId, 
      eventType: 'CHECK_IN', 
      timestamp: checkInTimestamp,
      location: locationData,
    });
    await workSessions().insertOne({ attendanceId, employeeId, startTime: checkInTimestamp });
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
    await attendances().updateOne(
      { _id: attendance._id },
      { $set: { status: 'CHECKED_OUT', checkOut: checkOutTimestamp }, $inc: { totalWorkingSeconds: sessionDuration } }
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
    const { month, year } = req.query as any;
    let startDate: Date, endDate: Date;
    if (month && year) {
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

    // Calculate Holidays Worked (attendance on holidays or Sundays)
    const allAttendance = await attendances().find({ employeeId }).toArray();
    const allHolidays = await holidays().find({}).toArray();
    const holidayDateMap = new Map(allHolidays.map(h => [h.date, h.name]));

    const holidaysWorkedList: any[] = [];
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
    }

    res.json({
      totalLeaveDaysYear: approvedLeaves.length,
      totalLeaveDaysMonth: currentMonthLeaves.length,
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

