import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getTodayRange, calculateDurationSeconds, getISTTodayString, combineDateAndTimeToISTDate } from '../utils/time';
import { attendances, attendanceEvents, workSessions, users, settings, permissions, holidays } from '../mongo';
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

    // Check if user has an approved WFH request for today
    const todayStr = getISTTodayString(now);
    const approvedWfh = await permissions().findOne({
      employeeId,
      requestType: 'WFH',
      date: todayStr,
      status: 'APPROVED',
    });

    const user = await users().findOne({ employeeId });
    const workMode = approvedWfh ? 'WFH' : (user?.workMode || 'WFO');
    let locationData: any = null;

    let checkInTimestamp = now;
    if (approvedWfh && approvedWfh.startTime) {
      checkInTimestamp = combineDateAndTimeToISTDate(todayStr, approvedWfh.startTime);
    } else if (customTime && typeof customTime === 'string') {
      checkInTimestamp = combineDateAndTimeToISTDate(todayStr, customTime);
    }

    if (workMode === 'WFO') {
      const currentSettings = await settings().findOne({});
      const officeLoc = currentSettings?.officeLocation;
      if (officeLoc && officeLoc.latitude && officeLoc.longitude && officeLoc.radiusMeters) {
        if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
          return res.status(400).json({
            error: 'Office Location Required: WFO employees must sign in within office premises. Please enable GPS location.',
          });
        }
        const userLat = Number(latitude);
        const userLon = Number(longitude);
        if (isNaN(userLat) || isNaN(userLon)) {
          return res.status(400).json({ error: 'Invalid GPS coordinates provided.' });
        }
        const distance = calculateDistanceMeters(userLat, userLon, officeLoc.latitude, officeLoc.longitude);
        if (distance > officeLoc.radiusMeters) {
          return res.status(400).json({
            error: `Outside Office Perimeter: You are ${distance}m away (Allowed radius: ${officeLoc.radiusMeters}m). WFO employees must be in the office to sign in.`,
            distance,
            allowedRadius: officeLoc.radiusMeters,
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
      isGeofenceVerified: workMode === 'WFO' ? true : false,
      wfhApprovedFromRequest: !!approvedWfh,
      totalWorkingSeconds: 0,
      totalStoppedSeconds: 0,
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

router.get('/today', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const attendance = await getTodayAttendance(req.user!.employeeId);
    res.json(attendance || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch today attendance' });
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

    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
    const daysInMonth = new Date(Number(year), Number(month), 0).getDate();

    const emp = await users().findOne({ employeeId });
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const records = await attendances()
      .find({ employeeId, date: { $gte: startDate, $lte: endDate } })
      .toArray();

    let currentSettings = await settings().findOne({});
    if (!currentSettings) {
      currentSettings = { pfEmployeeRate: 0.12, pfEmployerRate: 0.12, esiEmployeeRate: 0.0075, esiEmployerRate: 0.0325 };
    }

    const eligibleDays = records.length;
    const basicSalary = emp.basicSalary || 0;
    const grossSalary = emp.grossSalary || 0;
    const otherDeductions = emp.otherDeductions || 0;

    const earnedBasic = (basicSalary / daysInMonth) * eligibleDays;
    const earnedGross = (grossSalary / daysInMonth) * eligibleDays;

    const employeePF = emp.pfApplicable ? earnedBasic * currentSettings.pfEmployeeRate : 0;
    const employerPF = emp.pfApplicable ? earnedBasic * currentSettings.pfEmployerRate : 0;

    const employeeESI = emp.esiApplicable ? earnedGross * currentSettings.esiEmployeeRate : 0;
    const employerESI = emp.esiApplicable ? earnedGross * currentSettings.esiEmployerRate : 0;

    const netSalary = earnedGross - employeePF - employeeESI - otherDeductions;

    res.json({
      employeeId: emp.employeeId,
      name: emp.name,
      basicSalary,
      grossSalary,
      daysInMonth,
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

export default router;

