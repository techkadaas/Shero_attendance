import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  getTeamPermissions,
  updatePermissionStatus,
} from '../../services/permissionService';
import { formatTime12 } from '../../utils/timeUtils';
import {
  Clock,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock4,
  X,
  Search,
  MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const AdminPermissions = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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
      const data = await getTeamPermissions();
      setRequests(data);
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

  const renderTypeBadge = (type?: string) => {
    switch (type) {
      case 'WEEK_OFF':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-50 text-amber-800 border border-amber-300">
            🏖️ Week Off
          </span>
        );
      case 'WFH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
            🏠 WFH
          </span>
        );
      case 'LEAVE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
            🌴 Leave
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-teal-50 text-teal-700 border border-teal-200">
            ⏱️ Permission
          </span>
        );
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

  const filteredRequests = requests.filter((req) => {
    const matchesStatus = filterStatus === 'ALL' || req.status === filterStatus;
    const matchesSearch =
      req.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.reason && req.reason.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-card">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-teal-50 rounded-2xl text-teal-700 border border-teal-100">
            <Clock4 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Permission & WFH Authorization</h1>
            <p className="text-xs text-slate-500 mt-0.5">Review, approve, or reject employee absence & remote work requests</p>
          </div>
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
            {pendingCount} Pending
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
            {approvedCount} Approved
          </span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-subtle">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by employee or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
          />
        </div>

        <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'ALL', label: `All (${requests.length})` },
            { id: 'PENDING', label: `Pending (${pendingCount})` },
            { id: 'APPROVED', label: `Approved (${approvedCount})` },
            { id: 'REJECTED', label: `Rejected (${rejectedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterStatus === tab.id
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block bg-white shadow-card rounded-3xl border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/75">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Timing</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Manager</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400 text-xs">
                    Loading permission requests...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400 text-xs">
                    No requests found matching the filter.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderTypeBadge(req.requestType)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-800 font-bold flex items-center justify-center text-xs border border-teal-100">
                          {req.employeeName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{req.employeeName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{req.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-800">
                      {format(new Date(req.date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-mono">
                      {formatTime12(req.startTime)} – {formatTime12(req.endTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100">
                        {req.totalHoursFormatted || `${req.totalHours} hrs`}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                      {req.managerInfo ? (
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                          <span className="font-medium text-slate-800">{req.managerInfo.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Admin (Direct)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                      {req.reason || <span className="text-slate-400 italic">No reason specified</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      {renderStatusBadge(req.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      {req.status === 'PENDING' ? (
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setReviewModal({ isOpen: true, request: req, status: 'APPROVED', comment: '' })}
                            className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-xl border border-emerald-200 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                          </button>
                          <button
                            onClick={() => setReviewModal({ isOpen: true, request: req, status: 'REJECTED', comment: '' })}
                            className="inline-flex items-center text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-xl border border-rose-200 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          {req.reviewedBy ? `by ${req.reviewedBy.name}` : 'Reviewed'}
                        </span>
                      )}
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
            Loading requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center text-slate-400 text-xs border border-slate-200 shadow-card">
            No permission requests found.
          </div>
        ) : (
          filteredRequests.map((req) => (
            <div key={req._id} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-card space-y-3">
              <div className="flex justify-between items-start pb-2 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {renderTypeBadge(req.requestType)}
                  </div>
                  <p className="font-bold text-slate-900 text-xs">{req.employeeName}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{req.employeeId}</p>
                </div>
                {renderStatusBadge(req.status)}
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Date & Time:</span>
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

              {req.reason && (
                <p className="text-xs text-slate-600">
                  <span className="text-slate-400">Reason: </span>
                  {req.reason}
                </p>
              )}

              {req.status === 'PENDING' && (
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setReviewModal({ isOpen: true, request: req, status: 'APPROVED', comment: '' })}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => setReviewModal({ isOpen: true, request: req, status: 'REJECTED', comment: '' })}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Review Modal */}
      {reviewModal.isOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white w-full rounded-3xl shadow-2xl max-w-md overflow-hidden border border-slate-100 animate-slide-up flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <h3 className="text-sm font-extrabold text-slate-900">
                {reviewModal.status === 'APPROVED' ? 'Approve' : 'Reject'} {reviewModal.request?.requestType || 'Request'}
              </h3>
              <button
                onClick={() => setReviewModal({ isOpen: false, request: null, status: 'APPROVED', comment: '' })}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-2xl text-xs space-y-1.5 border border-slate-100">
                <div className="flex justify-between items-center pb-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Type:</span>
                  {renderTypeBadge(reviewModal.request?.requestType)}
                </div>
                <p><strong className="text-slate-700">Employee:</strong> {reviewModal.request?.employeeName} ({reviewModal.request?.employeeId})</p>
                <p><strong className="text-slate-700">Date:</strong> {reviewModal.request?.date}</p>
                <p>
                  <strong className="text-slate-700">Duration:</strong> {
                    reviewModal.request?.startTime === '09:00' && reviewModal.request?.endTime === '18:00'
                      ? 'Full Day'
                      : `${reviewModal.request?.startTime} – ${reviewModal.request?.endTime} (${reviewModal.request?.totalHoursFormatted || ''})`
                  }
                </p>
                <p><strong className="text-slate-700">Reason:</strong> {reviewModal.request?.reason || 'None'}</p>
              </div>

              {reviewModal.request?.requestType === 'WFH' && reviewModal.status === 'APPROVED' && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-[11px] text-indigo-800">
                  ⭐ <strong>WFH Approval Effect:</strong> The employee's work login is authorized from <strong>{reviewModal.request?.startTime}</strong> and office GPS perimeter is waived on {reviewModal.request?.date}.
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Optional Remark / Comment
                </label>
                <textarea
                  rows={2}
                  placeholder="Add notes for the employee..."
                  value={reviewModal.comment}
                  onChange={(e) => setReviewModal({ ...reviewModal, comment: e.target.value })}
                  className="form-input text-xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setReviewModal({ isOpen: false, request: null, status: 'APPROVED', comment: '' })}
                  className="btn-secondary flex-1 py-2.5 text-xs font-semibold"
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminPermissions;
