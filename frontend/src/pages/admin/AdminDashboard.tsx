import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatDuration, formatTime, formatTime12 } from '../../utils/timeUtils';
import { format } from 'date-fns';
import { UserCheck, UserX, Users, Clock, LogOut, Loader2, Clock4, Settings2, X } from 'lucide-react';
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

const getStatusClass = (status: string) => {
  if (status === 'WORKING') return 'bg-green-100 text-green-800';
  if (status === 'STOPPED') return 'bg-yellow-100 text-yellow-800';
  return 'bg-teal-100 text-teal-800';
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

  const SummaryCard = ({ title, value, icon: Icon, colorClass }: any) => (
    <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
      <div className={`p-2.5 rounded-full mb-2 ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-0.5">{value}</p>
      <p className="text-xs sm:text-sm font-medium text-gray-500 leading-tight">{title}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header — stacks on mobile */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Time Tracking Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Track employee attendance, working hours, and office timings</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Office Timing Quick Widget */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-gray-200 shadow-sm text-xs sm:text-sm">
            <Clock className="w-4 h-4 text-teal-600" />
            <div>
              <span className="text-gray-500">Office: </span>
              <span className="font-semibold text-gray-900">
                {formatTime12(summary?.officeTiming?.officeStartTime || timingForm.officeStartTime)} – {formatTime12(summary?.officeTiming?.officeEndTime || timingForm.officeEndTime)}
              </span>
            </div>
            <button
              onClick={() => setShowTimingModal(true)}
              className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Set Timing
            </button>
          </div>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 rounded-xl shadow-sm focus:ring-teal-500 focus:border-teal-500 text-sm py-2 px-3 bg-white"
          />
        </div>
      </div>

      {loading && !summary ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary cards: 3-col on mobile, 6-col on large */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
            <SummaryCard title="Present" value={summary?.present || 0} icon={UserCheck} colorClass="bg-green-100 text-green-600" />
            <SummaryCard title="Late" value={summary?.lateToday || 0} icon={Clock} colorClass="bg-orange-100 text-orange-600" />
            <SummaryCard title="Working" value={summary?.workingNow || 0} icon={Users} colorClass="bg-teal-100 text-teal-600" />
            <SummaryCard title="Permission" value={summary?.permissionCount || 0} icon={Clock4} colorClass="bg-yellow-100 text-yellow-600" />
            <SummaryCard title="Leave" value={summary?.absent || 0} icon={UserX} colorClass="bg-red-100 text-red-600" />
            <SummaryCard title="Checked Out" value={summary?.checkedOut || 0} icon={LogOut} colorClass="bg-purple-100 text-purple-600" />
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Working Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">No attendance records found for this date.</td>
                    </tr>
                  ) : (
                    attendance.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{record.user?.name || record.employeeId}</div>
                          {record.user && <div className="text-xs text-gray-400">{record.user.employeeId}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatTime(record.checkIn)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatTime(record.checkOut)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {record.status === 'WORKING' ? (
                            <LiveTimer status={record.status} initialWorkingSeconds={record.totalWorkingSeconds} lastResumeTimestamp={getLastResumeTime(record.events)} />
                          ) : (
                            formatDuration(record.totalWorkingSeconds)
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(record.status)}`}>
                            {record.status}
                          </span>
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
              <div className="bg-white rounded-xl p-6 text-center text-gray-500 text-sm border border-gray-200">
                No attendance records found for this date.
              </div>
            ) : (
              attendance.map((record) => (
                <div key={record._id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{record.user?.name || record.employeeId}</p>
                      {record.user && <p className="text-xs text-gray-400 font-mono mt-0.5">{record.user.employeeId}</p>}
                    </div>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusClass(record.status)}`}>
                      {record.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs text-gray-400 mb-0.5">Check In</p>
                      <p className="text-sm font-semibold text-gray-800">{formatTime(record.checkIn) || '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs text-gray-400 mb-0.5">Check Out</p>
                      <p className="text-sm font-semibold text-gray-800">{formatTime(record.checkOut) || '—'}</p>
                    </div>
                    <div className="bg-teal-50 rounded-lg p-2">
                      <p className="text-xs text-teal-400 mb-0.5">Working</p>
                      <p className="text-sm font-semibold text-teal-700">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full rounded-2xl shadow-xl max-w-md relative p-6 space-y-5">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Set Office Timings</h3>
                  <p className="text-xs text-gray-500">Configure standard working hours & late threshold</p>
                </div>
              </div>
              <button
                onClick={() => setShowTimingModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTiming} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Start Time (Morning)
                  </label>
                  <input
                    type="time"
                    required
                    value={timingForm.officeStartTime}
                    onChange={(e) => setTimingForm({ ...timingForm, officeStartTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    End Time (Evening)
                  </label>
                  <input
                    type="time"
                    required
                    value={timingForm.officeEndTime}
                    onChange={(e) => setTimingForm({ ...timingForm, officeEndTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Late Arrival Grace Period (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  required
                  value={timingForm.graceMinutes}
                  onChange={(e) => setTimingForm({ ...timingForm, graceMinutes: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Employees checking in after {formatTime12(timingForm.officeStartTime)} + {timingForm.graceMinutes} mins will be counted as Late.
                </p>
              </div>

              <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100 flex items-center justify-between text-xs">
                <span className="text-gray-600 font-medium">Standard Daily Shift:</span>
                <span className="font-bold text-teal-800 font-mono">
                  {calculateShiftDuration(timingForm.officeStartTime, timingForm.officeEndTime)}
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTimingModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTiming}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {savingTiming ? 'Saving...' : 'Save Office Timings'}
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
