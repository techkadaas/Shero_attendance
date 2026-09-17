import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { formatTime, formatDuration } from '../../utils/timeUtils';
import { format } from 'date-fns';
import { Calendar, UserCheck, AlertTriangle, Clock, ArrowLeft, ChevronDown } from 'lucide-react';
import LiveTimer from '../../components/attendance/LiveTimer';
import toast from 'react-hot-toast';

const LATE_THRESHOLD_HOUR = 9;
const LATE_THRESHOLD_MINUTE = 30;
const EARLY_EXIT_HOUR = 18;
const EARLY_EXIT_MINUTE = 0;
const MIN_WORKING_SECONDS = 8 * 3600;

interface ParsedRecord {
  _id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  totalWorkingSeconds: number;
  totalStoppedSeconds: number;
  status: string;
  events: any[];
  lunchStart: string | null;
  lunchEnd: string | null;
  displayStatus: 'Present' | 'Early Exit' | 'Late' | 'Half Day' | 'Working' | 'Leave';
}

const getLunchTimes = (events: any[]) => {
  if (!events || !Array.isArray(events)) return { lunchStart: null, lunchEnd: null };
  const stopEvent = events.find(e => e.eventType === 'STOP');
  const resumeEvent = events.find(e => e.eventType === 'RESUME');
  return {
    lunchStart: stopEvent?.timestamp || null,
    lunchEnd: resumeEvent?.timestamp || null,
  };
};

const getLastResumeTime = (events: any[]) => {
  if (!events || !Array.isArray(events)) return undefined;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].eventType === 'RESUME' || events[i].eventType === 'CHECK_IN') {
      return events[i].timestamp;
    }
  }
  return undefined;
};

const getDisplayStatus = (record: any): ParsedRecord['displayStatus'] => {
  if (record.status === 'WORKING') return 'Working';
  if (record.status === 'STOPPED') return 'Leave';

  const checkIn = record.checkIn ? new Date(record.checkIn) : null;
  const checkOut = record.checkOut ? new Date(record.checkOut) : null;

  const isLate = checkIn &&
    (checkIn.getHours() > LATE_THRESHOLD_HOUR ||
      (checkIn.getHours() === LATE_THRESHOLD_HOUR && checkIn.getMinutes() > LATE_THRESHOLD_MINUTE));

  const isEarlyExit = checkOut &&
    (checkOut.getHours() < EARLY_EXIT_HOUR ||
      (checkOut.getHours() === EARLY_EXIT_HOUR && checkOut.getMinutes() < EARLY_EXIT_MINUTE));

  const isHalfDay = record.totalWorkingSeconds < MIN_WORKING_SECONDS / 2;

  if (isHalfDay) return 'Half Day';
  if (isEarlyExit) return 'Early Exit';
  if (isLate) return 'Late';
  return 'Present';
};

