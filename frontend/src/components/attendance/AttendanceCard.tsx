import React, { useState } from 'react';
import { checkIn, stopSession, resumeSession, checkOut } from '../../services/attendanceService';
import LiveTimer from './LiveTimer';
import { formatTime, formatDuration } from '../../utils/timeUtils';

interface AttendanceCardProps {
  attendance: any;
  onRefresh: () => void;
}

const AttendanceCard: React.FC<AttendanceCardProps> = ({ attendance, onRefresh }) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const status = attendance?.status || 'NOT_CHECKED_IN';
  
  const handleAction = async (actionFn: () => Promise<any>, actionName: string) => {
    setLoadingAction(actionName);
    setError(null);
    try {
      await actionFn();
      onRefresh();
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to ${actionName.toLowerCase()}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Find last resume or check-in for the LiveTimer
  const getLastResumeTime = () => {
    if (!attendance || !attendance.events) return undefined;
    const events = attendance.events;
    // Reverse events to find the last relevant one
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].eventType === 'RESUME' || events[i].eventType === 'CHECK_IN') {
        return events[i].timestamp;
      }
    }
    return undefined;
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'WORKING':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">🟢 Working</span>;
      case 'STOPPED':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">🟡 Leave</span>;
      case 'CHECKED_OUT':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-teal-100 text-teal-800">🔵 Checked Out</span>;
      default:
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">⚪ Not Checked In</span>;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Today's Attendance</h2>
          {getStatusBadge()}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-md text-sm border border-red-200">
          {error}
        </div>
      )}

      {status === 'NOT_CHECKED_IN' ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
          <p className="text-gray-500 mb-6">You haven't started your work session yet.</p>
          <button
            onClick={() => handleAction(checkIn, 'Check In')}
            disabled={loadingAction !== null}
            className="inline-flex justify-center py-3 px-8 border border-transparent shadow-sm text-base font-medium rounded-lg text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
          >
            {loadingAction === 'Check In' ? 'Checking in...' : 'CHECK IN'}
          </button>
        </div>
      ) : (
        <div className="space-y-8">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-500 mb-1">Check In</p>
              <p className="text-base sm:text-lg font-semibold text-gray-900">{formatTime(attendance.checkIn)}</p>
            </div>
            
            {(status === 'CHECKED_OUT' && attendance.checkOut) && (
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-gray-500 mb-1">Check Out</p>
                <p className="text-base sm:text-lg font-semibold text-gray-900">{formatTime(attendance.checkOut)}</p>
              </div>
            )}
            
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-500 mb-1">Working Time</p>
              <p className="text-base sm:text-lg font-semibold text-teal-600">
                {status === 'CHECKED_OUT' ? (
                  formatDuration(attendance.totalWorkingSeconds)
                ) : (
                  <LiveTimer 
                    status={status} 
                    initialWorkingSeconds={attendance.totalWorkingSeconds}
                    lastResumeTimestamp={getLastResumeTime()}
                  />
                )}
              </p>
            </div>
            
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-500 mb-1">Leave Time</p>
              <p className="text-base sm:text-lg font-semibold text-gray-700">
                {formatDuration(attendance.totalStoppedSeconds)}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            {status === 'WORKING' && (
              <div className="flex space-x-4">
                <button
                  onClick={() => handleAction(stopSession, 'Stop')}
                  disabled={loadingAction !== null}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-3 px-4 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50"
                >
                  {loadingAction === 'Stop' ? 'Going on Leave...' : 'LEAVE'}
                </button>
                <button
                  onClick={() => handleAction(checkOut, 'Check Out')}
                  disabled={loadingAction !== null}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-3 px-4 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50"
                >
                  {loadingAction === 'Check Out' ? 'Checking out...' : 'CHECK OUT'}
                </button>
              </div>
            )}

            {status === 'STOPPED' && (
              <div className="flex space-x-4">
                <button
                  onClick={() => handleAction(resumeSession, 'Resume')}
                  disabled={loadingAction !== null}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50"
                >
                  {loadingAction === 'Resume' ? 'Resuming...' : 'RESUME'}
                </button>
              </div>
            )}
            
            {status === 'CHECKED_OUT' && (
              <div className="text-center p-4 bg-gray-50 rounded-lg text-gray-600 font-medium">
                Attendance completed for today.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceCard;
