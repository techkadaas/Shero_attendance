import React, { useEffect, useState } from 'react';
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

  const filteredRequests = requests.filter((req) => {
    const matchesStatus = filterStatus === 'ALL' || req.status === filterStatus;
    const matchesSearch =
      req.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.reason?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Permission Requests</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and review employee permissions and total hours across the organization
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by employee name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          >
            <option value="ALL">All Statuses ({requests.length})</option>
            <option value="PENDING">Pending ({requests.filter((r) => r.status === 'PENDING').length})</option>
            <option value="APPROVED">Approved ({requests.filter((r) => r.status === 'APPROVED').length})</option>
            <option value="REJECTED">Rejected ({requests.filter((r) => r.status === 'REJECTED').length})</option>
          </select>
        </div>
      </div>

      {/* Content Table / Cards */}
      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500 text-sm border border-gray-200">
          Loading permission requests...
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center border border-gray-200 shadow-sm space-y-2">
          <Clock className="w-10 h-10 text-gray-300 mx-auto" />
          <p className="font-semibold text-gray-800">No permission requests match your filter</p>
          <p className="text-xs text-gray-500">All submitted employee permissions will be listed here.</p>
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
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reporting Manager</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timing</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRequests.map((req) => (
                    <tr key={req._id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 whitespace-nowrap text-sm">
                        <p className="font-semibold text-gray-900">{req.employeeName}</p>
                        <p className="text-xs text-gray-500 font-mono">{req.employeeId}</p>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">
                        {req.managerInfo ? (
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-teal-600" />
                            <span className="font-medium text-gray-800">{req.managerInfo.name}</span>
                            <span className="text-xs text-gray-400">({req.managerInfo.employeeId})</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Unassigned (Direct)</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {format(new Date(req.date), 'dd MMM yyyy')}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                        {formatTime12(req.startTime)} – {formatTime12(req.endTime)}
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
            {filteredRequests.map((req) => (
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
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Manager:</span>
                    <span className="font-medium text-gray-700">
                      {req.managerInfo ? req.managerInfo.name : 'Unassigned'}
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
                Optional Admin Note / Comment
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

export default AdminPermissions;
