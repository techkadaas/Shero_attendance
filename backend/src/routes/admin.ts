import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { getTodayRange } from '../utils/time';
import { attendances, users, attendanceEvents, workSessions, settings, permissions } from '../mongo';
import bcrypt from 'bcryptjs';

const router = Router();
router.use(authenticateToken, requireAdmin);

// --- Settings ---
router.get('/settings', async (req: AuthRequest, res: Response) => {
  try {
    let currentSettings = await settings().findOne({});
    if (!currentSettings) {
      currentSettings = {
        pfEmployeeRate: 0.12,
        pfEmployerRate: 0.12,
        esiEmployeeRate: 0.0075,
        esiEmployerRate: 0.0325,
        officeStartTime: '09:00',
        officeEndTime: '18:00',
        graceMinutes: 15,
      };
      await settings().insertOne(currentSettings);
    } else {
      if (!currentSettings.officeStartTime) currentSettings.officeStartTime = '09:00';
      if (!currentSettings.officeEndTime) currentSettings.officeEndTime = '18:00';
      if (currentSettings.graceMinutes === undefined) currentSettings.graceMinutes = 15;
    }
    res.json(currentSettings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const {
      pfEmployeeRate,
      pfEmployerRate,
      esiEmployeeRate,
      esiEmployerRate,
      officeStartTime,
      officeEndTime,
      graceMinutes,
    } = req.body;

    const updateFields: any = {};
    if (pfEmployeeRate !== undefined) updateFields.pfEmployeeRate = Number(pfEmployeeRate);
    if (pfEmployerRate !== undefined) updateFields.pfEmployerRate = Number(pfEmployerRate);
    if (esiEmployeeRate !== undefined) updateFields.esiEmployeeRate = Number(esiEmployeeRate);
    if (esiEmployerRate !== undefined) updateFields.esiEmployerRate = Number(esiEmployerRate);
    if (officeStartTime !== undefined) updateFields.officeStartTime = String(officeStartTime);
    if (officeEndTime !== undefined) updateFields.officeEndTime = String(officeEndTime);
    if (graceMinutes !== undefined) updateFields.graceMinutes = Number(graceMinutes);

    await settings().updateOne(
      {},
      { $set: updateFields },
      { upsert: true }
    );
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// --- Dashboard summary ---
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const { date } = req.query as any;
    let start: Date, end: Date;
    let targetDateStr: string;

    if (date) {
      targetDateStr = String(date);
      const targetDate = new Date(date);
      start = new Date(targetDate.setHours(0, 0, 0, 0));
      end = new Date(targetDate.setHours(23, 59, 59, 999));
    } else {
      const range = getTodayRange();
      start = range.start;
      end = range.end;
      targetDateStr = new Date().toISOString().split('T')[0];
    }

    const todayRecords = await attendances()
      .find({ date: { $gte: start, $lte: end } })
      .toArray();

    // Query permissions for this date
    const permissionsForDate = await permissions()
      .find({
        date: targetDateStr,
        status: { $ne: 'REJECTED' }
      })
      .toArray();

    // Fetch office timings
    let currentSettings = await settings().findOne({});
    const officeStartTime = currentSettings?.officeStartTime || '09:00';
    const officeEndTime = currentSettings?.officeEndTime || '18:00';
    const graceMinutes = currentSettings?.graceMinutes ?? 15;

    // Calculate Late employees
    const [startH, startM] = officeStartTime.split(':').map(Number);
    const thresholdMinutes = (isNaN(startH) ? 9 : startH) * 60 + (isNaN(startM) ? 0 : startM) + graceMinutes;

    const lateCount = todayRecords.filter((r) => {
      if (!r.checkIn) return false;
      const checkInDate = new Date(r.checkIn);
      const checkInMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();
      return checkInMinutes > thresholdMinutes;
    }).length;

    const summary = {
      present: todayRecords.length,
      lateToday: lateCount,
      workingNow: todayRecords.filter(r => r.status === 'WORKING').length,
      permissionCount: permissionsForDate.length,
      stoppedNow: todayRecords.filter(r => r.status === 'STOPPED').length,
      checkedOut: todayRecords.filter(r => r.status === 'CHECKED_OUT').length,
      absent: 0,
      officeTiming: {
        officeStartTime,
        officeEndTime,
        graceMinutes,
      },
    };
    const totalEmployees = await users().countDocuments({ role: 'EMPLOYEE' });
    summary.absent = Math.max(0, totalEmployees - summary.present);
    res.json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

// --- All attendance (for a given date) ---
router.get('/attendance', async (req: AuthRequest, res: Response) => {
  try {
    const { date } = req.query as any;
    let start: Date, end: Date;
    if (date) {
      const targetDate = new Date(date);
      start = new Date(targetDate.setHours(0, 0, 0, 0));
      end = new Date(targetDate.setHours(23, 59, 59, 999));
    } else {
      const range = getTodayRange();
      start = range.start;
      end = range.end;
    }
    const records = await attendances()
      .find({ date: { $gte: start, $lte: end } })
      .sort({ checkIn: 1 })
      .toArray();

    const recordsWithUser = await Promise.all(
      records.map(async rec => {
        const user = await users().findOne({ employeeId: rec.employeeId }, { projection: { name: 1, employeeId: 1 } });
        const events = await attendanceEvents().find({ attendanceId: rec._id }).sort({ timestamp: 1 }).toArray();
        return { ...rec, user, events };
      })
    );
    res.json(recordsWithUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch attendance list' });
  }
});

// --- Single attendance record detail ---
router.get('/attendance/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = new ObjectId(String(req.params.id));
    const record = await attendances().findOne({ _id: id });
    if (!record) return res.status(404).json({ error: 'Record not found' });
    const user = await users().findOne({ employeeId: record.employeeId }, { projection: { name: 1, employeeId: 1 } });
    const events = await attendanceEvents().find({ attendanceId: record._id }).sort({ timestamp: 1 }).toArray();
    const sessions = await workSessions().find({ attendanceId: record._id }).sort({ startTime: 1 }).toArray();
    res.json({ ...record, user, events, workSessions: sessions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch attendance details' });
  }
});

// --- Fetch all managers/users available to be assigned as manager ---
router.get('/managers', async (req: AuthRequest, res: Response) => {
  try {
    const managers = await users()
      .find({ status: { $ne: 'INACTIVE' } }, { projection: { name: 1, employeeId: 1, role: 1, email: 1 } })
      .sort({ role: 1, name: 1 })
      .toArray();
    res.json(managers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch managers' });
  }
});

// --- Fetch all employees with reporting manager populated ---
router.get('/employees', async (req: AuthRequest, res: Response) => {
  try {
    const employees = await users()
      .find({ role: 'EMPLOYEE' }, { projection: { passwordHash: 0 } })
      .sort({ name: 1 })
      .toArray();

    const allUsers = await users()
      .find({}, { projection: { name: 1, employeeId: 1, role: 1, email: 1 } })
      .toArray();
    const userMap = new Map(allUsers.map((u) => [u._id.toString(), u]));

    const populatedEmployees = employees.map((emp) => {
      const manager = emp.reportingManagerId ? userMap.get(emp.reportingManagerId.toString()) : null;
      return {
        ...emp,
        reportingManager: manager
          ? {
              id: manager._id,
              name: manager.name,
              employeeId: manager.employeeId,
              role: manager.role,
              email: manager.email,
            }
          : null,
      };
    });

    res.json(populatedEmployees);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// --- Fetch a specific employee's attendance history ---
router.get('/employees/:employeeId/attendance', async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId } = req.params;
    const records = await attendances()
      .find({ employeeId })
      .sort({ date: -1 })
      .toArray();

    const recordsWithEvents = await Promise.all(
      records.map(async rec => {
        const events = await attendanceEvents().find({ attendanceId: rec._id }).sort({ timestamp: 1 }).toArray();
        return { ...rec, events };
      })
    );
    res.json(recordsWithEvents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch employee attendance history' });
  }
});

// --- Admin creates a new employee ---
router.post('/employees', async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      email,
      password,
      employeeId,
      status = 'ACTIVE',
      basicSalary,
      grossSalary,
      pfApplicable,
      esiApplicable,
      otherDeductions,
      reportingManagerId,
    } = req.body as any;

    if (!name || !email || !password || !employeeId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const existingEmail = await users().findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    const existingEmpId = await users().findOne({ employeeId });
    if (existingEmpId) {
      return res.status(409).json({ error: 'User with this Employee ID already exists' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await users().insertOne({
      name,
      email,
      passwordHash,
      role: 'EMPLOYEE',
      employeeId,
      status,
      reportingManagerId: reportingManagerId ? reportingManagerId.toString() : null,
      basicSalary: basicSalary ? Number(basicSalary) : 0,
      grossSalary: grossSalary ? Number(grossSalary) : 0,
      pfApplicable: Boolean(pfApplicable),
      esiApplicable: Boolean(esiApplicable),
      otherDeductions: otherDeductions ? Number(otherDeductions) : 0,
    });
    res.status(201).json({ insertedId: result.insertedId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// --- Admin assigns/updates reporting manager for an employee ---
router.put('/employees/:id/manager', async (req: AuthRequest, res: Response) => {
  try {
    const id = new ObjectId(String(req.params.id));
    const { reportingManagerId } = req.body;

    if (reportingManagerId && reportingManagerId.toString() === req.params.id) {
      return res.status(400).json({ error: 'An employee cannot be their own reporting manager' });
    }

    if (reportingManagerId) {
      const managerExists = await users().findOne({ _id: new ObjectId(String(reportingManagerId)) });
      if (!managerExists) {
        return res.status(404).json({ error: 'Selected reporting manager not found' });
      }
    }

    const result = await users().updateOne(
      { _id: id },
      {
        $set: {
          reportingManagerId: reportingManagerId ? reportingManagerId.toString() : null,
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({ message: 'Reporting manager updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update reporting manager' });
  }
});

// --- Admin sets salary for an existing employee ---
router.put('/employees/:id/salary', async (req: AuthRequest, res: Response) => {
  try {
    const id = new ObjectId(String(req.params.id));
    const { basicSalary, grossSalary, pfApplicable, esiApplicable, otherDeductions } = req.body;
    
    if (basicSalary === undefined || grossSalary === undefined) {
      return res.status(400).json({ error: 'Missing basicSalary or grossSalary' });
    }

    const result = await users().updateOne(
      { _id: id },
      { 
        $set: { 
          basicSalary: Number(basicSalary),
          grossSalary: Number(grossSalary),
          pfApplicable: Boolean(pfApplicable),
          esiApplicable: Boolean(esiApplicable),
          otherDeductions: Number(otherDeductions) || 0
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({ message: 'Salary updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update salary' });
  }
});

// --- Admin Payroll Calculation ---
router.get('/payroll', async (req: AuthRequest, res: Response) => {
  try {
    const { month, year } = req.query as any;
    if (!month || !year) return res.status(400).json({ error: 'Missing month and year' });

    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
    
    // Get total days in the month
    const daysInMonth = new Date(Number(year), Number(month), 0).getDate();

    const employees = await users()
      .find({ role: 'EMPLOYEE' })
      .toArray();

    const records = await attendances()
      .find({ date: { $gte: startDate, $lte: endDate } })
      .toArray();

    // Fetch global statutory settings
    let currentSettings = await settings().findOne({});
    if (!currentSettings) {
      currentSettings = { pfEmployeeRate: 0.12, pfEmployerRate: 0.12, esiEmployeeRate: 0.0075, esiEmployerRate: 0.0325 };
    }

    const payroll = employees.map(emp => {
      const empRecords = records.filter(r => r.employeeId === emp.employeeId);
      const eligibleDays = empRecords.length;
      
      const basicSalary = emp.basicSalary || 0;
      const grossSalary = emp.grossSalary || 0;
      const otherDeductions = emp.otherDeductions || 0;

      // Formulas
      const earnedBasic = (basicSalary / daysInMonth) * eligibleDays;
      const earnedGross = (grossSalary / daysInMonth) * eligibleDays;

      const employeePF = emp.pfApplicable ? earnedBasic * currentSettings.pfEmployeeRate : 0;
      const employerPF = emp.pfApplicable ? earnedBasic * currentSettings.pfEmployerRate : 0;

      const employeeESI = emp.esiApplicable ? earnedGross * currentSettings.esiEmployeeRate : 0;
      const employerESI = emp.esiApplicable ? earnedGross * currentSettings.esiEmployerRate : 0;

      const netSalary = earnedGross - employeePF - employeeESI - otherDeductions;

      return {
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
      };
    });

    res.json(payroll);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to calculate payroll' });
  }
});

export default router;
