import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { IndianRupee, Download, Eye } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const AdminPayroll = () => {
  const [payroll, setPayroll] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const navigate = useNavigate();

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/payroll', { params: { month, year } });
      setPayroll(res.data);
    } catch (error) {
      console.error('Failed to fetch payroll', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [month, year]);

  const downloadCSV = () => {
    if (!payroll.length) return;
    
    const headers = ['Employee ID', 'Name', 'Gross Salary', 'Basic Salary', 'Eligible Days', 'Days in Month', 'Earned Gross', 'Earned Basic', 'Employee PF', 'Employee ESI', 'Other Deductions', 'Net Salary'];
    const rows = payroll.map(p => [
      p.employeeId,
      `"${p.name}"`,
      p.grossSalary || 0,
      p.basicSalary || 0,
      p.eligibleDays,
      p.daysInMonth,
      p.earnedGross.toFixed(2),
      p.earnedBasic.toFixed(2),
      p.employeePF.toFixed(2),
      p.employeeESI.toFixed(2),
      p.otherDeductions,
      p.netSalary.toFixed(2)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Shero_Payroll_${MONTHS[month-1]}_${year}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
            <IndianRupee className="w-6 h-6 mr-2 text-teal-600" /> Payroll Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">Calculate and review monthly salaries</p>
        </div>

        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="flex-1 sm:flex-none border border-gray-200 rounded-xl shadow-sm bg-white text-sm py-2.5 px-3 pr-8 focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
          >
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="flex-1 sm:flex-none border border-gray-200 rounded-xl shadow-sm bg-white text-sm py-2.5 px-3 pr-8 focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
          >
            <option value={now.getFullYear() - 1}>{now.getFullYear() - 1}</option>
            <option value={now.getFullYear()}>{now.getFullYear()}</option>
          </select>
          <button
            onClick={downloadCSV}
            disabled={loading || payroll.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
            title="Download Excel/CSV"
          >
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </div>

      <div className="hidden sm:block bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Salary</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Eligible Days</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Salary</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">Calculating payroll...</td></tr>
              ) : payroll.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">No payroll data available.</td></tr>
              ) : (
                payroll.map((p) => (
                  <tr key={p.employeeId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{p.name}</div>
                      <div className="text-sm text-gray-500 font-mono">{p.employeeId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {p.grossSalary ? `₹${p.grossSalary.toLocaleString()}` : 'Not set'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center text-gray-900">
                      {p.eligibleDays} / {p.daysInMonth}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-green-700 bg-green-50 px-3 py-1 rounded-lg">
                        ₹{p.netSalary.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button 
                        onClick={() => navigate(`/admin/payroll/${p.employeeId}?month=${month}&year=${year}`)}
                        className="inline-flex items-center text-sm text-teal-600 hover:text-teal-900 font-medium"
                      >
                        <Eye className="w-4 h-4 mr-1" /> Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl p-6 text-center text-gray-500 text-sm border border-gray-200">Calculating payroll...</div>
        ) : payroll.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center text-gray-500 text-sm border border-gray-200">No payroll data available.</div>
        ) : (
          payroll.map((p) => (
            <div key={p.employeeId} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900">{p.name}</p>
                  <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded mt-1 inline-block">{p.employeeId}</span>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="text-xs text-gray-500 mb-0.5">Net Salary</p>
                  <p className="text-sm font-bold text-green-700 mb-2">₹{p.netSalary.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <button 
                    onClick={() => navigate(`/admin/payroll/${p.employeeId}?month=${month}&year=${year}`)}
                    className="inline-flex items-center text-xs text-teal-600 hover:text-teal-900 font-medium bg-teal-50 px-2 py-1 rounded"
                  >
                    <Eye className="w-3 h-3 mr-1" /> Details
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-400">Gross Salary</p>
                  <p className="text-sm font-medium text-gray-900">{p.grossSalary ? `₹${p.grossSalary.toLocaleString()}` : 'Not set'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Eligible Days</p>
                  <p className="text-sm font-medium text-gray-900">{p.eligibleDays} / {p.daysInMonth}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminPayroll;