const StatusBadge = ({ status }: { status: ParsedRecord['displayStatus'] }) => {
  const styles: Record<string, string> = {
    Present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Early Exit': 'bg-rose-50 text-rose-700 border-rose-200',
    Late: 'bg-amber-50 text-amber-700 border-amber-200',
    'Half Day': 'bg-orange-50 text-orange-700 border-orange-200',
    Working: 'bg-teal-50 text-teal-700 border-teal-200',
    Leave: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${styles[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {status}
    </span>
  );
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const AdminEmployeeAttendance = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [records, setRecords] = useState<ParsedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [employeeName, setEmployeeName] = useState<string>('');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/employees/${id}/attendance`);
      const allRecords: any[] = res.data;
      
      const filtered = allRecords.filter(r => {
        const d = new Date(r.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      });

      const parsed: ParsedRecord[] = filtered.map((rec: any) => {
        const { lunchStart, lunchEnd } = getLunchTimes(rec.events || []);
        const displayStatus = getDisplayStatus(rec);
        return { ...rec, lunchStart, lunchEnd, displayStatus };
      });
      setRecords(parsed);
      
      if (allRecords.length > 0 && allRecords[0].user) {
        setEmployeeName(allRecords[0].user.name);
      }
    } catch (error) {
      console.error('Failed to fetch employee attendance history', error);
      toast.error('Failed to load attendance logs');
    } finally {
      setLoading(false);
    }
  };

  const [nowTick, setNowTick] = useState(new Date());

  useEffect(() => {
    fetchHistory();
    const timer = setInterval(() => setNowTick(new Date()), 60000);
    return () => clearInterval(timer);
  }, [id, month, year]);

  const daysPresent = records.length;
  const daysLate = records.filter(r => r.displayStatus === 'Late').length;
  let dynamicTotalSeconds = records.reduce((acc, curr) => acc + curr.totalWorkingSeconds, 0);

  const activeRecord = records.find(r => r.status === 'WORKING');
  if (activeRecord) {
    const lastResume = getLastResumeTime(activeRecord.events);
    if (lastResume) {
      const diff = Math.floor((nowTick.getTime() - new Date(lastResume).getTime()) / 1000);
      dynamicTotalSeconds += Math.max(0, diff);
    }
  }

  const StatCard = ({ icon: Icon, value, label, colorClass, bgClass }: any) => (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card hover:shadow-card-hover transition-all">
      <div className="flex items-center space-x-3 mb-2">
        <div className={`p-2.5 rounded-xl ${bgClass}`}>
          <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{value}</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-card">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/employees')}
            className="p-2.5 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200/80 transition-colors"
            title="Back to employee master"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Staff Attendance History</h1>
            <p className="text-xs text-slate-500 mt-0.5">Logs for employee ID: <span className="font-mono font-bold text-teal-700">{id}</span></p>
          </div>
        </div>

        {/* Month / Year Selectors */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 py-2.5 pl-3.5 pr-8 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all cursor-pointer"
            >
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 py-2.5 pl-3.5 pr-8 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all cursor-pointer"
            >
              <option value={now.getFullYear() - 1}>{now.getFullYear() - 1}</option>
              <option value={now.getFullYear()}>{now.getFullYear()}</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={UserCheck} value={`${daysPresent} Days`} label="Days Present" colorClass="text-emerald-600" bgClass="bg-emerald-50" />
        <StatCard icon={AlertTriangle} value={`${daysLate} Days`} label="Late Check-ins" colorClass="text-amber-600" bgClass="bg-amber-50" />
        <StatCard icon={Clock} value={formatDuration(dynamicTotalSeconds)} label="Total Logged Hours" colorClass="text-teal-600" bgClass="bg-teal-50" />
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block bg-white shadow-card rounded-3xl border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/75">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Check In</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Lunch Break</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Check Out</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Working Duration</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs">
                    <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading attendance history...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs font-medium">
                    No attendance records found for {MONTHS[month - 1]} {year}.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-900">
                      {format(new Date(record.date), 'EEE, MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-medium text-slate-700">
                      {formatTime(record.checkIn) || '--:--'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500">
                      {record.lunchStart ? `${formatTime(record.lunchStart)} - ${formatTime(record.lunchEnd) || 'Active'}` : '--'}
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
                      <StatusBadge status={record.displayStatus} />
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
        {loading ? (
          <div className="bg-white rounded-3xl p-8 text-center text-slate-400 text-xs border border-slate-200 shadow-card">
            Loading...
          </div>
        ) : records.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center text-slate-400 text-xs border border-slate-200 shadow-card">
            No attendance records found for {MONTHS[month - 1]} {year}.
          </div>
        ) : (
          records.map((record) => (
            <div key={record._id} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-card space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <p className="font-bold text-slate-900 text-xs">
                  {format(new Date(record.date), 'EEE, MMM d, yyyy')}
                </p>
                <StatusBadge status={record.displayStatus} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl">
                  <p className="text-[10px] font-semibold text-slate-400">Check In</p>
                  <p className="font-mono font-bold text-slate-800 mt-0.5">{formatTime(record.checkIn) || '--:--'}</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl">
                  <p className="text-[10px] font-semibold text-slate-400">Check Out</p>
                  <p className="font-mono font-bold text-slate-800 mt-0.5">{formatTime(record.checkOut) || '--:--'}</p>
                </div>
              </div>

              <div className="bg-teal-50/80 p-2.5 rounded-xl flex justify-between items-center border border-teal-100">
                <span className="text-[11px] font-bold text-teal-800">Working Duration</span>
                <span className="font-mono font-extrabold text-xs text-teal-700">
                  {record.status === 'WORKING' ? (
                    <LiveTimer status={record.status} initialWorkingSeconds={record.totalWorkingSeconds} lastResumeTimestamp={getLastResumeTime(record.events)} />
                  ) : (
                    formatDuration(record.totalWorkingSeconds)
                  )}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminEmployeeAttendance;
