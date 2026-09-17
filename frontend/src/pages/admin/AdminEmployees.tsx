import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { Eye, EyeOff, X, Calendar, Plus, IndianRupee, Edit, UserCheck, UserCog, Pencil, Search, ShieldCheck, Users, Building2, Home, ArrowRight, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminEmployees = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [addStep, setAddStep] = useState<1 | 2>(1);
  
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

  const handleNextStep = () => {
    if (!form.name.trim()) {
      toast.error('Please enter employee full name');
      return;
    }
    if (!form.email.trim()) {
      toast.error('Please enter email address');
      return;
    }
    if (!form.employeeId.trim()) {
      toast.error('Please enter Employee ID');
      return;
    }
    if (!form.password.trim()) {
      toast.error('Please enter a secure password');
      return;
    }
    setAddStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.grossSalary) {
      toast.error('Please enter gross monthly salary');
      return;
    }
    try {
      await api.post('/admin/employees', form);
      toast.success('Employee created successfully!');
      setForm(initialForm);
      setAddStep(1);
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
      toast.success('Employee details & salary updated successfully!');
      setEditModal({ isOpen: false, employee: null, form: initialForm, showPassword: false });
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update employee');
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
    if (statusFilter === 'HYBRID') return matchesSearch && emp.workMode === 'HYBRID';
    if (statusFilter === 'SSC') return matchesSearch && emp.workMode === 'SSC';
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
            <p className="text-xs text-slate-500 mt-0.5">Manage work modes (WFO / WFH / Hybrid / SSC), credentials & compensation</p>
          </div>
        </div>

        <button
          onClick={() => {
            setAddStep(1);
            setShowForm(true);
          }}
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
          {['ALL', 'WFO', 'WFH', 'HYBRID', 'SSC', 'ACTIVE', 'STOPPED', 'INACTIVE'].map((st) => (
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
                : st === 'HYBRID'
                ? `🏢+🏠 Hybrid`
                : st === 'SSC'
                ? `⚡ SSC Employee`
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
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Employee Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Work Mode</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs">Loading directory...</td></tr>
              ) : filteredEmployees.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs font-medium">No matching employees found.</td></tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-bold text-slate-800">
                      <Link to={`/admin/employees/${emp._id}`} className="hover:text-teal-600 transition-colors">
                        {emp.employeeId}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link to={`/admin/employees/${emp._id}`} className="flex items-center space-x-3 group">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-800 font-bold flex items-center justify-center text-xs border border-teal-100 group-hover:scale-105 transition-transform">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-teal-700 transition-colors">{emp.name}</p>
                          <p className="text-[10px] text-slate-400">{emp.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {emp.workMode === 'SSC' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                          <span className="mr-1 text-xs">⚡</span>
                          SSC (Holiday Shift)
                        </span>
                      ) : emp.workMode === 'HYBRID' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <span className="mr-1 text-xs">🏢+🏠</span>
                          Hybrid (Flex)
                        </span>
                      ) : emp.workMode === 'WFH' ? (
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
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      <button
                        onClick={() => viewAttendanceHistory(emp)}
                        className="inline-flex items-center text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl border border-teal-200 transition-colors"
                        title="View Attendance History"
                      >
                        <Calendar className="w-3.5 h-3.5 mr-1" /> History
                      </button>
                      <button
                        onClick={() => openEditModal(emp)}
                        className="inline-flex items-center text-xs font-bold text-slate-700 hover:text-teal-700 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors"
                        title="Edit Employee ID, Manager, Salary & Credentials"
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1 text-teal-600" /> Edit
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
                <Link to={`/admin/employees/${emp._id}`} className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-800 font-bold flex items-center justify-center text-xs border border-teal-100">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-xs">{emp.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{emp.employeeId}</p>
                  </div>
                </Link>
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                    emp.workMode === 'SSC' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                    emp.workMode === 'HYBRID' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    emp.workMode === 'WFH' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 
                    'bg-teal-50 text-teal-700 border-teal-200'
                  }`}>
                    {emp.workMode === 'SSC' ? '⚡ SSC' : emp.workMode === 'HYBRID' ? '🏢+🏠 Hybrid' : emp.workMode === 'WFH' ? '🏠 WFH' : '🏢 WFO'}
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

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => viewAttendanceHistory(emp)}
                  className="flex-1 py-2 px-2 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs rounded-xl border border-teal-200 flex items-center justify-center gap-1"
                >
                  <Calendar className="w-3.5 h-3.5" /> History
                </button>
                <button
                  onClick={() => openEditModal(emp)}
                  className="flex-1 py-2 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center justify-center gap-1"
                >
                  <Pencil className="w-3.5 h-3.5 text-teal-600" /> Edit
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 2-Step Create Employee Modal */}
      {showForm && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white w-full rounded-3xl shadow-2xl max-w-xl overflow-hidden border border-slate-100 animate-slide-up flex flex-col">
            {/* Modal Header with Stepper */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center font-bold">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900">Add New Employee</h2>
                    <p className="text-[11px] text-slate-500">
                      {addStep === 1 ? 'Step 1 of 2: Work Mode & Basic Credentials' : 'Step 2 of 2: Role, Manager & Compensation'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowForm(false);
                    setAddStep(1);
                  }} 
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Visual Step Progress Bar */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className={`h-1.5 rounded-full transition-all ${addStep >= 1 ? 'bg-teal-600' : 'bg-slate-200'}`} />
                <div className={`h-1.5 rounded-full transition-all ${addStep === 2 ? 'bg-teal-600' : 'bg-slate-200'}`} />
              </div>
            </div>

            {/* Modal Body */}
            <form id="createEmployeeForm" onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* STEP 1: Work Mode & Basic Profile */}
              {addStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      1. Select Work Mode Policy
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, workMode: 'WFO' })}
                        className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                          form.workMode === 'WFO'
                            ? 'bg-teal-50/90 border-teal-600 ring-2 ring-teal-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1.5">
                          <div className={`p-1.5 rounded-lg ${form.workMode === 'WFO' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            <Building2 className="w-4 h-4" />
                          </div>
                          {form.workMode === 'WFO' && <span className="w-2 h-2 rounded-full bg-teal-600"></span>}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">Office (WFO)</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">500m Geofence required.</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setForm({ ...form, workMode: 'WFH' })}
                        className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                          form.workMode === 'WFH'
                            ? 'bg-indigo-50/90 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1.5">
                          <div className={`p-1.5 rounded-lg ${form.workMode === 'WFH' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            <Home className="w-4 h-4" />
                          </div>
                          {form.workMode === 'WFH' && <span className="w-2 h-2 rounded-full bg-indigo-600"></span>}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">Home (WFH)</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Remote sign-in anywhere.</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setForm({ ...form, workMode: 'HYBRID' })}
                        className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                          form.workMode === 'HYBRID'
                            ? 'bg-purple-50/90 border-purple-600 ring-2 ring-purple-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1.5">
                          <div className={`p-1.5 rounded-lg ${form.workMode === 'HYBRID' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            <span className="text-xs font-bold">🏢+🏠</span>
                          </div>
                          {form.workMode === 'HYBRID' && <span className="w-2 h-2 rounded-full bg-purple-600"></span>}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-purple-900">Hybrid (Flex)</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Works office & home.</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setForm({ ...form, workMode: 'SSC' })}
                        className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                          form.workMode === 'SSC'
                            ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1.5">
                          <div className={`p-1.5 rounded-lg ${form.workMode === 'SSC' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            <span className="text-xs font-bold">⚡</span>
                          </div>
                          {form.workMode === 'SSC' && <span className="w-2 h-2 rounded-full bg-amber-600"></span>}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-amber-900">SSC Shift</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Works holidays, weekday off.</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      2. Basic Credentials
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                        <input name="name" required placeholder="e.g. John Doe" value={form.name} onChange={handleChange} className="form-input text-xs" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                        <input name="email" required placeholder="john@company.com" type="email" value={form.email} onChange={handleChange} className="form-input text-xs" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Employee ID</label>
                        <input name="employeeId" required placeholder="EMP001" value={form.employeeId} onChange={handleChange} className="form-input font-mono text-xs" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                        <div className="relative">
                          <input name="password" required placeholder="••••••••" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange} className="form-input pr-10 text-xs" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Role, Manager & Compensation */}
              {addStep === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      3. Organization & Reporting
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Reporting Manager</label>
                        <select
                          name="reportingManagerId"
                          value={form.reportingManagerId}
                          onChange={handleChange}
                          className="form-input text-xs"
                        >
                          <option value="">None (Independent / Admin)</option>
                          {managers.map((mgr) => (
                            <option key={mgr._id} value={mgr._id}>
                              {mgr.name} ({mgr.employeeId}) {mgr.role === 'ADMIN' ? '— Admin' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
                        <select name="status" value={form.status} onChange={handleChange} className="form-input text-xs">
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      4. Compensation & Statutory
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Gross Salary (Monthly)</label>
                        <input name="grossSalary" type="number" required placeholder="50000" value={form.grossSalary} onChange={handleChange} className="form-input font-mono text-xs" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Basic Salary (Monthly)</label>
                        <input name="basicSalary" type="number" placeholder="25000" value={form.basicSalary} onChange={handleChange} className="form-input font-mono text-xs" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Other Deductions</label>
                        <input name="otherDeductions" type="number" placeholder="0" value={form.otherDeductions} onChange={handleChange} className="form-input font-mono text-xs" />
                      </div>
                    </div>
                    <div className="flex gap-6 pt-3">
                      <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input type="checkbox" name="pfApplicable" checked={form.pfApplicable} onChange={handleChange} className="rounded text-teal-600 focus:ring-teal-500" />
                        <span>PF Applicable</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input type="checkbox" name="esiApplicable" checked={form.esiApplicable} onChange={handleChange} className="rounded text-teal-600 focus:ring-teal-500" />
                        <span>ESI Applicable</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                {addStep === 1 ? (
                  <>
                    <button 
                      type="button" 
                      onClick={() => setShowForm(false)} 
                      className="btn-secondary px-5 py-2.5 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button"
                      onClick={handleNextStep}
                      className="btn-primary px-6 py-2.5 text-xs font-bold shadow-glow-teal flex items-center gap-1.5"
                    >
                      <span>Continue to Step 2</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      type="button" 
                      onClick={() => setAddStep(1)} 
                      className="btn-secondary px-5 py-2.5 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Step 1</span>
                    </button>
                    <button 
                      type="submit" 
                      className="btn-primary px-6 py-2.5 text-xs font-bold shadow-glow-teal"
                    >
                      Create Staff Member
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Full Employee Modal */}
      {editModal.isOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white w-full rounded-3xl shadow-2xl max-w-xl overflow-hidden border border-slate-100 animate-slide-up flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center font-bold">
                  <UserCog className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">Edit Staff Profile</h2>
                  <p className="text-[11px] text-slate-500">Switch work mode policy, ID & credentials</p>
                </div>
              </div>
              <button
                onClick={() => setEditModal({ isOpen: false, employee: null, form: initialForm, showPassword: false })}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form id="editEmployeeForm" onSubmit={handleUpdateEmployee} className="p-6 space-y-4">
              
              {/* Section 1: Work Mode Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Work Mode Policy
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditModal({ ...editModal, form: { ...editModal.form, workMode: 'WFO' } })}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      editModal.form.workMode === 'WFO'
                        ? 'bg-teal-50/90 border-teal-600 ring-2 ring-teal-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <div className={`p-1.5 rounded-lg shrink-0 ${editModal.form.workMode === 'WFO' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Building2 className="w-4 h-4" />
                      </div>
                      {editModal.form.workMode === 'WFO' && <span className="w-2 h-2 rounded-full bg-teal-600"></span>}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Office (WFO)</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">500m Geofence.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditModal({ ...editModal, form: { ...editModal.form, workMode: 'WFH' } })}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      editModal.form.workMode === 'WFH'
                        ? 'bg-indigo-50/90 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <div className={`p-1.5 rounded-lg shrink-0 ${editModal.form.workMode === 'WFH' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Home className="w-4 h-4" />
                      </div>
                      {editModal.form.workMode === 'WFH' && <span className="w-2 h-2 rounded-full bg-indigo-600"></span>}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Remote (WFH)</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Remote sign-in.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditModal({ ...editModal, form: { ...editModal.form, workMode: 'HYBRID' } })}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      editModal.form.workMode === 'HYBRID'
                        ? 'bg-purple-50/90 border-purple-600 ring-2 ring-purple-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <div className={`p-1.5 rounded-lg shrink-0 ${editModal.form.workMode === 'HYBRID' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <span className="text-xs font-bold">🏢+🏠</span>
                      </div>
                      {editModal.form.workMode === 'HYBRID' && <span className="w-2 h-2 rounded-full bg-purple-600"></span>}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-purple-900">Hybrid (Flex)</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Office & Home.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditModal({ ...editModal, form: { ...editModal.form, workMode: 'SSC' } })}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      editModal.form.workMode === 'SSC'
                        ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <div className={`p-1.5 rounded-lg shrink-0 ${editModal.form.workMode === 'SSC' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <span className="text-xs font-bold">⚡</span>
                      </div>
                      {editModal.form.workMode === 'SSC' && <span className="w-2 h-2 rounded-full bg-amber-600"></span>}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-900">SSC Shift</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Works holidays & weekends.</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Section 2: Account & Organization Details */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Account & Organization
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                    <input name="name" required value={editModal.form.name} onChange={handleEditChange} className="form-input text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                    <input name="email" required type="email" value={editModal.form.email} onChange={handleEditChange} className="form-input text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Employee ID</label>
                    <input name="employeeId" required value={editModal.form.employeeId} onChange={handleEditChange} className="form-input font-mono text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Reset Password</label>
                    <div className="relative">
                      <input
                        name="password"
                        placeholder="Leave blank to keep current"
                        type={editModal.showPassword ? 'text' : 'password'}
                        value={editModal.form.password}
                        onChange={handleEditChange}
                        className="form-input pr-10 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setEditModal({ ...editModal, showPassword: !editModal.showPassword })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {editModal.showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
                    <select name="status" value={editModal.form.status} onChange={handleEditChange} className="form-input text-xs">
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
                      className="form-input text-xs"
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

              {/* Section 3: Compensation & Statutory */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Compensation & Salary Setup
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Gross Salary (₹/Mo)</label>
                    <input
                      name="grossSalary"
                      type="number"
                      min="0"
                      required
                      placeholder="50000"
                      value={editModal.form.grossSalary}
                      onChange={handleEditChange}
                      className="form-input font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Basic Salary (₹/Mo)</label>
                    <input
                      name="basicSalary"
                      type="number"
                      min="0"
                      placeholder="25000"
                      value={editModal.form.basicSalary}
                      onChange={handleEditChange}
                      className="form-input font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Other Deductions (₹)</label>
                    <input
                      name="otherDeductions"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={editModal.form.otherDeductions}
                      onChange={handleEditChange}
                      className="form-input font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="flex gap-6 pt-3">
                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      name="pfApplicable"
                      checked={editModal.form.pfApplicable}
                      onChange={handleEditChange}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span>PF Applicable (12%)</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      name="esiApplicable"
                      checked={editModal.form.esiApplicable}
                      onChange={handleEditChange}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span>ESI Applicable (0.75%)</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditModal({ isOpen: false, employee: null, form: initialForm, showPassword: false })}
                  className="btn-secondary px-5 py-2.5 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-6 py-2.5 text-xs font-bold shadow-glow-teal"
                >
                  Save All Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default AdminEmployees;
