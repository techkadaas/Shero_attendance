import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getMyPermissions,
  getTeamPermissions,
  submitPermission,
  updatePermissionStatus,
  calculateDuration,
} from '../../services/permissionService';
import { formatTime12 } from '../../utils/timeUtils';
import {
  Clock,
  Plus,
  X,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock4,
  FileText,
  Calendar,
  Send,
  MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const EmployeePermissions = () => {
  const { user } = useAuth();
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [teamRequests, setTeamRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my' | 'team'>('my');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    date: todayStr,
    startTime: '14:00',
    endTime: '16:00',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Review Modal State
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    request: any;
    status: 'APPROVED' | 'REJECTED';
    comment: string;
  }>({
    isOpen: false,
    request: null,
    status: 'APPROVED',
    comment: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [myRes, teamRes] = await Promise.all([
        getMyPermissions(),
        getTeamPermissions(),
      ]);
      setMyRequests(myRes);
      setTeamRequests(teamRes);
    } catch (error) {
      console.error('Failed to fetch permissions', error);
      toast.error('Failed to load permission requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const durationInfo = calculateDuration(form.startTime, form.endTime);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (durationInfo.diffMins <= 0) {
      toast.error('End time must be after start time');
      return;
    }

    try {
      setSubmitting(true);
      await submitPermission(form);
      toast.success('Permission request submitted successfully!');
      setShowModal(false);
      setForm({
        date: todayStr,
        startTime: '14:00',
        endTime: '16:00',
        reason: '',
      });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async () => {
    if (!reviewModal.request) return;
    try {
      await updatePermissionStatus(reviewModal.request._id, {
        status: reviewModal.status,
        managerComment: reviewModal.comment,
      });
      toast.success(`Permission request ${reviewModal.status.toLowerCase()}!`);
      setReviewModal({ isOpen: false, request: null, status: 'APPROVED', comment: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 mr-1 text-rose-600" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock4 className="w-3 h-3 mr-1 text-amber-600" />
            Pending Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-card">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-teal-50 rounded-2xl text-teal-700 border border-teal-100">
            <Clock4 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Permission Management</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit short absence permissions and manage supervisor sign-offs
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn-primary w-full sm:w-auto shadow-glow-teal"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Request Permission
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 max-w-md">
        <button
          onClick={() => setActiveTab('my')}
          className={`flex-1 flex items-center justify-center py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'my'
              ? 'bg-white text-teal-700 shadow-sm border border-slate-200/50'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5 mr-1.5" />
          My Requests ({myRequests.length})
        </button>

        {teamRequests.length > 0 && (
          <button
            onClick={() => setActiveTab('team')}
            className={`flex-1 flex items-center justify-center py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'team'
                ? 'bg-white text-teal-700 shadow-sm border border-slate-200/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 mr-1.5" />
            Team Approvals ({teamRequests.length})
            {teamRequests.some((r) => r.status === 'PENDING') && (
              <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {teamRequests.filter((r) => r.status === 'PENDING').length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* TAB 1: My Requests */}
      {activeTab === 'my' && (
        <>
          {loading ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-card">
              <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : myRequests.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-card space-y-3">
              <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto border border-teal-100">
                <Clock className="w-7 h-7" />
              </div>
              <p className="font-bold text-slate-800 text-sm">No permission requests submitted yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Need short leave or time off for an errand? Click "Request Permission" to alert your supervisor.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary mt-2"
              >
                <Plus className="w-4 h-4 mr-1" /> New Permission
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block bg-white shadow-card rounded-3xl border border-slate-200/80 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/75">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Timing</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Duration</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Manager</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Reason</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {myRequests.map((req) => (
                        <tr key={req._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-900">
                            {format(new Date(req.date), 'EEE, dd MMM yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-700">
                            <span className="font-mono">{formatTime12(req.startTime)}</span> – <span className="font-mono">{formatTime12(req.endTime)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-teal-50 text-teal-800 border border-teal-100 font-mono">
                              <Clock className="w-3 h-3 mr-1 text-teal-600" />
                              {req.totalHoursFormatted || `${req.totalHours} hrs`}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                            {req.managerInfo ? (
                              <div className="flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                                <span className="font-semibold text-slate-800">{req.managerInfo.name}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Admin</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                            {req.reason || <span className="text-slate-400 italic">No reason provided</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                            {renderStatusBadge(req.status)}
                            {req.managerComment && (
                              <p className="text-[10px] text-slate-500 mt-1 italic flex items-center justify-end gap-1">
                                <MessageSquare className="w-2.5 h-2.5 text-slate-400" />
                                "{req.managerComment}"
                              </p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-3">
                {myRequests.map((req) => (
                  <div key={req._id} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-card space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{format(new Date(req.date), 'EEE, dd MMM yyyy')}</p>
                        <p className="text-xs font-mono text-slate-500 mt-0.5">
                          {formatTime12(req.startTime)} – {formatTime12(req.endTime)}
                        </p>
                      </div>
                      {renderStatusBadge(req.status)}
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Duration:</span>
                      <span className="font-mono font-bold text-teal-700">
                        {req.totalHoursFormatted || `${req.totalHours} hrs`}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      {req.reason && (
                        <p className="text-[11px]">
                          <span className="text-slate-400">Reason: </span>
                          <span className="text-slate-800">{req.reason}</span>
                        </p>
                      )}
                      {req.managerComment && (
                        <p className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-xl border border-amber-200 mt-1">
                          <strong>Manager Remark:</strong> {req.managerComment}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* TAB 2: Team Approvals */}
      {activeTab === 'team' && (
        <>
          {teamRequests.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center text-slate-400 text-xs border border-slate-200 shadow-card">
              No permission requests received from your team.
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block bg-white shadow-card rounded-3xl border border-slate-200/80 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/75">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Employee</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Timing</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Duration</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Reason</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {teamRequests.map((req) => (
                        <tr key={req._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-xs">
                            <p className="font-bold text-slate-900">{req.employeeName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{req.employeeId}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-800">
                            {format(new Date(req.date), 'dd MMM yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-mono">
                            {formatTime12(req.startTime)} – {formatTime12(req.endTime)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs">
                            <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-100">
                              {req.totalHoursFormatted || `${req.totalHours} hrs`}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                            {req.reason || <span className="text-slate-400 italic">No reason</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs">
                            {renderStatusBadge(req.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                            {req.status === 'PENDING' ? (
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => setReviewModal({ isOpen: true, request: req, status: 'APPROVED', comment: '' })}
                                  className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                                </button>
                                <button
                                  onClick={() => setReviewModal({ isOpen: true, request: req, status: 'REJECTED', comment: '' })}
                                  className="inline-flex items-center text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors"
                                >
                                  <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Reviewed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-3">
                {teamRequests.map((req) => (
                  <div key={req._id} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-card space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{req.employeeName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{req.employeeId}</p>
                      </div>
                      {renderStatusBadge(req.status)}
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Timing:</span>
                        <span className="font-mono text-slate-800">
                          {format(new Date(req.date), 'dd MMM')} • {formatTime12(req.startTime)} – {formatTime12(req.endTime)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Duration:</span>
                        <span className="font-mono font-bold text-teal-700">
                          {req.totalHoursFormatted || `${req.totalHours} hrs`}
                        </span>
                      </div>
                    </div>

                    {req.status === 'PENDING' && (
                      <div className="flex gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => setReviewModal({ isOpen: true, request: req, status: 'APPROVED', comment: '' })}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => setReviewModal({ isOpen: true, request: req, status: 'REJECTED', comment: '' })}
                          className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Request Permission Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full sm:rounded-3xl shadow-2xl sm:max-w-lg relative max-h-screen overflow-y-auto border border-slate-100 animate-slide-up">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2.5 bg-teal-50 rounded-xl text-teal-700">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">New Permission Request</h2>
                  <p className="text-[11px] text-slate-400">Specify date and start/end time</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-teal-50/70 rounded-2xl border border-teal-100/80 text-xs">
                <p className="text-teal-900 font-bold flex items-center">
                  <UserCheck className="w-4 h-4 mr-1.5 text-teal-600" />
                  Routing to Approver:
                </p>
                <p className="text-teal-800 text-[11px] mt-0.5 pl-5">
                  {user?.reportingManager ? `${user.reportingManager.name} (${user.reportingManager.employeeId})` : 'Company Administrator'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Date</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Start Time</label>
                  <input
                    type="time"
                    required
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">End Time</label>
                  <input
                    type="time"
                    required
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Dynamic Live Duration Indicator */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between transition-colors ${
                  durationInfo.diffMins > 0
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Clock4 className={`w-4 h-4 ${durationInfo.diffMins > 0 ? 'text-teal-600' : 'text-rose-500'}`} />
                  <span className="text-xs font-semibold text-slate-600">Calculated Duration:</span>
                </div>
                <span className={`text-xs font-mono font-black ${durationInfo.diffMins > 0 ? 'text-teal-700' : 'text-rose-600'}`}>
                  {durationInfo.diffMins > 0 ? `${durationInfo.formatted} (${durationInfo.decimalHours} hrs)` : 'Invalid timing'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Reason for Permission</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why you are requesting permission (e.g., Doctor appointment, emergency errand)..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || durationInfo.diffMins <= 0}
                  className="w-full btn-primary py-3.5 shadow-glow-teal"
                >
                  <Send className="w-4 h-4 mr-1.5" />
                  {submitting ? 'Submitting Request...' : 'Send Permission Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white w-full rounded-3xl shadow-2xl max-w-md relative p-6 space-y-4 border border-slate-100 animate-slide-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                {reviewModal.status === 'APPROVED' ? 'Approve' : 'Reject'} Permission Request
              </h3>
              <button
                onClick={() => setReviewModal({ isOpen: false, request: null, status: 'APPROVED', comment: '' })}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl text-xs space-y-1 border border-slate-100">
              <p><strong className="text-slate-700">Employee:</strong> {reviewModal.request?.employeeName} ({reviewModal.request?.employeeId})</p>
              <p><strong className="text-slate-700">Date:</strong> {reviewModal.request?.date}</p>
              <p><strong className="text-slate-700">Duration:</strong> {reviewModal.request?.totalHoursFormatted}</p>
              <p><strong className="text-slate-700">Reason:</strong> {reviewModal.request?.reason || 'None'}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Manager Remark / Note (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Enter feedback or notes for the employee..."
                value={reviewModal.comment}
                onChange={(e) => setReviewModal({ ...reviewModal, comment: e.target.value })}
                className="form-input text-xs"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setReviewModal({ isOpen: false, request: null, status: 'APPROVED', comment: '' })}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                className={`flex-1 py-2.5 text-white font-bold text-xs rounded-xl shadow-sm transition-all ${
                  reviewModal.status === 'APPROVED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirm {reviewModal.status === 'APPROVED' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeePermissions;
