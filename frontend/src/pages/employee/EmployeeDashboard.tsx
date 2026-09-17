import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getTodayAttendance } from '../../services/attendanceService';
import api from '../../services/api';
import AttendanceCard from '../../components/attendance/AttendanceCard';
import AttendanceTimeline from '../../components/attendance/AttendanceTimeline';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Clock4, CalendarDays, IndianRupee, Sparkles, Activity, Building2, Home, Palmtree, UserCheck } from 'lucide-react';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<any>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [leaveSummary, setLeaveSummary] = useState({ totalLeaveDaysYear: 0, totalLeaveDaysMonth: 0 });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [attData, holidayRes, leaveRes] = await Promise.all([
        getTodayAttendance(),
        api.get('/attendance/holidays').catch(() => ({ data: [] })),
        api.get('/attendance/leave-summary').catch(() => ({ data: { totalLeaveDaysYear: 0, totalLeaveDaysMonth: 0 } })),
      ]);
      setAttendance(attData);
      setHolidays(Array.isArray(holidayRes.data) ? holidayRes.data : (holidayRes.data?.holidays || []));
      setLeaveSummary(leaveRes.data || { totalLeaveDaysYear: 0, totalLeaveDaysMonth: 0 });
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
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
  const workMode = attendance?.workMode || user?.workMode || 'WFO';

  return (
    <div className="space-y-6">
      {/* Top Banner / Greeting */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-card relative overflow-hidden">
        {/* Subtle background circles */}
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute right-40 -top-20 w-40 h-40 bg-emerald-400/10 rounded-full blur-xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="inline-flex items-center space-x-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-teal-200 border border-white/10">
                <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                <span>{todayStr}</span>
              </div>
              <div className="inline-flex items-center space-x-1.5 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/20">
                {workMode === 'SSC' ? (
                  <>
                    <span className="text-xs">⚡</span>
                    <span className="text-amber-200">SSC Holiday Shift</span>
                  </>
                ) : workMode === 'WFH' ? (
                  <>
                    <Home className="w-3.5 h-3.5 text-indigo-300" />
                    <span>Work from Home</span>
                  </>
                ) : workMode === 'HYBRID' ? (
                  <>
                    <span className="text-xs">🏢+🏠</span>
                    <span>Hybrid Flex</span>
                  </>
                ) : (
                  <>
                    <Building2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Work from Office</span>
                  </>
                )}
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {greeting}, {user?.name?.split(' ')[0]} 👋
            </h1>

            <p className="text-teal-100/80 text-xs sm:text-sm mt-1 max-w-xl">
              Welcome to your daily workstation. Track your hours and maintain an effortless work-life balance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2 sm:pt-0">
            <Link
              to="/employee/permissions"
              className="inline-flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-[0.98] border border-white/20 text-white px-3.5 py-2 rounded-xl font-semibold text-xs transition-all backdrop-blur-md"
            >
              <Clock4 className="w-3.5 h-3.5 mr-1.5 text-teal-300" /> Request Permission / WFH
            </Link>
            <Link
              to="/employee/salary"
              className="inline-flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-[0.98] border border-white/20 text-white px-3.5 py-2 rounded-xl font-semibold text-xs transition-all backdrop-blur-md"
            >
              <IndianRupee className="w-3.5 h-3.5 mr-1 text-teal-300" /> View Salary / Pay
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Cockpit + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AttendanceCard attendance={attendance} onRefresh={fetchDashboardData} />
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
                  <p className="text-[11px] text-slate-400 mt-0.5">Sign in to record your first activity timestamp.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row: Office Holidays & Leave Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Office Holidays Widget */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                <Palmtree className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Upcoming Office Holidays</h3>
                <p className="text-[11px] text-slate-500">Official company declared holidays</p>
              </div>
            </div>
            <Link
              to="/employee/attendance"
              className="text-xs font-bold text-teal-700 hover:text-teal-800"
            >
              View All ({holidays.length})
            </Link>
          </div>

          {holidays.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              No holidays listed at the moment.
            </div>
          ) : (
            <div className="space-y-2.5">
              {holidays.slice(0, 4).map((h) => {
                const d = new Date(h.date + 'T00:00:00');
                return (
                  <div key={h._id || h.date} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-100 text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{h.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                      h.type === 'NATIONAL' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      h.type === 'COMPANY' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {h.type || 'FESTIVAL'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Leave Balance & Requests Widget */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-card space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">My Leave Summary</h3>
                  <p className="text-[11px] text-slate-500">Approved leaves & days off tracking</p>
                </div>
              </div>
              <Link
                to="/employee/permissions"
                className="text-xs font-bold text-teal-700 hover:text-teal-800"
              >
                Apply Leave
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Holidays Worked</span>
                <span className="text-xl font-extrabold font-mono text-amber-950 mt-1 block">
                  {(leaveSummary as any).holidaysWorkedCount || 0} Days
                </span>
                <span className="text-[10px] text-amber-700 font-medium mt-0.5 block">Holiday / Sunday Punches</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">This Month</span>
                <span className="text-xl font-extrabold font-mono text-rose-900 mt-1 block">
                  {leaveSummary.totalLeaveDaysMonth} Days
                </span>
                <span className="text-[10px] text-rose-600 font-medium mt-0.5 block">Approved Leave Days</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">This Year</span>
                <span className="text-xl font-extrabold font-mono text-slate-900 mt-1 block">
                  {leaveSummary.totalLeaveDaysYear} Days
                </span>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">Total Approved Leaves</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Link
              to="/employee/permissions"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Clock4 className="w-3.5 h-3.5 text-teal-600" />
              <span>Request Week Off, Leave, or WFH</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EmployeeDashboard;
