import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getTodayAttendance } from '../../services/attendanceService';
import AttendanceCard from '../../components/attendance/AttendanceCard';
import AttendanceTimeline from '../../components/attendance/AttendanceTimeline';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Clock4 } from 'lucide-react';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAttendance = async () => {
    try {
      const data = await getTodayAttendance();
      setAttendance(data);
    } catch (error) {
      console.error('Failed to fetch today attendance', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  // Greet based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const todayStr = format(new Date(), 'EEEE, d MMMM yyyy');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{greeting}, {user?.name} 👋</h1>
          <p className="mt-1 text-sm text-gray-500">{todayStr}</p>
        </div>
        <Link
          to="/employee/permissions"
          className="inline-flex items-center justify-center bg-white border border-gray-200 text-teal-700 px-4 py-2 rounded-lg hover:bg-teal-50 font-medium text-sm transition-colors shadow-sm w-full sm:w-auto"
        >
          <Clock4 className="w-4 h-4 mr-1.5 text-teal-600" /> Request Permission
        </Link>
      </div>

      {/* On mobile: stack vertically. On desktop: side by side */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AttendanceCard attendance={attendance} onRefresh={fetchAttendance} />
        </div>
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Activity</h3>
            {attendance && attendance.events && attendance.events.length > 0 ? (
              <AttendanceTimeline events={attendance.events} />
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No activity recorded today.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
