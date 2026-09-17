import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMonthlyAttendance } from '../../services/attendanceService';
import { formatTime, formatDuration } from '../../utils/timeUtils';
import { format } from 'date-fns';
import { Calendar, UserCheck, UserX, AlertTriangle, Clock } from 'lucide-react';
import LiveTimer from '../../components/attendance/LiveTimer';

// Standard work start time (9:30 AM) – adjust as needed
const LATE_THRESHOLD_HOUR = 9;
const LATE_THRESHOLD_MINUTE = 30;
// Standard work end time (6:00 PM) for early exit
const EARLY_EXIT_HOUR = 18;
const EARLY_EXIT_MINUTE = 0;
// Minimum working hours for full day (8h)
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
  // First STOP = lunch start, first RESUME after that = lunch end
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
    Present: 'bg-green-100 text-green-700',
    'Early Exit': 'bg-red-500 text-white',
    Late: 'bg-orange-100 text-orange-700',
    'Half Day': 'bg-yellow-100 text-yellow-700',
    Working: 'bg-teal-100 text-teal-700',
    Leave: 'bg-yellow-100 text-yellow-600',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const AttendanceHistory = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<ParsedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await getMonthlyAttendance(month, year);
      const parsed: ParsedRecord[] = data.map((rec: any) => {
        const { lunchStart, lunchEnd } = getLunchTimes(rec.events || []);
        const displayStatus = getDisplayStatus(rec);
        return { ...rec, lunchStart, lunchEnd, displayStatus };
      });
      setRecords(parsed);
    } catch (error) {
      console.error('Failed to fetch history', error);
    } finally {
      setLoading(false);
    }
  };

  const [nowTick, setNowTick] = useState(new Date());

  useEffect(() => {
    fetchHistory();
    const timer = setInterval(() => setNowTick(new Date()), 60000); // tick every minute for stats
    return () => clearInterval(timer);
  }, [month, year]);

  // Stats
  const daysPresent = records.length;
  const daysAbsent = 0; // Would need calendar integration to calculate properly
  const daysLate = records.filter(r => r.displayStatus === 'Late').length;
  let dynamicTotalSeconds = records.reduce((acc, curr) => acc + curr.totalWorkingSeconds, 0);

  // Add ongoing time to stat card if working
  const activeRecord = records.find(r => r.status === 'WORKING');
  if (activeRecord) {
    const lastResume = getLastResumeTime(activeRecord.events);
    if (lastResume) {
      const diff = Math.floor((nowTick.getTime() - new Date(lastResume).getTime()) / 1000);
      dynamicTotalSeconds += Math.max(0, diff);
    }
  }

  const StatCard = ({ icon: Icon, value, label, iconColor }: any) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center text-center">
      <Icon className={`w-6 h-6 mb-2 ${iconColor}`} strokeWidth={1.5} />
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-0.5">{value}</p>
      <p className="text-xs sm:text-sm text-gray-500 font-medium">{label}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-teal-50 rounded-xl mt-0.5">
            <Calendar className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Monthly Time Tracking</h1>
            <p className="mt-0.5 text-sm text-gray-500">Viewing records for {user?.name}</p>
          </div>
        </div>

        {/* Month / Year selectors */}
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="flex-1 sm:flex-none border border-gray-200 rounded-xl shadow-sm bg-white text-sm py-2.5 px-3 pr-8 focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
          >
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="flex-1 sm:flex-none border border-gray-200 rounded-xl shadow-sm bg-white text-sm py-2.5 px-3 pr-8 focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
          >
            <option value={now.getFullYear() - 1}>{now.getFullYear() - 1}</option>
            <option value={now.getFullYear()}>{now.getFullYear()}</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={UserCheck} value={daysPresent} label="Days Present" iconColor="text-green-500" />
        <StatCard icon={UserX} value={daysAbsent} label="Days on Leave" iconColor="text-gray-500" />
        <StatCard icon={AlertTriangle} value={daysLate} label="Days Late" iconColor="text-red-500" />
        <StatCard
          icon={Clock}
          value={formatDuration(dynamicTotalSeconds)}
          label="Total Working Time"
          iconColor="text-teal-500"
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Check In</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Lunch Start</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Lunch End</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Check Out</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Working Time</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-500"></div>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">
                    No records found for {MONTHS[month - 1]} {year}.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {format(new Date(record.date), 'EEE, MMM d')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatTime(record.checkIn) || '--'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatTime(record.lunchStart) || '--'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatTime(record.lunchEnd) || '--'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatTime(record.checkOut) || '--'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.status === 'WORKING' ? (
                        <LiveTimer status={record.status} initialWorkingSeconds={record.totalWorkingSeconds} lastResumeTimestamp={getLastResumeTime(record.events)} />
                      ) : (
                        formatDuration(record.totalWorkingSeconds)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-500"></div>
            </div>
          </div>
        ) : records.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 text-sm border border-gray-100">
            No records found for {MONTHS[month - 1]} {year}.
          </div>
        ) : (
          records.map((record) => (
            <div key={record._id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
              {/* Date + Status */}
              <div className="flex justify-between items-center">
                <p className="font-semibold text-gray-900 text-sm">
                  {format(new Date(record.date), 'EEE, MMM d, yyyy')}
                </p>
                <StatusBadge status={record.displayStatus} />
              </div>

              {/* Times grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Check In</p>
                  <p className="text-sm font-semibold text-gray-800">{formatTime(record.checkIn) || '--'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Check Out</p>
                  <p className="text-sm font-semibold text-gray-800">{formatTime(record.checkOut) || '--'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Lunch Start</p>
                  <p className="text-sm font-semibold text-gray-800">{formatTime(record.lunchStart) || '--'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Lunch End</p>
                  <p className="text-sm font-semibold text-gray-800">{formatTime(record.lunchEnd) || '--'}</p>
                </div>
              </div>

              {/* Working time */}
              <div className="bg-teal-50 rounded-xl p-3 flex justify-between items-center">
                <span className="text-xs text-teal-500 font-medium">Working Time</span>
                <span className="text-sm font-bold text-teal-700">
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

export default AttendanceHistory;
