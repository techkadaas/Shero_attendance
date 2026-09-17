import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { permissions, users, attendances, attendanceEvents, workSessions } from '../mongo';
import { getTodayRange, getISTTodayString, combineDateAndTimeToISTDate } from '../utils/time';

const router = Router();
router.use(authenticateToken);

// Helper function to calculate duration between HH:mm start and end times
export const calculateDuration = (startTime: string, endTime: string) => {
  if (!startTime || !endTime) return { decimalHours: 0, formatted: '0 hrs', diffMins: 0 };

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const startTotalMins = startH * 60 + startM;
  const endTotalMins = endH * 60 + endM;

  let diffMins = endTotalMins - startTotalMins;
  if (diffMins < 0) {
    diffMins += 24 * 60; // Spans past midnight
  }

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  const decimalHours = Number((diffMins / 60).toFixed(2));

  const parts = [];
  if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
  if (mins > 0) parts.push(`${mins} min${mins > 1 ? 's' : ''}`);
  const formatted = parts.length > 0 ? parts.join(' ') : '0 mins';

  return { decimalHours, formatted, diffMins };
};

// --- 1. Request a new permission or WFH (Employee) ---
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { date, startTime, endTime, reason, requestType } = req.body;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({ error: 'Date, start time, and end time are required' });
    }

    const { decimalHours, formatted, diffMins } = calculateDuration(startTime, endTime);
    if (diffMins <= 0) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const employee = await users().findOne({ _id: new ObjectId(userId) });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    let managerInfo: any = null;
    let managerUserId: ObjectId | null = null;

    if (employee.reportingManagerId) {
      try {
        const mgr = await users().findOne({ _id: new ObjectId(String(employee.reportingManagerId)) });
        if (mgr) {
          managerUserId = mgr._id;
          managerInfo = {
            id: mgr._id,
            name: mgr.name,
            employeeId: mgr.employeeId,
            email: mgr.email,
            role: mgr.role,
          };
        }
      } catch (err) {
        console.error('Error fetching reporting manager:', err);
      }
    }

    const type = requestType === 'WFH' ? 'WFH' : (requestType === 'LEAVE' ? 'LEAVE' : (requestType === 'WEEK_OFF' ? 'WEEK_OFF' : 'PERMISSION'));

    const newPermission = {
      employeeUserId: employee._id,
      employeeId: employee.employeeId,
      employeeName: employee.name,
      employeeEmail: employee.email,
      managerUserId,
      managerInfo,
      requestType: type, // 'PERMISSION' | 'WFH' | 'LEAVE' | 'WEEK_OFF'
      date, // YYYY-MM-DD
      startTime, // e.g. "09:00"
      endTime, // e.g. "18:00"
      totalHours: decimalHours,
      totalHoursFormatted: formatted,
      reason: reason || '',
      status: 'PENDING', // 'PENDING' | 'APPROVED' | 'REJECTED'
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await permissions().insertOne(newPermission);

    res.status(201).json({
      message: `${type === 'WFH' ? 'Work from Home' : 'Permission'} request submitted successfully`,
      permissionId: result.insertedId,
      permission: { ...newPermission, _id: result.insertedId },
    });
  } catch (error) {
    console.error('Failed to submit permission request:', error);
    res.status(500).json({ error: 'Failed to submit permission request' });
  }
});

// --- 2. Get my submitted permission requests (Employee) ---
router.get('/my', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const requests = await permissions()
      .find({
        $or: [
          { employeeUserId: new ObjectId(userId) },
          { employeeId: req.user?.employeeId },
        ],
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(requests);
  } catch (error) {
    console.error('Failed to fetch my permission requests:', error);
    res.status(500).json({ error: 'Failed to fetch permission requests' });
  }
});

// --- 3. Get team permission requests received as reporting manager (or all for Admin) ---
router.get('/team', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let filter: any = {};
    if (role === 'ADMIN') {
      filter = {};
    } else {
      filter = {
        managerUserId: new ObjectId(userId),
      };
    }

    const requests = await permissions()
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    res.json(requests);
  } catch (error) {
    console.error('Failed to fetch team permission requests:', error);
    res.status(500).json({ error: 'Failed to fetch team permission requests' });
  }
});

// --- 4. Approve / Reject permission or WFH request (Reporting Manager or Admin) ---
router.put('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const { id } = req.params;
    const { status, managerComment } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
    }

    const permId = new ObjectId(String(id));
    const permission = await permissions().findOne({ _id: permId });
    if (!permission) {
      return res.status(404).json({ error: 'Permission request not found' });
    }

    // Check authorization: must be either Admin or the assigned reporting manager
    const isManager = permission.managerUserId && permission.managerUserId.toString() === userId;
    const isAdmin = role === 'ADMIN';

    if (!isManager && !isAdmin) {
      return res.status(403).json({ error: 'You are not authorized to review this request' });
    }

    const reviewer = await users().findOne({ _id: new ObjectId(userId) });

    await permissions().updateOne(
      { _id: permId },
      {
        $set: {
          status,
          managerComment: managerComment || '',
          reviewedAt: new Date(),
          reviewedBy: {
            id: reviewer?._id,
            name: reviewer?.name,
            employeeId: reviewer?.employeeId,
          },
          updatedAt: new Date(),
        },
      }
    );

    // If WFH request is APPROVED and it applies to today, initialize attendance starting from requested time
    if (status === 'APPROVED' && permission.requestType === 'WFH') {
      try {
        const todayStr = getISTTodayString();
        if (permission.date === todayStr) {
          const requestedStartTime = combineDateAndTimeToISTDate(permission.date, permission.startTime || '09:00');
          const { start, end } = getTodayRange();
          
          let existingAttendance = await attendances().findOne({
            employeeId: permission.employeeId,
            date: { $gte: start, $lte: end },
          });

          if (!existingAttendance) {
            // Auto-create attendance record with checkIn starting from requested start time
            const insertRes = await attendances().insertOne({
              employeeId: permission.employeeId,
              date: new Date(),
              checkIn: requestedStartTime,
              status: 'WORKING',
              workMode: 'WFH',
              isGeofenceVerified: true,
              totalWorkingSeconds: 0,
              totalStoppedSeconds: 0,
              wfhApprovedFromRequest: true,
            });

            await attendanceEvents().insertOne({
              attendanceId: insertRes.insertedId,
              employeeId: permission.employeeId,
              eventType: 'CHECK_IN',
              timestamp: requestedStartTime,
            });

            await workSessions().insertOne({
              attendanceId: insertRes.insertedId,
              employeeId: permission.employeeId,
              startTime: requestedStartTime,
            });

            await users().updateOne(
              { employeeId: permission.employeeId },
              { $set: { status: 'WORKING' } }
            );
          } else {
            // Update existing attendance to WFH and adjust checkIn if needed
            await attendances().updateOne(
              { _id: existingAttendance._id },
              { 
                $set: { 
                  workMode: 'WFH',
                  status: 'WORKING',
                  checkIn: existingAttendance.checkIn || requestedStartTime,
                  wfhApprovedFromRequest: true,
                } 
              }
            );
            await users().updateOne(
              { employeeId: permission.employeeId },
              { $set: { status: 'WORKING' } }
            );
          }
        }
      } catch (wfhErr) {
        console.error('Error applying approved WFH attendance:', wfhErr);
      }
    }

    res.json({ message: `${permission.requestType === 'WFH' ? 'WFH' : 'Permission'} request ${status.toLowerCase()} successfully` });
  } catch (error) {
    console.error('Failed to update request status:', error);
    res.status(500).json({ error: 'Failed to update request status' });
  }
});

export default router;

