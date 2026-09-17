import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { getTodayRange, getISTMinutes } from '../utils/time';
import { attendances, users, attendanceEvents, workSessions, settings, permissions, holidays } from '../mongo';
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
        officeLocation: {
          latitude: 13.0827,
          longitude: 80.2707,
          radiusMeters: 100,
          address: 'Chennai, Tamil Nadu, India',
        },
      };
      await settings().insertOne(currentSettings);
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
      officeLocation
    } = req.body;

    const updateDoc: any = {
      pfEmployeeRate: Number(pfEmployeeRate),
      pfEmployerRate: Number(pfEmployerRate),
      esiEmployeeRate: Number(esiEmployeeRate),
      esiEmployerRate: Number(esiEmployerRate),
    };

    if (officeStartTime !== undefined) updateDoc.officeStartTime = officeStartTime;
    if (officeEndTime !== undefined) updateDoc.officeEndTime = officeEndTime;
    if (graceMinutes !== undefined) updateDoc.graceMinutes = Number(graceMinutes);
    if (officeLocation !== undefined) {
      updateDoc.officeLocation = {
        latitude: Number(officeLocation.latitude) || 0,
        longitude: Number(officeLocation.longitude) || 0,
        radiusMeters: Number(officeLocation.radiusMeters) || 100,
        address: officeLocation.address || '',
      };
    }

    const result = await settings().findOneAndUpdate(
      {},
      { $set: updateDoc },
      { returnDocument: 'after', upsert: true }
    );
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// --- Dashboard Summary Handler (Supports both /dashboard and /dashboard-summary) ---
const handleDashboardSummary = async (req: AuthRequest, res: Response) => {
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

    // Calculate Late employees accurately in IST
    const [startH, startM] = officeStartTime.split(':').map(Number);
    const thresholdMinutes = (isNaN(startH) ? 9 : startH) * 60 + (isNaN(startM) ? 0 : startM) + graceMinutes;

    const lateCount = todayRecords.filter((r) => {
      if (!r.checkIn) return false;
      const checkInDate = new Date(r.checkIn);
      const checkInMinutes = getISTMinutes(checkInDate);
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
};

router.get('/dashboard', handleDashboardSummary);
router.get('/dashboard-summary', handleDashboardSummary);


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

    let currentSettings = await settings().findOne({});
    const officeStartTime = currentSettings?.officeStartTime || '09:00';
    const graceMinutes = currentSettings?.graceMinutes ?? 15;
    const [startH, startM] = officeStartTime.split(':').map(Number);
    const thresholdMinutes = (isNaN(startH) ? 9 : startH) * 60 + (isNaN(startM) ? 0 : startM) + graceMinutes;

    const records = await attendances()
      .find({ date: { $gte: start, $lte: end } })
      .sort({ checkIn: 1 })
      .toArray();

    const recordsWithUser = await Promise.all(
      records.map(async rec => {
        const user = await users().findOne({ employeeId: rec.employeeId }, { projection: { name: 1, employeeId: 1, workMode: 1 } });
        const events = await attendanceEvents().find({ attendanceId: rec._id }).sort({ timestamp: 1 }).toArray();
        let isLate = false;
        if (rec.checkIn) {
          const checkInMinutes = getISTMinutes(new Date(rec.checkIn));
          isLate = checkInMinutes > thresholdMinutes;
        }
        return { ...rec, user, events, isLate };
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

// --- Fetch single employee entire profile details ---
router.get('/employees/:id/detail', async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    let query: any = { employeeId: id };
    if (ObjectId.isValid(id)) {
      query = { $or: [{ _id: new ObjectId(id) }, { employeeId: id }] };
    }
    const emp = await users().findOne(query);
    if (!emp) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    let manager: any = null;
    if (emp.reportingManagerId && ObjectId.isValid(emp.reportingManagerId)) {
      manager = await users().findOne({ _id: new ObjectId(emp.reportingManagerId) });
    }

    // Recent attendance count and leaves
    const recentRecords = await attendances()
      .find({ employeeId: emp.employeeId })
      .sort({ date: -1 })
      .limit(10)
      .toArray();

    const approvedLeaves = await permissions()
      .find({ employeeId: emp.employeeId, requestType: 'LEAVE', status: 'APPROVED' })
      .sort({ date: -1 })
      .toArray();

    res.json({
      employee: {
        ...emp,
        reportingManager: manager
          ? {
              id: manager._id,
              name: manager.name,
              employeeId: manager.employeeId,
              email: manager.email,
              role: manager.role,
            }
          : null,
      },
      recentAttendance: recentRecords,
      approvedLeaves,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch employee detail' });
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
      workMode = 'WFO',
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
    const validWorkMode = ['WFO', 'WFH', 'HYBRID'].includes(workMode) ? workMode : 'WFO';
    const result = await users().insertOne({
      name,
      email,
      passwordHash,
      role: 'EMPLOYEE',
      employeeId,
      status,
      workMode: validWorkMode,
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

// --- Admin updates an employee (Full details: name, email, employeeId, password, status, workMode, salary, manager) ---
router.put('/employees/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = new ObjectId(String(req.params.id));
    const {
      name,
      email,
      password,
      employeeId,
      status,
      workMode,
      reportingManagerId,
      basicSalary,
      grossSalary,
      pfApplicable,
      esiApplicable,
      otherDeductions,
    } = req.body as any;

    const existingUser = await users().findOne({ _id: id });
    if (!existingUser) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const updateFields: any = {};

    if (name !== undefined) updateFields.name = String(name).trim();

    if (email !== undefined && email !== existingUser.email) {
      const emailConflict = await users().findOne({ email: String(email).trim(), _id: { $ne: id } });
      if (emailConflict) {
        return res.status(409).json({ error: 'Another user already has this email address' });
      }
      updateFields.email = String(email).trim();
    }

    const oldEmployeeId = existingUser.employeeId;
    if (employeeId !== undefined && employeeId !== oldEmployeeId) {
      const trimmedEmpId = String(employeeId).trim();
      const empIdConflict = await users().findOne({ employeeId: trimmedEmpId, _id: { $ne: id } });
      if (empIdConflict) {
        return res.status(409).json({ error: 'Another user already has this Employee ID' });
      }
      updateFields.employeeId = trimmedEmpId;
    }

    // Update password if provided
    if (password && String(password).trim().length > 0) {
      updateFields.passwordHash = await bcrypt.hash(String(password).trim(), 10);
    }

    if (status !== undefined) {
      updateFields.status = status;
    }

    if (workMode !== undefined) {
      updateFields.workMode = ['WFO', 'WFH', 'HYBRID'].includes(workMode) ? workMode : 'WFO';
    }

    if (reportingManagerId !== undefined) {
      if (reportingManagerId && reportingManagerId.toString() === req.params.id) {
        return res.status(400).json({ error: 'An employee cannot be their own reporting manager' });
      }
      updateFields.reportingManagerId = reportingManagerId ? reportingManagerId.toString() : null;
    }

    if (basicSalary !== undefined) updateFields.basicSalary = Number(basicSalary) || 0;
    if (grossSalary !== undefined) updateFields.grossSalary = Number(grossSalary) || 0;
    if (pfApplicable !== undefined) updateFields.pfApplicable = Boolean(pfApplicable);
    if (esiApplicable !== undefined) updateFields.esiApplicable = Boolean(esiApplicable);
    if (otherDeductions !== undefined) updateFields.otherDeductions = Number(otherDeductions) || 0;

    await users().updateOne({ _id: id }, { $set: updateFields });

    // If employeeId changed, cascade update existing attendance and permission records
    if (updateFields.employeeId && updateFields.employeeId !== oldEmployeeId) {
      const newEmpId = updateFields.employeeId;
      await attendances().updateMany({ employeeId: oldEmployeeId }, { $set: { employeeId: newEmpId } });
      await attendanceEvents().updateMany({ employeeId: oldEmployeeId }, { $set: { employeeId: newEmpId } });
      await workSessions().updateMany({ employeeId: oldEmployeeId }, { $set: { employeeId: newEmpId } });
      await permissions().updateMany({ employeeId: oldEmployeeId }, { $set: { employeeId: newEmpId } });
      // Update permissions where this user was the assigned manager
      await permissions().updateMany(
        { 'managerInfo.employeeId': oldEmployeeId },
        { $set: { 'managerInfo.employeeId': newEmpId } }
      );
    }

    res.json({ message: 'Employee details updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

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

// --- Quick update employee work mode (WFO | WFH | HYBRID) ---
router.patch('/employees/:id/work-mode', async (req: AuthRequest, res: Response) => {
  try {
    const id = new ObjectId(String(req.params.id));
    const { workMode } = req.body;
    if (!['WFO', 'WFH', 'HYBRID'].includes(workMode)) {
      return res.status(400).json({ error: 'Invalid workMode. Must be WFO, WFH, or HYBRID.' });
    }
    const result = await users().updateOne({ _id: id }, { $set: { workMode } });
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ message: `Work mode updated to ${workMode}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update work mode' });
  }
});

// --- Company Holidays CRUD ---
router.get('/holidays', async (req: AuthRequest, res: Response) => {
  try {
    const holidayList = await holidays().find({}).sort({ date: 1 }).toArray();
    res.json(holidayList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

router.post('/holidays', async (req: AuthRequest, res: Response) => {
  try {
    const { name, date, type, description } = req.body;
    if (!name || !date) {
      return res.status(400).json({ error: 'Holiday name and date are required' });
    }
    const newHoliday = {
      name: String(name).trim(),
      date: String(date).trim(), // YYYY-MM-DD
      type: type || 'COMPANY', // 'NATIONAL' | 'FESTIVAL' | 'COMPANY' | 'OPTIONAL'
      description: description ? String(description).trim() : '',
      createdAt: new Date(),
    };
    const result = await holidays().insertOne(newHoliday);
    res.status(201).json({ ...newHoliday, _id: result.insertedId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add holiday' });
  }
});

router.post('/holidays/bulk', async (req: AuthRequest, res: Response) => {
  try {
    const { rule, year, items, name: customName, type: customType } = req.body;
    const targetYear = parseInt(year) || new Date().getFullYear();
    const existingHolidays = await holidays().find({}).toArray();
    const existingDates = new Set(existingHolidays.map((h) => h.date));
    
    let toInsert: any[] = [];

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        if (item.date && !existingDates.has(item.date)) {
          toInsert.push({
            name: String(item.name || 'Holiday').trim(),
            date: String(item.date).trim(),
            type: item.type || 'COMPANY',
            description: item.description || '',
            createdAt: new Date(),
          });
          existingDates.add(item.date);
        }
      }
    } else if (rule === 'SUNDAYS') {
      const startDate = new Date(targetYear, 0, 1);
      const endDate = new Date(targetYear, 11, 31);
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 0) { // Sunday
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const dateStr = `${yyyy}-${mm}-${dd}`;
          if (!existingDates.has(dateStr)) {
            toInsert.push({
              name: customName ? String(customName).trim() : 'Sunday Weekly Off',
              date: dateStr,
              type: customType || 'COMPANY',
              description: `Recurring Sunday off for ${targetYear}`,
              createdAt: new Date(),
            });
            existingDates.add(dateStr);
          }
        }
      }
    } else if (rule === 'SATURDAYS_2_4') {
      const startDate = new Date(targetYear, 0, 1);
      const endDate = new Date(targetYear, 11, 31);
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 6) { // Saturday
          const dayOfMonth = d.getDate();
          const weekNum = Math.ceil(dayOfMonth / 7);
          if (weekNum === 2 || weekNum === 4) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;
            if (!existingDates.has(dateStr)) {
              toInsert.push({
                name: customName ? String(customName).trim() : `${weekNum === 2 ? '2nd' : '4th'} Saturday Off`,
                date: dateStr,
                type: customType || 'COMPANY',
                description: `2nd/4th Saturday holiday for ${targetYear}`,
                createdAt: new Date(),
              });
              existingDates.add(dateStr);
            }
          }
        }
      }
    }

    if (toInsert.length > 0) {
      await holidays().insertMany(toInsert);
    }

    const updatedList = await holidays().find({}).sort({ date: 1 }).toArray();
    res.json({ message: `Successfully added ${toInsert.length} holidays`, addedCount: toInsert.length, holidays: updatedList });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to bulk create holidays' });
  }
});

router.delete('/holidays/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = new ObjectId(String(req.params.id));
    const result = await holidays().deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Holiday not found' });
    }
    res.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete holiday' });
  }
});

export default router;

