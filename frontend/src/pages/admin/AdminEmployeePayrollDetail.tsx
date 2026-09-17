import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, User, IndianRupee, MinusCircle, Calculator, Building, FileText, PlusCircle, Calendar } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const AdminEmployeePayrollDetail = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const now = new Date();
  
  const month = Number(searchParams.get('month')) || new Date().getMonth() + 1;
  const year = Number(searchParams.get('year')) || new Date().getFullYear();

  const [payrollData, setPayrollData] = useState<any | null>(null);
  const [allPayroll, setAllPayroll] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayroll = async () => {
      try {
        setLoading(true);
        const res = await api.get('/admin/payroll', { params: { month, year } });
        setAllPayroll(res.data);
        const employeePayroll = res.data.find((p: any) => p.employeeId === id);
        setPayrollData(employeePayroll);
      } catch (error) {
        console.error('Failed to fetch payroll details', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPayroll();
  }, [id, month, year]);

  if (loading) {
    return <div className="text-center p-8 text-gray-500">Loading details...</div>;
  }

  if (!payrollData) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(-1)} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 font-medium">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Payroll
        </button>
        <div className="text-center p-8 text-gray-500 bg-white rounded-xl shadow-sm border border-gray-200">
          No payroll data found for this employee.
        </div>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, valueClass = 'text-gray-900', iconClass = 'text-gray-400' }: any) => (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center">
      <div className={`p-3 rounded-lg bg-gray-50 mr-4 ${iconClass.replace('text-', 'bg-').replace('-500', '-50')}`}>
        <Icon className={`w-6 h-6 ${iconClass}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className={`text-xl font-bold ${valueClass}`}>{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/payroll')} className="p-2 text-gray-400 hover:text-gray-700 bg-white rounded-lg shadow-sm border border-gray-200 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Payroll Details</h1>
            <p className="text-sm text-gray-500">{payrollData.name} ({payrollData.employeeId})</p>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select
            value={id}
            onChange={(e) => navigate(`/admin/payroll/${e.target.value}?month=${month}&year=${year}`)}
            className="border border-gray-200 rounded-lg shadow-sm bg-white text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {allPayroll.map((p) => (
              <option key={p.employeeId} value={p.employeeId}>{p.name} ({p.employeeId})</option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => navigate(`/admin/payroll/${id}?month=${e.target.value}&year=${year}`)}
            className="border border-gray-200 rounded-lg shadow-sm bg-white text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => navigate(`/admin/payroll/${id}?month=${month}&year=${e.target.value}`)}
            className="border border-gray-200 rounded-lg shadow-sm bg-white text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value={now.getFullYear() - 1}>{now.getFullYear() - 1}</option>
            <option value={now.getFullYear()}>{now.getFullYear()}</option>
          </select>
        </div>
      </div>

      {/* Top Level Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard 
          icon={IndianRupee} 
          label="Earned Gross Salary" 
          value={`₹${payrollData.earnedGross.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} 
          iconClass="text-teal-500" 
        />
        <StatCard 
          icon={MinusCircle} 
          label="Total Deductions (PF/ESI/Other)" 
          value={`- ₹${(payrollData.employeePF + payrollData.employeeESI + payrollData.otherDeductions).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          valueClass="text-red-600"
          iconClass="text-red-500" 
        />
        <StatCard 
          icon={Calculator} 
          label="Net Payable" 
          value={`₹${payrollData.netSalary.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          valueClass="text-green-600"
          iconClass="text-green-500" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Attendance Summary */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <h3 className="text-lg font-bold text-gray-900 border-b pb-2 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-teal-600" /> Attendance Overview
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col justify-center items-center">
              <p className="text-sm font-medium text-gray-500 mb-1">Days in Month</p>
              <p className="text-2xl font-bold text-gray-900">{payrollData.daysInMonth}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col justify-center items-center">
              <p className="text-sm font-medium text-gray-500 mb-1">Eligible Days</p>
              <p className="text-2xl font-bold text-teal-700">{payrollData.eligibleDays}</p>
            </div>
          </div>
        </div>

        {/* Salary Configuration summary */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <h3 className="text-lg font-bold text-gray-900 border-b pb-2 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-teal-600" /> Salary Config
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Gross Salary (Monthly)</span>
              <span className="font-semibold text-gray-900">₹{payrollData.grossSalary.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Basic Salary (Monthly)</span>
              <span className="font-semibold text-gray-900">₹{payrollData.basicSalary.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100">
              <span className="text-gray-500">PF Applicable</span>
              <span className={`font-semibold ${payrollData.employeePF > 0 ? 'text-green-600' : 'text-gray-400'}`}>{payrollData.employeePF > 0 ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">ESI Applicable</span>
              <span className={`font-semibold ${payrollData.employeeESI > 0 ? 'text-green-600' : 'text-gray-400'}`}>{payrollData.employeeESI > 0 ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Salary Payslip Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <Calculator className="w-5 h-5 mr-2 text-teal-600" /> Payslip Breakdown
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Earnings */}
            <div>
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center text-green-700">
                <PlusCircle className="w-4 h-4 mr-2" /> Earnings
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Earned Gross Salary</span>
                  <span className="font-medium text-gray-900">₹{payrollData.earnedGross.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 italic text-xs">(Based on {payrollData.eligibleDays} days)</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-3 border-t border-gray-100">
                  <span className="font-semibold text-gray-900">Total Earnings</span>
                  <span className="font-bold text-green-700">₹{payrollData.earnedGross.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center text-red-700">
                <MinusCircle className="w-4 h-4 mr-2" /> Deductions
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Employee PF</span>
                  <span className="font-medium text-gray-900">₹{payrollData.employeePF.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Employee ESI</span>
                  <span className="font-medium text-gray-900">₹{payrollData.employeeESI.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Other Deductions</span>
                  <span className="font-medium text-gray-900">₹{payrollData.otherDeductions.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-3 border-t border-gray-100">
                  <span className="font-semibold text-gray-900">Total Deductions</span>
                  <span className="font-bold text-red-700">₹{(payrollData.employeePF + payrollData.employeeESI + payrollData.otherDeductions).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Employer Contributions Info (Not deducted from salary) */}
          {(payrollData.employerPF > 0 || payrollData.employerESI > 0) && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
                <Building className="w-4 h-4 mr-2" /> Employer Contributions (FYI)
              </h4>
              <div className="flex gap-8 text-sm">
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">Employer PF:</span>
                  <span className="font-medium text-gray-900">₹{payrollData.employerPF.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">Employer ESI:</span>
                  <span className="font-medium text-gray-900">₹{payrollData.employerESI.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          )}

          {/* Total Footer */}
          <div className="mt-8">
            <div className="flex justify-between items-center bg-teal-50 p-6 rounded-xl border border-teal-100">
              <span className="text-xl font-bold text-teal-900">Net Salary (Payable)</span>
              <span className="text-3xl font-black text-teal-700 flex items-center">
                <IndianRupee className="w-8 h-8 mr-1" />
                {payrollData.netSalary.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminEmployeePayrollDetail;
