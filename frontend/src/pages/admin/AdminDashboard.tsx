import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatDuration, formatTime, formatTime12 } from '../../utils/timeUtils';
import { format } from 'date-fns';
import { UserCheck, UserX, Users, Clock, LogOut, Loader2, Clock4, Settings2, X, Sparkles, Calendar } from 'lucide-react';
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

  const SummaryCard = ({ title, value, icon: Icon, colorClass, bgClass }: any) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all">
      <div className="flex items-center space-x-3 mb-2">
        <div className={`p-2.5 rounded-xl ${bgClass}`}>
          <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
      </div>
      <p className="text-2xl font-extrabold text-slate-900 tracking-tight font-mono">{value}</p>
    </div>
  );

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
              className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded-lg border border-teal-200 transition-colors"
            >
              <Settings2 className="w-3 h-3" />
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
          {/* Metric Telemetry Cards (5-col grid with Working Now removed) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <SummaryCard title="Present" value={summary?.present || 0} icon={UserCheck} colorClass="text-emerald-600" bgClass="bg-emerald-50" />
            <SummaryCard title="Late Today" value={summary?.lateToday || 0} icon={Clock} colorClass="text-amber-600" bgClass="bg-amber-50" />
            <SummaryCard title="Permissions" value={summary?.permissionCount || 0} icon={Clock4} colorClass="text-indigo-600" bgClass="bg-indigo-50" />
            <SummaryCard title="On Leave" value={summary?.absent || 0} icon={UserX} colorClass="text-rose-600" bgClass="bg-rose-50" />
            <SummaryCard title="Signed Out" value={summary?.checkedOut || 0} icon={LogOut} colorClass="text-slate-600" bgClass="bg-slate-100" />
          </div>

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
                  {attendance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs font-medium">
                        No employee attendance recorded for this date.
                      </td>
                    </tr>
                  ) : (
                    attendance.map((record) => (
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
            {attendance.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center text-slate-400 text-xs border border-slate-200 shadow-card">
                No attendance records for this date.
              </div>
            ) : (
              attendance.map((record) => (
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

      {/* Set Office Timing Modal */}
      {showTimingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white w-full rounded-3xl shadow-2xl max-w-md relative p-6 space-y-5 border border-slate-100 animate-slide-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
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

            <form onSubmit={handleSaveTiming} className="space-y-4">
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
                    className="form-input font-mono"
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
                    className="form-input font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Late Arrival Grace Period (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  required
                  value={timingForm.graceMinutes}
                  onChange={(e) => setTimingForm({ ...timingForm, graceMinutes: parseInt(e.target.value) || 0 })}
                  className="form-input"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Check-ins after {formatTime12(timingForm.officeStartTime)} + {timingForm.graceMinutes}m are counted as Late.
                </p>
              </div>

              <div className="p-3 bg-teal-50/70 rounded-2xl border border-teal-100 flex items-center justify-between text-xs">
                <span className="text-teal-800 font-semibold">Standard Shift Duration:</span>
                <span className="font-extrabold text-teal-900 font-mono">
                  {calculateShiftDuration(timingForm.officeStartTime, timingForm.officeEndTime)}
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTimingModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTiming}
                  className="btn-primary flex-1 shadow-glow-teal"
                >
                  {savingTiming ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
