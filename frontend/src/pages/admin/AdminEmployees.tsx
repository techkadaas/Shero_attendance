import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Eye, EyeOff, X, Calendar, Plus, IndianRupee, Edit, UserCheck, UserCog, Search, ShieldCheck, Users, Building2, Home } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminEmployees = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const initialForm = {
    name: '',
    email: '',
    password: '',
    employeeId: '',
    status: 'ACTIVE',
    workMode: 'WFO',
    reportingManagerId: '',
    basicSalary: '',
    grossSalary: '',
    pfApplicable: false,
    esiApplicable: false,
    otherDeductions: '',
  };
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Edit Employee State
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    employee: any;
    form: typeof initialForm;
    showPassword: boolean;
  }>({
    isOpen: false,
    employee: null,
    form: initialForm,
    showPassword: false,
  });

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
      toast.error('Failed to load employee directory');
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

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setEditModal({
      ...editModal,
      form: { ...editModal.form, [e.target.name]: value },
    });
  };

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setSalaryModal({ ...salaryModal, data: { ...salaryModal.data, [e.target.name]: value } });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/employees', form);
      toast.success('Employee created successfully!');
      setForm(initialForm);
      setShowForm(false);
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create employee');
    }
  };

  const openEditModal = (emp: any) => {
    setEditModal({
      isOpen: true,
      employee: emp,
      showPassword: false,
      form: {
        name: emp.name || '',
        email: emp.email || '',
        password: '',
        employeeId: emp.employeeId || '',
        status: emp.status || 'ACTIVE',
        workMode: emp.workMode || 'WFO',
        reportingManagerId: emp.reportingManager?.id || emp.reportingManagerId || '',
        basicSalary: emp.basicSalary !== undefined ? String(emp.basicSalary) : '',
        grossSalary: emp.grossSalary !== undefined ? String(emp.grossSalary) : '',
        pfApplicable: Boolean(emp.pfApplicable),
        esiApplicable: Boolean(emp.esiApplicable),
        otherDeductions: emp.otherDeductions !== undefined ? String(emp.otherDeductions) : '',
      },
    });
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.employee) return;
    try {
      await api.put(`/admin/employees/${editModal.employee._id}`, editModal.form);
      toast.success('Employee updated successfully!');
      setEditModal({ isOpen: false, employee: null, form: initialForm, showPassword: false });
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update employee');
    }
  };

  const handleUpdateSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryModal.employee) return;
    try {
      await api.put(`/admin/employees/${salaryModal.employee._id}/salary`, salaryModal.data);
      toast.success('Salary configuration saved successfully!');
      setSalaryModal({ isOpen: false, employee: null, data: initialSalaryData });
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update salary');
    }
  };

  const openSalaryModal = (emp: any) => {
    setSalaryModal({
      isOpen: true,
      employee: emp,
      data: {
        basicSalary: emp.basicSalary !== undefined ? String(emp.basicSalary) : '',
        grossSalary: emp.grossSalary !== undefined ? String(emp.grossSalary) : '',
        pfApplicable: Boolean(emp.pfApplicable),
        esiApplicable: Boolean(emp.esiApplicable),
        otherDeductions: emp.otherDeductions !== undefined ? String(emp.otherDeductions) : '',
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
      toast.success('Reporting manager updated!');
      setManagerModal({ isOpen: false, employee: null, reportingManagerId: '' });
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update reporting manager');
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'ALL') return matchesSearch;
    if (statusFilter === 'WFO') return matchesSearch && (emp.workMode === 'WFO' || !emp.workMode);
    if (statusFilter === 'WFH') return matchesSearch && emp.workMode === 'WFH';
    return matchesSearch && emp.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-card">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-teal-50 rounded-2xl text-teal-700 border border-teal-100">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Staff Master Directory</h1>
            <p className="text-xs text-slate-500 mt-0.5">Manage work modes (WFO / WFH), credentials & compensation</p>
          </div>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="btn-primary w-full sm:w-auto shadow-glow-teal"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add New Employee
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-subtle">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, ID or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
          />
        </div>

        <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'WFO', 'WFH', 'ACTIVE', 'WORKING', 'STOPPED', 'INACTIVE'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st === 'ALL'
                ? `All (${employees.length})`
                : st === 'WFO'
                ? `🏢 WFO Office`
                : st === 'WFH'
                ? `🏠 WFH Remote`
                : st === 'STOPPED'
                ? 'On Leave'
                : st}
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
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Employee ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Work Mode</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Reporting Manager</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Base</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs">Loading directory...</td></tr>
              ) : filteredEmployees.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs font-medium">No matching employees found.</td></tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-bold text-slate-800">
                      {emp.employeeId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-800 font-bold flex items-center justify-center text-xs border border-teal-100">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{emp.name}</p>
                          <p className="text-[10px] text-slate-400">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {emp.workMode === 'WFH' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Home className="w-3 h-3 mr-1 text-indigo-500" />
                          WFH (Remote)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          <Building2 className="w-3 h-3 mr-1 text-teal-600" />
                          WFO (Office)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      {emp.reportingManager ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-teal-50 text-teal-800 border border-teal-100">
                          <UserCheck className="w-3 h-3 mr-1 text-teal-600" />
                          {emp.reportingManager.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-bold text-slate-800">
                      {emp.grossSalary ? `₹${emp.grossSalary.toLocaleString('en-IN')}` : <span className="text-slate-400">Not set</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 inline-flex text-[11px] font-bold rounded-full border ${
                        emp.status === 'ACTIVE' ? 'bg-slate-100 text-slate-700 border-slate-200' : 
                        emp.status === 'WORKING' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        emp.status === 'STOPPED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        emp.status === 'CHECKED_OUT' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {emp.status === 'STOPPED' ? 'LEAVE' : emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-1.5">
                      <button
                        onClick={() => openEditModal(emp)}
                        className="inline-flex items-center text-xs font-bold text-slate-700 hover:text-teal-700 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 transition-colors"
                        title="Edit Employee ID, Work Mode, Password & Details"
                      >
                        <UserCog className="w-3.5 h-3.5 mr-1 text-teal-600" /> Edit
                      </button>
                      <button
                        onClick={() => openManagerModal(emp)}
                        className="inline-flex items-center text-xs font-bold text-slate-700 hover:text-teal-700 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 transition-colors"
                        title="Assign Supervisor"
                      >
                        <UserCheck className="w-3.5 h-3.5 mr-1 text-teal-600" /> Manager
                      </button>
                      <button
                        onClick={() => openSalaryModal(emp)}
                        className="inline-flex items-center text-xs font-bold text-slate-700 hover:text-teal-700 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 transition-colors"
                        title="Configure Salary"
                      >
                        <Edit className="w-3.5 h-3.5 mr-1" /> Salary
                      </button>
                      <button
                        onClick={() => viewAttendanceHistory(emp)}
                        className="inline-flex items-center text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1.5 rounded-xl border border-teal-200 transition-colors"
                        title="View Attendance History"
                      >
                        <Calendar className="w-3.5 h-3.5 mr-1" /> Logs
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
          <div className="bg-white rounded-3xl p-8 text-center text-slate-400 text-xs border border-slate-200 shadow-card">
            Loading directory...
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center text-slate-400 text-xs border border-slate-200 shadow-card">
            No matching employees found.
          </div>
        ) : (
          filteredEmployees.map((emp) => (
            <div key={emp._id} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-card space-y-3">
              <div className="flex justify-between items-start pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-800 font-bold flex items-center justify-center text-xs border border-teal-100">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-xs">{emp.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{emp.employeeId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                    emp.workMode === 'WFH' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-teal-50 text-teal-700 border-teal-200'
                  }`}>
                    {emp.workMode === 'WFH' ? '🏠 WFH' : '🏢 WFO'}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                    emp.status === 'ACTIVE' ? 'bg-slate-100 text-slate-700 border-slate-200' : 
                    emp.status === 'WORKING' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    emp.status === 'STOPPED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    emp.status === 'CHECKED_OUT' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                    'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {emp.status === 'STOPPED' ? 'LEAVE' : emp.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Manager</span>
                  <span className="font-semibold text-slate-800 text-[11px] truncate block">
                    {emp.reportingManager ? emp.reportingManager.name : 'Unassigned'}
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Monthly Gross</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px] block">
                    {emp.grossSalary ? `₹${emp.grossSalary.toLocaleString('en-IN')}` : 'Not set'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                <button
                  onClick={() => openEditModal(emp)}
                  className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] rounded-xl border border-slate-200 flex items-center justify-center gap-1"
                >
                  <UserCog className="w-3 h-3 text-teal-600" /> Edit
                </button>
                <button
                  onClick={() => openManagerModal(emp)}
                  className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] rounded-xl border border-slate-200 flex items-center justify-center gap-1"
                >
                  <UserCheck className="w-3 h-3 text-teal-600" /> Mgr
                </button>
                <button
                  onClick={() => openSalaryModal(emp)}
                  className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] rounded-xl border border-slate-200 flex items-center justify-center gap-1"
                >
                  <Edit className="w-3 h-3" /> Pay
                </button>
                <button
                  onClick={() => viewAttendanceHistory(emp)}
                  className="flex-1 py-1.5 px-2 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-[11px] rounded-xl border border-teal-200 flex items-center justify-center gap-1"
                >
                  <Calendar className="w-3 h-3" /> Logs
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Employee Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white w-full rounded-3xl shadow-2xl max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 animate-slide-up">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Add New Employee</h2>
                  <p className="text-xs text-slate-500">Configure profile, work mode policy & compensation</p>
                </div>
              </div>
              <button 
                onClick={() => setShowForm(false)} 
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form id="createEmployeeForm" onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
              
              {/* Section 1: Work Mode Selection (Top Priority) */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Work Mode Policy
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, workMode: 'WFO' })}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-start space-x-3 ${
                      form.workMode === 'WFO'
                        ? 'bg-teal-50/80 border-teal-600 ring-2 ring-teal-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${form.workMode === 'WFO' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">Work from Office (WFO)</p>
                        {form.workMode === 'WFO' && <span className="w-2 h-2 rounded-full bg-teal-600"></span>}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Strict Office Geofencing. Login & punch in only allowed inside office radius.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, workMode: 'WFH' })}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-start space-x-3 ${
                      form.workMode === 'WFH'
                        ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${form.workMode === 'WFH' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Home className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">Work from Home (WFH)</p>
                        {form.workMode === 'WFH' && <span className="w-2 h-2 rounded-full bg-indigo-600"></span>}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Remote Attendance. Can login and record attendance from any location.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Section 2: Account Details */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Basic Credentials & Organization
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                    <input name="name" required placeholder="e.g. John Doe" value={form.name} onChange={handleChange} className="form-input" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                    <input name="email" required placeholder="john@company.com" type="email" value={form.email} onChange={handleChange} className="form-input" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Employee ID</label>
                    <input name="employeeId" required placeholder="EMP001" value={form.employeeId} onChange={handleChange} className="form-input font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                    <div className="relative">
                      <input name="password" required placeholder="••••••••" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange} className="form-input pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
                    <select name="status" value={form.status} onChange={handleChange} className="form-input">
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Reporting Manager</label>
                    <select
                      name="reportingManagerId"
                      value={form.reportingManagerId}
                      onChange={handleChange}
                      className="form-input"
                    >
                      <option value="">None (Independent / Admin)</option>
                      {managers.map((mgr) => (
                        <option key={mgr._id} value={mgr._id}>
                          {mgr.name} ({mgr.employeeId}) {mgr.role === 'ADMIN' ? '— Admin' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Payroll & Compliance */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Compensation & Compliance
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Gross Salary (Monthly)</label>
                    <input name="grossSalary" type="number" required placeholder="e.g. 50000" value={form.grossSalary} onChange={handleChange} className="form-input font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Basic Salary (Monthly)</label>
                    <input name="basicSalary" type="number" required placeholder="e.g. 25000" value={form.basicSalary} onChange={handleChange} className="form-input font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Other Deductions</label>
                    <input name="otherDeductions" type="number" placeholder="e.g. 500" value={form.otherDeductions} onChange={handleChange} className="form-input font-mono" />
                  </div>
                </div>
                <div className="flex gap-6 pt-1">
                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" name="pfApplicable" checked={form.pfApplicable} onChange={handleChange} className="rounded text-teal-600 focus:ring-teal-500" />
                    <span>Provident Fund (PF) Applicable</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" name="esiApplicable" checked={form.esiApplicable} onChange={handleChange} className="rounded text-teal-600 focus:ring-teal-500" />
                    <span>ESI Health Insurance Applicable</span>
                  </label>
                </div>
              </div>

            </form>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className="btn-secondary px-5 py-2.5 text-xs font-semibold"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="createEmployeeForm" 
                className="btn-primary px-6 py-2.5 text-xs font-bold shadow-glow-teal"
              >
                Create Staff Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Full Employee Modal */}
      {editModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white w-full rounded-3xl shadow-2xl max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 animate-slide-up">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center font-bold">
                  <UserCog className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Edit Staff Profile</h2>
                  <p className="text-xs text-slate-500">Switch WFO / WFH mode, update ID & credentials</p>
                </div>
              </div>
              <button
                onClick={() => setEditModal({ isOpen: false, employee: null, form: initialForm, showPassword: false })}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form id="editEmployeeForm" onSubmit={handleUpdateEmployee} className="p-6 space-y-6 overflow-y-auto flex-1">
              
              {/* Section 1: Work Mode Selection (HR Can Change Anytime) */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Work Mode Policy <span className="text-teal-600 font-normal lowercase">(Click to switch mode)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditModal({ ...editModal, form: { ...editModal.form, workMode: 'WFO' } })}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-start space-x-3 ${
                      editModal.form.workMode === 'WFO'
                        ? 'bg-teal-50/80 border-teal-600 ring-2 ring-teal-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${editModal.form.workMode === 'WFO' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">Work from Office (WFO)</p>
                        {editModal.form.workMode === 'WFO' && <span className="w-2 h-2 rounded-full bg-teal-600"></span>}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Geofencing Enforced. Login & attendance only allowed at office location.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditModal({ ...editModal, form: { ...editModal.form, workMode: 'WFH' } })}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-start space-x-3 ${
                      editModal.form.workMode === 'WFH'
                        ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${editModal.form.workMode === 'WFH' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Home className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">Work from Home (WFH)</p>
                        {editModal.form.workMode === 'WFH' && <span className="w-2 h-2 rounded-full bg-indigo-600"></span>}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Remote Attendance. Employee can log in and punch from anywhere.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Section 2: Account Details */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Basic Credentials & Organization
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                    <input
                      name="name"
                      required
                      value={editModal.form.name}
                      onChange={handleEditChange}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                    <input
                      name="email"
                      required
                      type="email"
                      value={editModal.form.email}
                      onChange={handleEditChange}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Employee ID <span className="text-teal-600 font-normal lowercase">(Editable)</span>
                    </label>
                    <input
                      name="employeeId"
                      required
                      value={editModal.form.employeeId}
                      onChange={handleEditChange}
                      className="form-input font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      New Password <span className="text-slate-400 font-normal lowercase">(leave empty to retain)</span>
                    </label>
                    <div className="relative">
                      <input
                        name="password"
                        placeholder="Enter new password"
                        type={editModal.showPassword ? 'text' : 'password'}
                        value={editModal.form.password}
                        onChange={handleEditChange}
                        className="form-input pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setEditModal({ ...editModal, showPassword: !editModal.showPassword })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {editModal.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
                    <select
                      name="status"
                      value={editModal.form.status}
                      onChange={handleEditChange}
                      className="form-input"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Reporting Manager</label>
                    <select
                      name="reportingManagerId"
                      value={editModal.form.reportingManagerId}
                      onChange={handleEditChange}
                      className="form-input"
                    >
                      <option value="">None (Independent / Admin)</option>
                      {managers
                        .filter((m) => m._id !== editModal.employee?._id)
                        .map((mgr) => (
                          <option key={mgr._id} value={mgr._id}>
                            {mgr.name} ({mgr.employeeId}) {mgr.role === 'ADMIN' ? '— Admin' : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Payroll & Deductions */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Compensation & Deductions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Gross Salary (Monthly)</label>
                    <input
                      name="grossSalary"
                      type="number"
                      value={editModal.form.grossSalary}
                      onChange={handleEditChange}
                      className="form-input font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Basic Salary (Monthly)</label>
                    <input
                      name="basicSalary"
                      type="number"
                      value={editModal.form.basicSalary}
                      onChange={handleEditChange}
                      className="form-input font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Other Deductions</label>
                    <input
                      name="otherDeductions"
                      type="number"
                      value={editModal.form.otherDeductions}
                      onChange={handleEditChange}
                      className="form-input font-mono"
                    />
                  </div>
                </div>
                <div className="flex gap-6 pt-1">
                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      name="pfApplicable"
                      checked={editModal.form.pfApplicable}
                      onChange={handleEditChange}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span>PF Applicable</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      name="esiApplicable"
                      checked={editModal.form.esiApplicable}
                      onChange={handleEditChange}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span>ESI Applicable</span>
                  </label>
                </div>
              </div>

            </form>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setEditModal({ isOpen: false, employee: null, form: initialForm, showPassword: false })}
                className="btn-secondary px-5 py-2.5 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="editEmployeeForm"
                className="btn-primary px-6 py-2.5 text-xs font-bold shadow-glow-teal"
              >
                Save Profile Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Salary Modal */}
      {salaryModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white w-full rounded-3xl shadow-2xl max-w-lg overflow-hidden border border-slate-100 animate-slide-up">
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Configure Salary</h3>
                  <p className="text-xs text-slate-400">Settings for {salaryModal.employee?.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setSalaryModal({ isOpen: false, employee: null, data: initialSalaryData })} 
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSalary} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gross Salary (Monthly)</label>
                  <input name="grossSalary" required type="number" min="0" value={salaryModal.data.grossSalary} onChange={handleSalaryChange} className="form-input font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Basic Salary (Monthly)</label>
                  <input name="basicSalary" required type="number" min="0" value={salaryModal.data.basicSalary} onChange={handleSalaryChange} className="form-input font-mono" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Other Deductions (Monthly)</label>
                  <input name="otherDeductions" type="number" min="0" value={salaryModal.data.otherDeductions} onChange={handleSalaryChange} className="form-input font-mono" />
                </div>
              </div>
              
              <div className="flex gap-4 pt-1">
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" name="pfApplicable" checked={salaryModal.data.pfApplicable} onChange={handleSalaryChange} className="rounded text-teal-600 focus:ring-teal-500" />
                  <span>PF Applicable</span>
                </label>
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" name="esiApplicable" checked={salaryModal.data.esiApplicable} onChange={handleSalaryChange} className="rounded text-teal-600 focus:ring-teal-500" />
                  <span>ESI Applicable</span>
                </label>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setSalaryModal({ isOpen: false, employee: null, data: initialSalaryData })} className="btn-secondary flex-1 py-2.5 text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 py-2.5 text-xs font-bold shadow-glow-teal">
                  Save Salary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Manager Modal */}
      {managerModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white w-full rounded-3xl shadow-2xl max-w-md overflow-hidden border border-slate-100 animate-slide-up">
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Assign Reporting Line</h3>
                  <p className="text-xs text-slate-400">Supervisor for {managerModal.employee?.name}</p>
                </div>
              </div>
              <button onClick={() => setManagerModal({ isOpen: false, employee: null, reportingManagerId: '' })} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateManager} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Direct Supervisor</label>
                <select
                  value={managerModal.reportingManagerId}
                  onChange={(e) => setManagerModal({ ...managerModal, reportingManagerId: e.target.value })}
                  className="form-input"
                >
                  <option value="">None (Independent / Reports to Admin)</option>
                  {managers
                    .filter((m) => m._id !== managerModal.employee?._id)
                    .map((mgr) => (
                      <option key={mgr._id} value={mgr._id}>
                        {mgr.name} ({mgr.employeeId}) {mgr.role === 'ADMIN' ? '— Admin' : ''}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setManagerModal({ isOpen: false, employee: null, reportingManagerId: '' })} className="btn-secondary flex-1 py-2.5 text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 py-2.5 text-xs font-bold shadow-glow-teal">
                  Confirm Supervisor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminEmployees;
