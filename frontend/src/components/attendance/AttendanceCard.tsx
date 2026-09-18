import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { checkIn, stopSession, resumeSession, checkOut, getCustomSignInQuota } from '../../services/attendanceService';
import LiveTimer from './LiveTimer';
import { formatTime, formatDuration } from '../../utils/timeUtils';
import { useAuth } from '../../context/AuthContext';
import { LogIn, LogOut, CheckCircle2, Clock, AlertCircle, Building2, Home, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface AttendanceCardProps {
  attendance: any;
  onRefresh: () => void;
}

const AttendanceCard: React.FC<AttendanceCardProps> = ({ attendance, onRefresh }) => {
  const { user } = useAuth();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Late Sign In / Sign Out modal states
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const [signInMode, setSignInMode] = useState<'NOW' | 'CUSTOM'>('NOW');
  const [customSignInTime, setCustomSignInTime] = useState('09:30');
  const [customSignInQuota, setCustomSignInQuota] = useState<{
    usedCount: number;
    limit: number;
    remainingCount: number;
    canUseCustomSignIn: boolean;
  }>({ usedCount: 0, limit: 3, remainingCount: 3, canUseCustomSignIn: true });

  const [signOutModalOpen, setSignOutModalOpen] = useState(false);
  const [signOutMode, setSignOutMode] = useState<'NOW' | 'CUSTOM'>('NOW');
  const [customSignOutTime, setCustomSignOutTime] = useState('18:30');

  const status = attendance?.status || 'NOT_CHECKED_IN';
  const workMode = attendance?.workMode || user?.workMode || 'WFO';
  
  const getCoordinates = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      // 1. Try high accuracy first (GPS / Satellite)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        },
        (highAccError) => {
          console.warn('High accuracy GPS timed out or unavailable, falling back to network location...', highAccError);
          // 2. Fallback to standard/network accuracy (Wi-Fi / Cell tower - very reliable indoors on mobile)
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
            },
            (lowAccError) => {
              console.error('Mobile location detection failed:', lowAccError);
              resolve(null);
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 }
          );
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });
  };

  const getCurrentIST = () => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(now);
    const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    return { hours, minutes, timeStr };
  };

  useEffect(() => {
    if (status === 'NOT_CHECKED_IN') {
      getCustomSignInQuota()
        .then((res) => {
          if (res) setCustomSignInQuota(res);
        })
        .catch(() => {});
    }
  }, [status]);

  // Called when user clicks "SIGN IN NOW"
  const handleCheckInClick = async () => {
    const { hours, minutes, timeStr } = getCurrentIST();
    // If after 10:15 AM
    if (hours > 10 || (hours === 10 && minutes > 15)) {
      try {
        const quota = await getCustomSignInQuota();
        if (quota) {
          setCustomSignInQuota(quota);
          if (!quota.canUseCustomSignIn) {
            // User reached 3-time monthly quota for earlier sign-in -> proceed with current time check-in directly
            executeCheckIn();
            return;
          }
        }
      } catch (e) {
        // Proceed with modal if check fails
      }
      setSignInMode('NOW');
      setCustomSignInTime(timeStr > '10:00' ? '10:00' : '09:30');
      setSignInModalOpen(true);
    } else {
      executeCheckIn();
    }
  };

  const executeCheckIn = async (customTime?: string) => {
    setLoadingAction('Sign In');
    setError(null);
    try {
      const coords = await getCoordinates();
      await checkIn(coords || undefined, customTime);
      toast.success(customTime ? `Signed in successfully at ${customTime}!` : 'Signed in successfully! Have a great day.');
      setSignInModalOpen(false);
      onRefresh();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to sign in';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoadingAction(null);
    }
  };

  // Called when user clicks "SIGN OUT FOR TODAY"
  const handleCheckOutClick = () => {
    const { hours, minutes, timeStr } = getCurrentIST();
    // If after 7:10 PM (19:10)
    if (hours > 19 || (hours === 19 && minutes > 10)) {
      setSignOutMode('NOW');
      setCustomSignOutTime('18:30');
      setSignOutModalOpen(true);
    } else {
      executeCheckOut();
    }
  };

  const executeCheckOut = async (customTime?: string) => {
    setLoadingAction('Sign Out');
    setError(null);
    try {
      await checkOut(customTime);
      toast.success(customTime ? `Signed out successfully at ${customTime}. Good work today!` : 'Signed out successfully. Good work today!');
      setSignOutModalOpen(false);
      onRefresh();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to sign out';
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

  const { timeStr: currentISTTimeStr } = getCurrentIST();

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
            onClick={handleCheckInClick}
            disabled={loadingAction !== null}
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm rounded-xl shadow-glow-teal active:scale-[0.98] transition-all inline-flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
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
                  onClick={handleCheckOutClick}
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

      {/* Late Sign In Modal (> 10:15 AM) */}
      {signInModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 animate-slide-up space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Sign In Options</h3>
                  <p className="text-xs text-slate-500">Current time is past 10:15 AM ({currentISTTimeStr})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSignInModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Please choose whether you want to sign in with your current time or enter an earlier sign-in time:
            </p>

            <div className="space-y-3">
              <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                signInMode === 'NOW' ? 'bg-teal-50/80 border-teal-300 text-teal-950 font-semibold' : 'bg-slate-50/60 border-slate-200 text-slate-700'
              }`}>
                <input
                  type="radio"
                  name="signInMode"
                  checked={signInMode === 'NOW'}
                  onChange={() => setSignInMode('NOW')}
                  className="mt-0.5 text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">Sign In Now ({currentISTTimeStr})</p>
                  <p className="text-[11px] text-slate-500">Record check-in at the current exact time.</p>
                </div>
              </label>

              {customSignInQuota.canUseCustomSignIn && (
                <label className={`flex flex-col gap-2 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  signInMode === 'CUSTOM' ? 'bg-teal-50/80 border-teal-300 text-teal-950 font-semibold' : 'bg-slate-50/60 border-slate-200 text-slate-700'
                }`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="signInMode"
                      checked={signInMode === 'CUSTOM'}
                      onChange={() => setSignInMode('CUSTOM')}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">Choose Sign In Time (Earlier Time)</p>
                        <span className="text-[10px] font-semibold text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded-full">
                          {customSignInQuota.remainingCount} left this month
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">Select when you actually started work today (e.g. 09:30 AM)</p>
                    </div>
                  </div>

                  {signInMode === 'CUSTOM' && (
                    <div className="pt-2 pl-7">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Select Check-in Time:</label>
                      <input
                        type="time"
                        value={customSignInTime}
                        max={currentISTTimeStr}
                        onChange={(e) => setCustomSignInTime(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono font-bold bg-white rounded-xl border border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  )}
                </label>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSignInModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeCheckIn(signInMode === 'CUSTOM' && customSignInQuota.canUseCustomSignIn ? customSignInTime : undefined)}
                disabled={loadingAction !== null || (signInMode === 'CUSTOM' && customSignInQuota.canUseCustomSignIn && !customSignInTime)}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {loadingAction === 'Sign In' ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{signInMode === 'CUSTOM' && customSignInQuota.canUseCustomSignIn ? `Sign In at ${customSignInTime}` : 'Sign In Now'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Late Sign Out Modal (> 07:10 PM / 19:10) */}
      {signOutModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 animate-slide-up space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Sign Out Options</h3>
                  <p className="text-xs text-slate-500">Current time is past 07:10 PM ({currentISTTimeStr})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSignOutModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Please choose whether you want to sign out with your current time or enter an earlier sign-out time:
            </p>

            <div className="space-y-3">
              <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                signOutMode === 'NOW' ? 'bg-teal-50/80 border-teal-300 text-teal-950 font-semibold' : 'bg-slate-50/60 border-slate-200 text-slate-700'
              }`}>
                <input
                  type="radio"
                  name="signOutMode"
                  checked={signOutMode === 'NOW'}
                  onChange={() => setSignOutMode('NOW')}
                  className="mt-0.5 text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">Sign Out Now ({currentISTTimeStr})</p>
                  <p className="text-[11px] text-slate-500">Record check-out at the current exact time.</p>
                </div>
              </label>

              <label className={`flex flex-col gap-2 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                signOutMode === 'CUSTOM' ? 'bg-teal-50/80 border-teal-300 text-teal-950 font-semibold' : 'bg-slate-50/60 border-slate-200 text-slate-700'
              }`}>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="signOutMode"
                    checked={signOutMode === 'CUSTOM'}
                    onChange={() => setSignOutMode('CUSTOM')}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Choose Sign Out Time (Earlier Time)</p>
                    <p className="text-[11px] text-slate-500">Select when you actually finished work today (e.g. 06:30 PM / 18:30)</p>
                  </div>
                </div>

                {signOutMode === 'CUSTOM' && (
                  <div className="pt-2 pl-7">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Select Check-out Time:</label>
                    <input
                      type="time"
                      value={customSignOutTime}
                      max={currentISTTimeStr}
                      onChange={(e) => setCustomSignOutTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-white rounded-xl border border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                )}
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSignOutModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeCheckOut(signOutMode === 'CUSTOM' ? customSignOutTime : undefined)}
                disabled={loadingAction !== null || (signOutMode === 'CUSTOM' && !customSignOutTime)}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {loadingAction === 'Sign Out' ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{signOutMode === 'CUSTOM' ? `Sign Out at ${customSignOutTime}` : 'Sign Out Now'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default AttendanceCard;
