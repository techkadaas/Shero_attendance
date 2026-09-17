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
  AlertCircle,
  FileText,
  Calendar,
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

  // Review Modal State (For Approving/Rejecting)
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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-600" />
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3.5 h-3.5 mr-1 text-red-600" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock4 className="w-3.5 h-3.5 mr-1 text-amber-600" />
            Pending Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Permission Requests</h1>
          <p className="mt-1 text-sm text-gray-500">
            Request permissions and track approval from your reporting manager
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center bg-teal-600 text-white px-4 py-2.5 rounded-lg hover:bg-teal-700 font-medium text-sm transition-colors w-full sm:w-auto shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Request Permission
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 space-x-6">
        <button
          onClick={() => setActiveTab('my')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'my'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          My Requests ({myRequests.length})
        </button>

        {teamRequests.length > 0 && (
          <button
            onClick={() => setActiveTab('team')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'team'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Team Approvals ({teamRequests.length})
            {teamRequests.some((r) => r.status === 'PENDING') && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
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
            <div className="bg-white rounded-xl p-8 text-center text-gray-500 text-sm border border-gray-200">
              Loading requests...
            </div>
          ) : myRequests.length === 0 ? (
            <div className="bg-white rounded-xl p-10 text-center border border-gray-200 shadow-sm space-y-3">
              <Clock className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="font-semibold text-gray-800">No permission requests submitted yet</p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Need short permission for personal errands or appointments? Click the "Request Permission" button above.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center text-sm font-medium text-teal-600 hover:text-teal-800"
              >
                <Plus className="w-4 h-4 mr-1" /> Create your first request
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timing</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reporting Manager</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                        <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {myRequests.map((req) => (
                        <tr key={req._id} className="hover:bg-gray-50">
                          <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {format(new Date(req.date), 'dd MMM yyyy')}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">
                            <span className="font-mono">{formatTime12(req.startTime)}</span> – <span className="font-mono">{formatTime12(req.endTime)}</span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                              <Clock className="w-3 h-3 mr-1 text-teal-600" />
                              {req.totalHoursFormatted || `${req.totalHours} hrs`} ({req.totalHours}h)
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">
                            {req.managerInfo ? (
                              <div className="flex items-center gap-1.5">
                                <UserCheck className="w-4 h-4 text-teal-600" />
                                <span className="font-medium text-gray-800">{req.managerInfo.name}</span>
                                <span className="text-xs text-gray-400">({req.managerInfo.employeeId})</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs italic">Admin</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600 max-w-xs truncate">
                            {req.reason || <span className="text-gray-400 italic">No reason provided</span>}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-right text-sm">
                            {renderStatusBadge(req.status)}
                            {req.managerComment && (
                              <p className="text-[11px] text-gray-500 mt-1 italic">"{req.managerComment}"</p>
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
                  <div key={req._id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{format(new Date(req.date), 'dd MMM yyyy')}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatTime12(req.startTime)} – {formatTime12(req.endTime)}
                        </p>
                      </div>
                      {renderStatusBadge(req.status)}
                    </div>

                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex justify-between items-center text-xs">
                      <span className="text-gray-500">Total Duration:</span>
                      <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {req.totalHoursFormatted || `${req.totalHours} hrs`} ({req.totalHours} hrs)
                      </span>
                    </div>

                    <div className="text-xs text-gray-600 space-y-1">
                      <p>
                        <span className="text-gray-400">Manager: </span>
                        {req.managerInfo ? `${req.managerInfo.name} (${req.managerInfo.employeeId})` : 'Admin'}
                      </p>
                      {req.reason && (
                        <p>
                          <span className="text-gray-400">Reason: </span>
                          <span className="text-gray-800">{req.reason}</span>
                        </p>
                      )}
                      {req.managerComment && (
                        <p className="text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200 mt-1">
                          <strong>Note:</strong> {req.managerComment}
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

      {/* TAB 2: Team Approvals (Received Requests) */}
      {activeTab === 'team' && (
        <>
          {teamRequests.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-gray-500 text-sm border border-gray-200">
              No permission requests received from your team.
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timing</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {teamRequests.map((req) => (
                        <tr key={req._id} className="hover:bg-gray-50">
                          <td className="px-5 py-4 whitespace-nowrap text-sm">
                            <p className="font-semibold text-gray-900">{req.employeeName}</p>
                            <p className="text-xs text-gray-500 font-mono">{req.employeeId}</p>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {format(new Date(req.date), 'dd MMM yyyy')}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">
                            <span className="font-mono">{formatTime12(req.startTime)}</span> – <span className="font-mono">{formatTime12(req.endTime)}</span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                              <Clock className="w-3 h-3 mr-1 text-teal-600" />
                              {req.totalHoursFormatted || `${req.totalHours} hrs`} ({req.totalHours}h)
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600 max-w-xs truncate">
                            {req.reason || <span className="text-gray-400 italic">No reason</span>}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm">
                            {renderStatusBadge(req.status)}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-right space-x-2">
                            {req.status === 'PENDING' ? (
                              <>
                                <button
                                  onClick={() => setReviewModal({ isOpen: true, request: req, status: 'APPROVED', comment: '' })}
                                  className="inline-flex items-center text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-lg border border-green-200 transition-colors"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                                </button>
                                <button
                                  onClick={() => setReviewModal({ isOpen: true, request: req, status: 'REJECTED', comment: '' })}
                                  className="inline-flex items-center text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg border border-red-200 transition-colors"
                                >
                                  <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Reviewed</span>
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
                  <div key={req._id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{req.employeeName}</p>
                        <p className="text-xs text-gray-500 font-mono">{req.employeeId}</p>
                      </div>
                      {renderStatusBadge(req.status)}
                    </div>

                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Date & Time:</span>
                        <span className="font-medium text-gray-800">
                          {format(new Date(req.date), 'dd MMM')} • {formatTime12(req.startTime)} – {formatTime12(req.endTime)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Total Hours:</span>
                        <span className="font-bold text-teal-700">
                          {req.totalHoursFormatted || `${req.totalHours} hrs`} ({req.totalHours} hrs)
                        </span>
                      </div>
                    </div>

                    {req.reason && (
                      <p className="text-xs text-gray-600">
                        <span className="text-gray-400">Reason: </span>
                        {req.reason}
                      </p>
                    )}

                    {req.status === 'PENDING' && (
                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => setReviewModal({ isOpen: true, request: req, status: 'APPROVED', comment: '' })}
                          className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => setReviewModal({ isOpen: true, request: req, status: 'REJECTED', comment: '' })}
                          className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:rounded-2xl shadow-xl sm:max-w-lg relative max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-teal-50 rounded-lg text-teal-600">
                  <Clock className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Request Permission</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Reporting Manager Info */}
              <div className="p-3.5 bg-teal-50/70 rounded-xl border border-teal-100 text-xs space-y-1">
                <p className="text-teal-900 font-semibold flex items-center">
                  <UserCheck className="w-4 h-4 mr-1 text-teal-600 inline" />
                  Approval Request Will Be Sent To:
                </p>
                {user?.reportingManager ? (
                  <p className="text-teal-800 font-medium pl-5">
                    {user.reportingManager.name} ({user.reportingManager.employeeId})
                  </p>
                ) : (
                  <p className="text-teal-700 italic pl-5">
                    Admin / System Supervisor (No direct reporting manager assigned)
                  </p>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Start & End Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Live Total Hours Indicator */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                  durationInfo.diffMins > 0
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Clock4
                    className={`w-4 h-4 ${
                      durationInfo.diffMins > 0 ? 'text-teal-600' : 'text-red-500'
                    }`}
                  />
                  <span className="text-xs font-medium text-gray-600">Total Requested Duration:</span>
                </div>
                <span
                  className={`text-sm font-bold ${
                    durationInfo.diffMins > 0 ? 'text-teal-700' : 'text-red-600'
                  }`}
                >
                  {durationInfo.diffMins > 0
                    ? `${durationInfo.formatted} (${durationInfo.decimalHours} hrs)`
                    : 'Invalid time selection'}
                </span>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Note</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why you are requesting permission (e.g., Doctor appointment, urgent family errand)..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || durationInfo.diffMins <= 0}
                  className="w-full bg-teal-600 text-white py-2.5 px-4 rounded-xl hover:bg-teal-700 font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {submitting ? 'Submitting...' : 'Submit Permission Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full rounded-2xl shadow-xl max-w-md relative p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">
                {reviewModal.status === 'APPROVED' ? 'Approve' : 'Reject'} Permission
              </h3>
              <button
                onClick={() => setReviewModal({ isOpen: false, request: null, status: 'APPROVED', comment: '' })}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-1">
              <p><strong>Employee:</strong> {reviewModal.request?.employeeName} ({reviewModal.request?.employeeId})</p>
              <p><strong>Date:</strong> {reviewModal.request?.date}</p>
              <p><strong>Duration:</strong> {reviewModal.request?.totalHoursFormatted} ({reviewModal.request?.totalHours} hrs)</p>
              <p><strong>Reason:</strong> {reviewModal.request?.reason || 'None'}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Optional Manager Note / Comment
              </label>
              <textarea
                rows={2}
                placeholder="Add a remark for the employee..."
                value={reviewModal.comment}
                onChange={(e) => setReviewModal({ ...reviewModal, comment: e.target.value })}
                className="w-full border border-gray-300 p-2 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setReviewModal({ isOpen: false, request: null, status: 'APPROVED', comment: '' })}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                className={`flex-1 py-2 text-white rounded-xl text-xs font-semibold transition-colors ${
                  reviewModal.status === 'APPROVED'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
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
