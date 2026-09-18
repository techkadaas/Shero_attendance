import api from './api';

export const getTodayAttendance = async () => {
  const response = await api.get('/attendance/today');
  return response.data;
};

export const getCustomSignInQuota = async () => {
  const response = await api.get('/attendance/custom-signin-quota');
  return response.data;
};

export const checkIn = async (location?: { latitude?: number; longitude?: number }, customTime?: string) => {
  const payload: any = {};
  if (location && location.latitude !== undefined && location.longitude !== undefined) {
    payload.latitude = location.latitude;
    payload.longitude = location.longitude;
  }
  if (customTime) {
    payload.customTime = customTime;
  }
  const response = await api.post('/attendance/check-in', payload);
  return response.data;
};


export const stopSession = async () => {
  const response = await api.post('/attendance/stop');
  return response.data;
};

export const resumeSession = async () => {
  const response = await api.post('/attendance/resume');
  return response.data;
};

export const checkOut = async (customTime?: string) => {
  const payload: any = {};
  if (customTime) {
    payload.customTime = customTime;
  }
  const response = await api.post('/attendance/check-out', payload);
  return response.data;
};

export const getMonthlyAttendance = async (month: number, year: number) => {
  const response = await api.get('/attendance/monthly', { params: { month, year } });
  return response.data;
};
