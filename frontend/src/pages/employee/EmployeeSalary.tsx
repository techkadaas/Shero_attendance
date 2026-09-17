import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { IndianRupee, MinusCircle, Calculator, FileText, PlusCircle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const EmployeeSalary = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [payrollData, setPayrollData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSalary = async () => {
      try {
        setLoading(true);
        const res = await api.get('/attendance/salary', { params: { month, year } });
        setPayrollData(res.data);
      } catch (error) {
        toast.error('Failed to load salary data');
      } finally {
        setLoading(false);
      }
    };
    fetchSalary();
  }, [month, year]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading salary details...</div>;
  }

  if (!payrollData) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <FileText className="w-6 h-6 mr-2 text-teal-600" /> My Salary
        </h1>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-500">
          No salary data found for the selected month.
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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="w-6 h-6 mr-2 text-teal-600" /> My Salary Slip
          </h1>
          <p className="text-sm text-gray-500 mt-1">View your monthly earnings and deductions</p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border border-gray-200 rounded-lg shadow-sm bg-white text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
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
          label="Total Deductions" 
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
                {payrollData.employeePF > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Employee PF</span>
                    <span className="font-medium text-gray-900">₹{payrollData.employeePF.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                {payrollData.employeeESI > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Employee ESI</span>
                    <span className="font-medium text-gray-900">₹{payrollData.employeeESI.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                {payrollData.otherDeductions > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Other Deductions</span>
                    <span className="font-medium text-gray-900">₹{payrollData.otherDeductions.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm pt-3 border-t border-gray-100">
                  <span className="font-semibold text-gray-900">Total Deductions</span>
                  <span className="font-bold text-red-700">₹{(payrollData.employeePF + payrollData.employeeESI + payrollData.otherDeductions).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

          </div>

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

export default EmployeeSalary;
