import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { connectMongo, users, settings } from '../mongo';
import { calculateDistanceMeters } from '../utils/geo';

// Ensure Mongo connection is established when this module loads
connectMongo();

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, latitude, longitude } = req.body;
    const user = await users().findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Geofencing enforcement for WFO employees
    const workMode = user.workMode || 'WFO';
    if (user.role === 'EMPLOYEE' && workMode === 'WFO') {
      const currentSettings = await settings().findOne({});
      const officeLoc = currentSettings?.officeLocation;
      if (officeLoc && officeLoc.latitude && officeLoc.longitude && officeLoc.radiusMeters) {
        if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
          return res.status(403).json({
            error: 'Office Location Required: WFO employees must log in from the office. Please allow location access in your browser.',
            requiresLocation: true,
          });
        }
        const userLat = Number(latitude);
        const userLon = Number(longitude);
        if (isNaN(userLat) || isNaN(userLon)) {
          return res.status(403).json({
            error: 'Invalid GPS coordinates received. Please enable high accuracy location.',
          });
        }
        const distance = calculateDistanceMeters(userLat, userLon, officeLoc.latitude, officeLoc.longitude);
        if (distance > officeLoc.radiusMeters) {
          return res.status(403).json({
            error: `Office Geofence Restricted: You are ${distance}m away from the office (${officeLoc.address || 'Office'}). Allowed perimeter is ${officeLoc.radiusMeters}m. WFO employees can only log in at the office.`,
            distance,
            allowedRadius: officeLoc.radiusMeters,
          });
        }
      }
    }

    const token = jwt.sign(
      { id: user._id?.toString(), employeeId: user.employeeId, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    );
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        workMode,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Access denied' });
    }
    const user = await users().findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    let reportingManager = null;
    if (user.reportingManagerId) {
      try {
        const mgr = await users().findOne(
          { _id: new ObjectId(String(user.reportingManagerId)) },
          { projection: { name: 1, employeeId: 1, email: 1, role: 1 } }
        );
        if (mgr) {
          reportingManager = {
            id: mgr._id,
            name: mgr.name,
            employeeId: mgr.employeeId,
            email: mgr.email,
            role: mgr.role,
          };
        }
      } catch (err) {
        console.error('Error fetching reporting manager in /me:', err);
      }
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      status: user.status,
      workMode: user.workMode || 'WFO',
      reportingManager,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

export default router;