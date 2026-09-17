import api from './api';

export const getTodayAttendance = async () => {
  const response = await api.get('/attendance/today');
  return response.data;
};

export const checkIn = async () => {
  const response = await api.post('/attendance/check-in');
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

export const checkOut = async () => {
  const response = await api.post('/attendance/check-out');
  return response.data;
};

export const getMonthlyAttendance = async (month: number, year: number) => {
  const response = await api.get('/attendance/monthly', { params: { month, year } });
  return response.data;
};
