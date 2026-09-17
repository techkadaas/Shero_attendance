import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getTodayAttendance } from '../../services/attendanceService';
import AttendanceCard from '../../components/attendance/AttendanceCard';
import AttendanceTimeline from '../../components/attendance/AttendanceTimeline';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Clock4, CalendarDays, IndianRupee, Sparkles, Activity } from 'lucide-react';

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
      <div className="flex flex-col justify-center items-center h-80 space-y-3">
        <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading your workspace...</p>
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const todayStr = format(new Date(), 'EEEE, d MMMM yyyy');

  return (
    <div className="space-y-6">
      {/* Top Banner / Greeting */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-card relative overflow-hidden">
        {/* Subtle background circles */}
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute right-40 -top-20 w-40 h-40 bg-emerald-400/10 rounded-full blur-xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-teal-200 mb-3 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              <span>{todayStr}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {greeting}, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-teal-100/80 text-xs sm:text-sm mt-1 max-w-xl">
              Welcome to your daily workstation. Track your hours and maintain an effortless work-life balance.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 sm:pt-0">
            <Link
              to="/employee/permissions"
              className="inline-flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-[0.98] border border-white/20 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition-all backdrop-blur-md"
            >
              <Clock4 className="w-3.5 h-3.5 mr-1.5 text-teal-300" /> Request Permission
            </Link>
            <Link
              to="/employee/salary"
              className="inline-flex items-center justify-center bg-white text-teal-900 hover:bg-teal-50 active:scale-[0.98] px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm"
            >
              <IndianRupee className="w-3.5 h-3.5 mr-1 text-teal-700" /> View Salary
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Cockpit + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AttendanceCard attendance={attendance} onRefresh={fetchAttendance} />
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-card h-full flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-600" />
                Today's Log Activity
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">Chronological</span>
            </div>

            <div className="flex-1">
              {attendance && attendance.events && attendance.events.length > 0 ? (
                <AttendanceTimeline events={attendance.events} />
              ) : (
                <div className="text-center py-12 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-100">
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">No events logged yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Check in to record your first activity timestamp.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
