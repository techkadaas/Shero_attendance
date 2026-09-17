import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Eye, EyeOff, X, Calendar, Plus, IndianRupee, Edit, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminEmployees = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const initialForm = {
    name: '',
    email: '',
    password: '',
    employeeId: '',
    status: 'ACTIVE',
    reportingManagerId: '',
    basicSalary: '',
    grossSalary: '',
    pfApplicable: false,
    esiApplicable: false,
    otherDeductions: '',
  };
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const initialSalaryData = { basicSalary: '', grossSalary: '', pfApplicable: false, esiApplicable: false, otherDeductions: '' };
  const [salaryModal, setSalaryModal] = useState<{ isOpen: boolean; employee: any; data: any }>({ isOpen: false, employee: null, data: initialSalaryData });

  const [managerModal, setManagerModal] = useState<{ isOpen: boolean; employee: any; reportingManagerId: string }>({
    isOpen: false,
    employee: null,
    reportingManagerId: '',
  });

  const viewAttendanceHistory = (emp: any) => {
    navigate(`/admin/employees/${emp.employeeId}/attendance`);
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const [empRes, mgrRes] = await Promise.all([
        api.get('/admin/employees'),
        api.get('/admin/managers'),
      ]);
      setEmployees(empRes.data);
      setManagers(mgrRes.data);
    } catch (error) {
      console.error('Failed to fetch employees/managers', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setSalaryModal({ ...salaryModal, data: { ...salaryModal.data, [e.target.name]: value } });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      await api.post('/admin/employees', form);
      toast.success('Employee created successfully!');
      setForm(initialForm);
      setShowForm(false);
      fetchEmployees();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.error || 'Failed to create employee', type: 'error' });
    }
  };

  const handleUpdateSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryModal.employee) return;
    try {
      await api.put(`/admin/employees/${salaryModal.employee._id}/salary`, salaryModal.data);
      toast.success('Salary updated successfully!');
      setSalaryModal({ isOpen: false, employee: null, data: initialSalaryData });
      fetchEmployees();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update salary');
    }
  };

  const openSalaryModal = (emp: any) => {
    setSalaryModal({
      isOpen: true,
      employee: emp,
      data: {
        basicSalary: emp.basicSalary || '',
        grossSalary: emp.grossSalary || '',
        pfApplicable: emp.pfApplicable || false,
        esiApplicable: emp.esiApplicable || false,
        otherDeductions: emp.otherDeductions || '',
      },
    });
  };

  const openManagerModal = (emp: any) => {
    setManagerModal({
      isOpen: true,
      employee: emp,
      reportingManagerId: emp.reportingManager?.id || emp.reportingManagerId || '',
    });
  };

  const handleUpdateManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerModal.employee) return;
    try {
      await api.put(`/admin/employees/${managerModal.employee._id}/manager`, {
        reportingManagerId: managerModal.reportingManagerId || null,
      });
      toast.success('Reporting manager assigned successfully!');
      setManagerModal({ isOpen: false, employee: null, reportingManagerId: '' });
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to assign reporting manager');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Employees Directory</h1>
          <p className="mt-1 text-sm text-gray-500">Manage all employees and assign reporting managers</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center justify-center bg-teal-600 text-white px-4 py-2.5 rounded-lg hover:bg-teal-700 font-medium text-sm transition-colors w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add Employee
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* Create Employee Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:rounded-xl shadow-lg sm:max-w-2xl relative max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Create Employee</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input name="name" required placeholder="John Doe" value={form.name} onChange={handleChange} className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input name="email" required placeholder="john@company.com" type="email" value={form.email} onChange={handleChange} className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <input name="password" required placeholder="••••••••" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange} className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <input name="employeeId" required placeholder="EMP001" value={form.employeeId} onChange={handleChange} className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select name="status" value={form.status} onChange={handleChange} className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reporting Manager</label>
                  <select
                    name="reportingManagerId"
                    value={form.reportingManagerId}
                    onChange={handleChange}
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="">None (No Manager)</option>
                    {managers.map((mgr) => (
                      <option key={mgr._id} value={mgr._id}>
                        {mgr.name} ({mgr.employeeId}) {mgr.role === 'ADMIN' ? '— Admin' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <h3 className="text-sm font-bold text-gray-900 border-b pb-2 pt-4">Payroll Configuration</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gross Salary (Monthly)</label>
                  <input name="grossSalary" type="number" required placeholder="e.g. 50000" value={form.grossSalary} onChange={handleChange} className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Basic Salary (Monthly)</label>
                  <input name="basicSalary" type="number" required placeholder="e.g. 25000" value={form.basicSalary} onChange={handleChange} className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Other Deductions (Fixed Amount)</label>
                  <input name="otherDeductions" type="number" placeholder="e.g. 500" value={form.otherDeductions} onChange={handleChange} className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>
              <div className="flex gap-6 pt-2">
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input type="checkbox" name="pfApplicable" checked={form.pfApplicable} onChange={handleChange} className="rounded text-teal-600 focus:ring-teal-500" />
                  <span>PF Applicable</span>
                </label>
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input type="checkbox" name="esiApplicable" checked={form.esiApplicable} onChange={handleChange} className="rounded text-teal-600 focus:ring-teal-500" />
                  <span>ESI Applicable</span>
                </label>
              </div>

              <button type="submit" className="w-full bg-teal-600 text-white py-2.5 px-4 rounded-lg hover:bg-teal-700 font-medium text-sm transition-colors mt-4">
                Create Employee
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Salary Modal */}
      {salaryModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full rounded-xl shadow-lg max-w-lg relative max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Configure Salary & Statutory</h2>
              <button onClick={() => setSalaryModal({ isOpen: false, employee: null, data: initialSalaryData })} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateSalary} className="p-5 space-y-4">
              <p className="text-sm text-gray-500 mb-3">Updating configuration for <span className="font-semibold text-gray-900">{salaryModal.employee?.name}</span></p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gross Salary (Monthly)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><IndianRupee className="h-4 w-4 text-gray-400" /></div>
                    <input name="grossSalary" required type="number" min="0" value={salaryModal.data.grossSalary} onChange={handleSalaryChange} className="w-full border border-gray-300 pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Basic Salary (Monthly)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><IndianRupee className="h-4 w-4 text-gray-400" /></div>
                    <input name="basicSalary" required type="number" min="0" value={salaryModal.data.basicSalary} onChange={handleSalaryChange} className="w-full border border-gray-300 pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Other Deductions (Fixed Amount)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><IndianRupee className="h-4 w-4 text-gray-400" /></div>
                    <input name="otherDeductions" type="number" min="0" value={salaryModal.data.otherDeductions} onChange={handleSalaryChange} className="w-full border border-gray-300 pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-6 pt-2">
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input type="checkbox" name="pfApplicable" checked={salaryModal.data.pfApplicable} onChange={handleSalaryChange} className="rounded text-teal-600 focus:ring-teal-500" />
                  <span>PF Applicable</span>
                </label>
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input type="checkbox" name="esiApplicable" checked={salaryModal.data.esiApplicable} onChange={handleSalaryChange} className="rounded text-teal-600 focus:ring-teal-500" />
                  <span>ESI Applicable</span>
                </label>
              </div>

              <button type="submit" className="w-full bg-teal-600 text-white py-2.5 px-4 rounded-lg hover:bg-teal-700 font-medium text-sm transition-colors mt-4">
                Save Configuration
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Assign Reporting Manager Modal */}
      {managerModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full rounded-xl shadow-lg max-w-md relative max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-teal-50 rounded-lg text-teal-600">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Assign Reporting Manager</h2>
              </div>
              <button
                onClick={() => setManagerModal({ isOpen: false, employee: null, reportingManagerId: '' })}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateManager} className="p-5 space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                <p className="text-gray-500 text-xs">Employee</p>
                <p className="font-semibold text-gray-900">{managerModal.employee?.name} <span className="font-normal text-gray-500">({managerModal.employee?.employeeId})</span></p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Reporting Manager</label>
                <select
                  value={managerModal.reportingManagerId}
                  onChange={(e) => setManagerModal({ ...managerModal, reportingManagerId: e.target.value })}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="">-- No Reporting Manager (Unassigned) --</option>
                  {managers
                    .filter((m) => m._id !== managerModal.employee?._id)
                    .map((mgr) => (
                      <option key={mgr._id} value={mgr._id}>
                        {mgr.name} ({mgr.employeeId}) {mgr.role === 'ADMIN' ? '— Admin' : ''}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-1.5">
                  The selected manager will be designated as the supervisor for this employee.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setManagerModal({ ...managerModal, reportingManagerId: '' })}
                  className="px-4 py-2.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Clear Manager
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-teal-600 text-white py-2.5 px-4 rounded-lg hover:bg-teal-700 font-medium text-sm transition-colors"
                >
                  Save Reporting Manager
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden sm:block bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reporting Manager</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Salary</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-sm">Loading employees...</td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-sm">No employees found.</td></tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-900 font-mono font-medium">{emp.employeeId}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{emp.name}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500">{emp.email}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm">
                      {emp.reportingManager ? (
                        <div className="flex items-center space-x-1.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-50 text-teal-800 border border-teal-200">
                            <UserCheck className="w-3 h-3 mr-1 text-teal-600" />
                            {emp.reportingManager.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {emp.grossSalary ? `₹${emp.grossSalary.toLocaleString()}` : <span className="text-gray-400">Not set</span>}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-md ${
                        emp.status === 'ACTIVE' ? 'bg-gray-100 text-gray-700' : 
                        emp.status === 'WORKING' ? 'bg-green-100 text-green-700' :
                        emp.status === 'STOPPED' ? 'bg-yellow-100 text-yellow-700' :
                        emp.status === 'CHECKED_OUT' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {emp.status === 'STOPPED' ? 'LEAVE' : emp.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right space-x-2">
                      <button onClick={() => openManagerModal(emp)}
                        className="inline-flex items-center text-xs text-gray-600 hover:text-teal-600 font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                        title="Assign / Change Reporting Manager">
                        <UserCheck className="w-3.5 h-3.5 mr-1 text-teal-600" /> Manager
                      </button>
                      <button onClick={() => openSalaryModal(emp)}
                        className="inline-flex items-center text-xs text-gray-600 hover:text-teal-600 font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors">
                        <Edit className="w-3.5 h-3.5 mr-1" /> Salary
                      </button>
                      <button onClick={() => viewAttendanceHistory(emp)}
                        className="inline-flex items-center text-xs text-teal-600 hover:text-teal-900 font-medium px-2 py-1 rounded hover:bg-teal-50 transition-colors">
                        <Calendar className="w-3.5 h-3.5 mr-1" /> Attendance
                      </button>
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
          <div className="bg-white rounded-xl p-6 text-center text-gray-500 text-sm border border-gray-200">Loading employees...</div>
        ) : employees.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center text-gray-500 text-sm border border-gray-200">No employees found.</div>
        ) : (
          employees.map((emp) => (
            <div key={emp._id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-gray-900">{emp.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{emp.email}</p>
                </div>
                <span className={`px-2.5 py-0.5 inline-flex text-xs font-semibold rounded-md ${
                  emp.status === 'ACTIVE' ? 'bg-gray-100 text-gray-700' : 
                  emp.status === 'WORKING' ? 'bg-green-100 text-green-700' :
                  emp.status === 'STOPPED' ? 'bg-yellow-100 text-yellow-700' :
                  emp.status === 'CHECKED_OUT' ? 'bg-blue-100 text-blue-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {emp.status === 'STOPPED' ? 'LEAVE' : emp.status}
                </span>
              </div>

              <div className="space-y-1 my-2 py-2 border-y border-gray-100 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Reporting Manager:</span>
                  <span className="font-medium text-gray-800">
                    {emp.reportingManager ? (
                      <span className="text-teal-700">{emp.reportingManager.name} ({emp.reportingManager.employeeId})</span>
                    ) : (
                      <span className="text-gray-400 italic">Unassigned</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Gross Salary:</span>
                  <span className="font-medium text-gray-900">{emp.grossSalary ? `₹${emp.grossSalary.toLocaleString()}` : 'Not set'}</span>
                </div>
              </div>

              <div className="flex justify-between items-center mt-3 pt-2">
                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">{emp.employeeId}</span>
                <div className="space-x-1.5 flex">
                  <button onClick={() => openManagerModal(emp)}
                    className="inline-flex items-center text-xs text-gray-700 hover:text-teal-600 font-medium px-2 py-1 rounded bg-gray-50 hover:bg-gray-100 border border-gray-200">
                    <UserCheck className="w-3 h-3 mr-1 text-teal-600" /> Manager
                  </button>
                  <button onClick={() => openSalaryModal(emp)}
                    className="inline-flex items-center text-xs text-gray-700 hover:text-teal-600 font-medium px-2 py-1 rounded bg-gray-50 hover:bg-gray-100 border border-gray-200">
                    <Edit className="w-3 h-3 mr-1" /> Salary
                  </button>
                  <button onClick={() => viewAttendanceHistory(emp)}
                    className="inline-flex items-center text-xs text-teal-700 hover:text-teal-900 font-medium px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 border border-teal-200">
                    <Calendar className="w-3 h-3 mr-1" /> History
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminEmployees;
