import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { formatDuration, formatTime, formatTime12 } from '../../utils/timeUtils';
import { format } from 'date-fns';
import { UserCheck, UserX, Users, Clock, LogOut, Loader2, Clock4, Settings2, X, Sparkles, Calendar, Pencil } from 'lucide-react';
import LiveTimer from '../../components/attendance/LiveTimer';
import toast from 'react-hot-toast';

const getLastResumeTime = (events: any[]) => {
  if (!events || !Array.isArray(events)) return undefined;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].eventType === 'RESUME' || events[i].eventType === 'CHECK_IN') {
      return events[i].timestamp;
    }
  }
  return undefined;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'WORKING':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
          WORKING
        </span>
      );
    case 'STOPPED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
          ON LEAVE
        </span>
      );
    case 'CHECKED_OUT':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
          CHECKED OUT
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-50 text-slate-500 border border-slate-200">
          {status}
        </span>
      );
  }
};

const calculateShiftDuration = (start: string, end: string) => {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return '';
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m > 0 ? `${m}m` : ''} shift`;
};

const AdminDashboard = () => {
  const [summary, setSummary] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Office Timing State & Modal
  const [showTimingModal, setShowTimingModal] = useState(false);
  const [timingForm, setTimingForm] = useState({
    officeStartTime: '09:00',
    officeEndTime: '18:00',
    graceMinutes: 15,
  });
  const [savingTiming, setSavingTiming] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [summaryRes, attendanceRes] = await Promise.all([
        api.get(`/admin/dashboard?date=${date}`),
        api.get(`/admin/attendance?date=${date}`)
      ]);
      setSummary(summaryRes.data);
      if (summaryRes.data?.officeTiming) {
        setTimingForm({
          officeStartTime: summaryRes.data.officeTiming.officeStartTime || '09:00',
          officeEndTime: summaryRes.data.officeTiming.officeEndTime || '18:00',
          graceMinutes: summaryRes.data.officeTiming.graceMinutes ?? 15,
        });
      }
      setAttendance(attendanceRes.data);
    } catch (error) {
      console.error('Failed to fetch admin data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [date]);

  const handleSaveTiming = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTiming(true);
    try {
      await api.put('/admin/settings', timingForm);
      toast.success('Office timing updated successfully!');
      setShowTimingModal(false);
      fetchDashboard();
    } catch (error) {
      toast.error('Failed to update office timing');
    } finally {
      setSavingTiming(false);
    }
  };

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PRESENT' | 'LATE' | 'PERMISSIONS' | 'LEAVE' | 'SIGNED_OUT'>('ALL');

  const SummaryCard = ({ title, value, filterType, icon: Icon, colorClass, bgClass, ringClass }: any) => {
    const isSelected = activeFilter === filterType;
    return (
      <button
        type="button"
        onClick={() => setActiveFilter(isSelected ? 'ALL' : filterType)}
        className={`w-full text-left p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
          isSelected 
            ? `bg-white shadow-lg ring-2 ${ringClass} scale-[1.02] border-transparent` 
            : 'bg-white border-slate-200/80 shadow-card hover:shadow-card-hover hover:border-slate-300'
        }`}
      >
        {isSelected && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
            <span>Filtered</span>
          </div>
        )}
        <div className="flex items-center space-x-3 mb-2">
          <div className={`p-2.5 rounded-xl ${bgClass} group-hover:scale-105 transition-transform`}>
            <Icon className={`w-5 h-5 ${colorClass}`} />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
        </div>
        <div className="flex items-baseline justify-between">
          <p className="text-2xl font-extrabold text-slate-900 tracking-tight font-mono">{value}</p>
          <span className="text-[10px] text-slate-400 font-medium group-hover:text-teal-600 transition-colors">
            {isSelected ? 'Click to reset' : 'Click to view'}
          </span>
        </div>
      </button>
    );
  };

  // Filtered dataset calculation
  const displayedAttendance = attendance.filter((rec) => {
    if (activeFilter === 'PRESENT') return true;
    if (activeFilter === 'LATE') return rec.isLate;
    if (activeFilter === 'SIGNED_OUT') return rec.status === 'CHECKED_OUT';
    return true;
  });

  const absentList = summary?.absentList || [];
  const permissionList = summary?.permissionList || [];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-card">
        <div>
          <div className="inline-flex items-center space-x-1.5 bg-teal-50 px-2.5 py-0.5 rounded-full text-xs font-bold text-teal-700 border border-teal-100 mb-1.5">
            <Sparkles className="w-3 h-3 text-teal-600" />
            <span>Real-time Operational Telemetry</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Executive Attendance Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">Live headcount monitoring, shift timings, and active logs</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Office Timing Quick Action */}
          <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200/80 text-xs">
            <Clock className="w-4 h-4 text-teal-600" />
            <div>
              <span className="text-slate-400 font-medium">Shift: </span>
              <span className="font-bold text-slate-800 font-mono">
                {formatTime12(summary?.officeTiming?.officeStartTime || timingForm.officeStartTime)} – {formatTime12(summary?.officeTiming?.officeEndTime || timingForm.officeEndTime)}
              </span>
            </div>
            <button
              onClick={() => setShowTimingModal(true)}
              className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 transition-colors"
              title="Edit Office Shift Timings"
            >
              <Pencil className="w-3 h-3" />
              Adjust
            </button>
          </div>

          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all cursor-pointer font-mono"
            />
          </div>
        </div>
      </div>

      {loading && !summary ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* Interactive Metric Telemetry Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <SummaryCard 
              title="Present" 
              value={summary?.present || 0} 
              filterType="PRESENT" 
              icon={UserCheck} 
              colorClass="text-emerald-600" 
              bgClass="bg-emerald-50" 
              ringClass="ring-emerald-500" 
            />
            <SummaryCard 
              title="Late Today" 
              value={summary?.lateToday || 0} 
              filterType="LATE" 
              icon={Clock} 
              colorClass="text-amber-600" 
              bgClass="bg-amber-50" 
              ringClass="ring-amber-500" 
            />
            <SummaryCard 
              title="Permissions" 
              value={summary?.permissionCount || 0} 
              filterType="PERMISSIONS" 
              icon={Clock4} 
              colorClass="text-indigo-600" 
              bgClass="bg-indigo-50" 
              ringClass="ring-indigo-500" 
            />
            <SummaryCard 
              title="On Leave" 
              value={summary?.absent || 0} 
              filterType="LEAVE" 
              icon={UserX} 
              colorClass="text-rose-600" 
              bgClass="bg-rose-50" 
              ringClass="ring-rose-500" 
            />
            <SummaryCard 
              title="Signed Out" 
              value={summary?.checkedOut || 0} 
              filterType="SIGNED_OUT" 
              icon={LogOut} 
              colorClass="text-slate-600" 
              bgClass="bg-slate-100" 
              ringClass="ring-slate-500" 
            />
          </div>

          {/* Active Filter Status Bar */}
          {activeFilter !== 'ALL' && (
            <div className="flex items-center justify-between bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-md animate-fade-in">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                <span className="text-xs font-semibold text-slate-300">
                  Showing list for: <strong className="text-white uppercase tracking-wider">{activeFilter.replace('_', ' ')}</strong>
                  {activeFilter === 'LEAVE' && ` (${absentList.length} staff)`}
                  {activeFilter === 'PERMISSIONS' && ` (${permissionList.length} staff)`}
                  {activeFilter !== 'LEAVE' && activeFilter !== 'PERMISSIONS' && ` (${displayedAttendance.length} staff)`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveFilter('ALL')}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Show All</span>
              </button>
            </div>
          )}

          {/* VIEW: ON LEAVE / ABSENT EMPLOYEES */}
          {activeFilter === 'LEAVE' ? (
            <div className="bg-white shadow-card rounded-3xl border border-slate-200/80 overflow-hidden animate-fade-in">
              <div className="px-6 py-4 border-b border-slate-100 bg-rose-50/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserX className="w-4 h-4 text-rose-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Staff On Leave / Absent Today ({absentList.length})
                  </h3>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50/75">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Employee ID</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Work Mode</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {absentList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-xs font-medium">
                          All active employees are present today! No staff on leave.
                        </td>
                      </tr>
                    ) : (
                      absentList.map((emp: any) => (
                        <tr key={emp.employeeId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 font-bold flex items-center justify-center text-xs border border-rose-100">
                                {emp.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900">{emp.name}</div>
                                <div className="text-[10px] text-slate-400">{emp.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-bold text-slate-700">
                            {emp.employeeId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-slate-600">
                            {emp.workMode || 'WFO'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              ON LEAVE / ABSENT
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeFilter === 'PERMISSIONS' ? (
            /* VIEW: PERMISSIONS / WFH REQUESTS */
            <div className="bg-white shadow-card rounded-3xl border border-slate-200/80 overflow-hidden animate-fade-in">
              <div className="px-6 py-4 border-b border-slate-100 bg-indigo-50/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock4 className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Permissions & WFH Requests Today ({permissionList.length})
                  </h3>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50/75">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Request Type</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Timing / Reason</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {permissionList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-xs font-medium">
                          No permissions or WFH requests recorded for this date.
                        </td>
                      </tr>
                    ) : (
                      permissionList.map((p: any) => (
                        <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs border border-indigo-100">
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900">{p.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{p.employeeId}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {p.requestType}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600">
                            <div>
                              {p.startTime && p.endTime && (
                                <span className="font-mono font-bold text-slate-800 mr-2">
                                  {p.startTime} - {p.endTime}
                                </span>
                              )}
                              <span>{p.reason || 'No reason specified'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              p.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              p.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* VIEW: ATTENDANCE LOGS (ALL / PRESENT / LATE / SIGNED_OUT) */
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block bg-white shadow-card rounded-3xl border border-slate-200/80 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/75">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Employee</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Sign In</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Sign Out</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Working Duration</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedAttendance.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs font-medium">
                            No matching employee attendance found for this selection.
                          </td>
                        </tr>
                      ) : (
                        displayedAttendance.map((record) => (
                          <tr key={record._id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-800 font-bold flex items-center justify-center text-xs border border-teal-100">
                                  {(record.user?.name || record.employeeId).charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-slate-900">{record.user?.name || record.employeeId}</div>
                                  {record.user && <div className="text-[10px] text-slate-400 font-mono">{record.user.employeeId}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-medium text-slate-700">
                              <div className="flex items-center gap-1.5">
                                <span>{formatTime(record.checkIn) || '--:--'}</span>
                                {record.isLate && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                                    LATE
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-medium text-slate-700">
                              {formatTime(record.checkOut) || '--:--'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-bold text-teal-700">
                              {record.status === 'WORKING' ? (
                                <LiveTimer status={record.status} initialWorkingSeconds={record.totalWorkingSeconds} lastResumeTimestamp={getLastResumeTime(record.events)} />
                              ) : (
                                formatDuration(record.totalWorkingSeconds)
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              {getStatusBadge(record.status)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card List */}
              <div className="sm:hidden space-y-3">
                {displayedAttendance.length === 0 ? (
                  <div className="bg-white rounded-3xl p-8 text-center text-slate-400 text-xs border border-slate-200 shadow-card">
                    No matching attendance records.
                  </div>
                ) : (
                  displayedAttendance.map((record) => (
                    <div key={record._id} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-card space-y-3">
                      <div className="flex justify-between items-start pb-2 border-b border-slate-100">
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{record.user?.name || record.employeeId}</p>
                          {record.user && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{record.user.employeeId}</p>}
                        </div>
                        {getStatusBadge(record.status)}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-slate-50 rounded-xl p-2">
                          <p className="text-[10px] text-slate-400 mb-0.5">Sign In</p>
                          <div className="flex flex-col items-center">
                            <p className="font-mono font-bold text-slate-800">{formatTime(record.checkIn) || '—'}</p>
                            {record.isLate && (
                              <span className="mt-0.5 px-1.5 py-0.2 rounded text-[8px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                                LATE
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2">
                          <p className="text-[10px] text-slate-400 mb-0.5">Sign Out</p>
                          <p className="font-mono font-bold text-slate-800">{formatTime(record.checkOut) || '—'}</p>
                        </div>
                        <div className="bg-teal-50 rounded-xl p-2 border border-teal-100">
                          <p className="text-[10px] text-teal-600 mb-0.5 font-bold">Working</p>
                          <p className="font-mono font-extrabold text-teal-800">
                            {record.status === 'WORKING' ? (
                              <LiveTimer status={record.status} initialWorkingSeconds={record.totalWorkingSeconds} lastResumeTimestamp={getLastResumeTime(record.events)} />
                            ) : (
                              formatDuration(record.totalWorkingSeconds)
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Set Office Timing Modal */}
      {showTimingModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white w-full rounded-3xl shadow-2xl max-w-md overflow-hidden border border-slate-100 animate-slide-up flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Office Timings & Policy</h3>
                  <p className="text-[11px] text-slate-400">Configure standard working hours & late grace period</p>
                </div>
              </div>
              <button
                onClick={() => setShowTimingModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTiming} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={timingForm.officeStartTime}
                    onChange={(e) => setTimingForm({ ...timingForm, officeStartTime: e.target.value })}
                    className="form-input font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={timingForm.officeEndTime}
                    onChange={(e) => setTimingForm({ ...timingForm, officeEndTime: e.target.value })}
                    className="form-input font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Grace Period (Minutes)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max="120"
                  value={timingForm.graceMinutes}
                  onChange={(e) => setTimingForm({ ...timingForm, graceMinutes: parseInt(e.target.value) || 0 })}
                  className="form-input font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">Check-ins after grace time are marked as Late Check-In.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTimingModal(false)}
                  className="btn-secondary flex-1 py-2.5 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 py-2.5 text-xs font-bold shadow-glow-teal"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminDashboard;
