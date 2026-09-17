import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import EmployeeLayout from './layouts/EmployeeLayout';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';

import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEmployees from './pages/admin/AdminEmployees';
import AdminEmployeeAttendance from './pages/admin/AdminEmployeeAttendance';
import AdminPayroll from './pages/admin/AdminPayroll';
import AdminEmployeePayrollDetail from './pages/admin/AdminEmployeePayrollDetail';
import AdminSettings from './pages/admin/AdminSettings';
import AttendanceHistory from './pages/employee/AttendanceHistory';
import EmployeeSalary from './pages/employee/EmployeeSalary';
import EmployeePermissions from './pages/employee/EmployeePermissions';
import AdminPermissions from './pages/admin/AdminPermissions';
import { Toaster } from 'react-hot-toast';

const PrivateRoute = ({ children, role }: { children: JSX.Element, role?: string }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/employee'} />;
  }
  return children;
};

const App = () => {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/employee" element={
            <PrivateRoute role="EMPLOYEE">
              <EmployeeLayout />
            </PrivateRoute>
          }>
            <Route index element={<EmployeeDashboard />} />
            <Route path="attendance" element={<AttendanceHistory />} />
            <Route path="permissions" element={<EmployeePermissions />} />
            <Route path="salary" element={<EmployeeSalary />} />
          </Route>

          <Route path="/admin" element={
            <PrivateRoute role="ADMIN">
              <AdminLayout />
            </PrivateRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="employees" element={<AdminEmployees />} />
            <Route path="employees/:id/attendance" element={<AdminEmployeeAttendance />} />
            <Route path="permissions" element={<AdminPermissions />} />
            <Route path="payroll" element={<AdminPayroll />} />
            <Route path="payroll/:id" element={<AdminEmployeePayrollDetail />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
