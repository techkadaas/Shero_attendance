import React, { useState } from 'react';
import { checkIn, stopSession, resumeSession, checkOut } from '../../services/attendanceService';
import LiveTimer from './LiveTimer';
import { formatTime, formatDuration } from '../../utils/timeUtils';
import { useAuth } from '../../context/AuthContext';
import { LogIn, Coffee, Play, LogOut, CheckCircle2, Clock, AlertCircle, Building2, Home } from 'lucide-react';
import toast from 'react-hot-toast';

interface AttendanceCardProps {
  attendance: any;
  onRefresh: () => void;
}

const AttendanceCard: React.FC<AttendanceCardProps> = ({ attendance, onRefresh }) => {
  const { user } = useAuth();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const status = attendance?.status || 'NOT_CHECKED_IN';
  const workMode = attendance?.workMode || user?.workMode || 'WFO';
  
  const getCoordinates = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        },
        () => {
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    });
  };

  const handleCheckIn = async () => {
    setLoadingAction('Sign In');
    setError(null);
    try {
      const coords = await getCoordinates();
      await checkIn(coords || undefined);
      toast.success('Signed in successfully! Have a great day.');
      onRefresh();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to sign in';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAction = async (actionFn: () => Promise<any>, actionName: string, successMsg: string) => {
    setLoadingAction(actionName);
    setError(null);
    try {
      await actionFn();
      toast.success(successMsg);
      onRefresh();
    } catch (err: any) {
      const msg = err.response?.data?.error || `Failed to ${actionName.toLowerCase()}`;
      setError(msg);
      toast.error(msg);
    } finally {
      setLoadingAction(null);
    }
  };

  const getLastResumeTime = () => {
    if (!attendance || !attendance.events) return undefined;
    const events = attendance.events;
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
        return (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-ping"></span>
            <span>WORKING NOW</span>
          </div>
        );
      case 'STOPPED':
        return (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
            <span>ON BREAK</span>
          </div>
        );
      case 'CHECKED_OUT':
        return (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/80 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            <span>SIGNED OUT</span>
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200/80">
            <span className="w-2 h-2 rounded-full bg-slate-400 mr-2"></span>
            <span>NOT SIGNED IN</span>
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-card hover:shadow-card-hover transition-all duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-600" />
            Today's Attendance Cockpit
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Live work timer and attendance state management</p>
        </div>
        <div className="flex items-center gap-2">
          {workMode === 'HYBRID' ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
              <span className="mr-1 text-xs">🏢+🏠</span>
              Hybrid Flex
            </span>
          ) : workMode === 'WFH' ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Home className="w-3 h-3 mr-1 text-indigo-500" />
              WFH Remote
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
              <Building2 className="w-3 h-3 mr-1 text-teal-600" />
              WFO Office
            </span>
          )}
          {getStatusBadge()}
        </div>
      </div>

      {error && (
        <div className="my-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center text-xs text-rose-700 font-medium">
          <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
          {error}
        </div>
      )}

      {/* State Machine: Not Signed In */}
      {status === 'NOT_CHECKED_IN' ? (
        <div className="text-center py-10 px-4 bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-dashed border-slate-200 my-6">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-teal-50/50">
            <LogIn className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Ready to start your day?</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
            {workMode === 'WFO' 
              ? 'Click below to verify your GPS location at the office and begin tracking your active work hours.'
              : workMode === 'HYBRID'
              ? 'Click below to sign in from anywhere (office or home) and begin tracking your active work hours.'
              : 'Click below to record your official sign-in timestamp and begin tracking your active work hours.'}
          </p>
          <button
            onClick={handleCheckIn}
            disabled={loadingAction !== null}
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm rounded-xl shadow-glow-teal active:scale-[0.98] transition-all inline-flex items-center justify-center space-x-2 disabled:opacity-60"
          >
            <LogIn className="w-4 h-4" />
            <span>{loadingAction === 'Sign In' ? 'Verifying Location & Signing In...' : 'SIGN IN NOW'}</span>
          </button>
        </div>
      ) : (

        /* State Machine: Active Work Day */
        <div className="space-y-6 my-6">
          {/* Key Metrics Grid (3 Clean Tiles) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            
            {/* Sign In Tile */}
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sign In Time</p>
              <p className="text-xl font-extrabold text-slate-900 font-mono">
                {formatTime(attendance.checkIn)}
              </p>
            </div>

            {/* Live Working Time Tile */}
            <div className={`p-4 rounded-2xl border transition-all ${
              status === 'WORKING' 
                ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900' 
                : 'bg-slate-50/80 border-slate-100 text-slate-900'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <p className={`text-[11px] font-bold uppercase tracking-wider ${status === 'WORKING' ? 'text-emerald-700' : 'text-slate-400'}`}>
                  Working Time
                </p>
                {status === 'WORKING' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                )}
              </div>
              <p className="text-xl font-extrabold font-mono text-emerald-700">
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

            {/* Sign Out Tile */}
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sign Out Time</p>
              <p className="text-xl font-extrabold text-slate-900 font-mono">
                {status === 'CHECKED_OUT' && attendance.checkOut ? formatTime(attendance.checkOut) : '--:--'}
              </p>
            </div>
          </div>

          {/* Primary Action Button: Sign Out Only */}
          <div className="pt-2">
            {status === 'WORKING' && (
              <div>
                <button
                  onClick={() => handleAction(checkOut, 'Sign Out', 'Signed out successfully. Good work today!')}
                  disabled={loadingAction !== null}
                  className="w-full py-4 px-6 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm rounded-xl shadow-glow-teal active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{loadingAction === 'Sign Out' ? 'Signing out...' : 'SIGN OUT FOR TODAY'}</span>
                </button>
              </div>
            )}
            
            {status === 'CHECKED_OUT' && (
              <div className="p-4 bg-slate-50 rounded-2xl text-center border border-slate-200/80">
                <p className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Work Day Completed
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your attendance has been finalized for today. Total active work logged: <span className="font-bold text-slate-800">{formatDuration(attendance.totalWorkingSeconds)}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default AttendanceCard;
