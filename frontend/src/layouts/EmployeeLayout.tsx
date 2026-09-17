import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, CalendarDays, Clock, IndianRupee, Clock4, UserCheck } from 'lucide-react';

const EmployeeLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Attendance', path: '/employee', icon: Clock },
    { name: 'History', path: '/employee/attendance', icon: CalendarDays },
    { name: 'Permissions', path: '/employee/permissions', icon: Clock4 },
    { name: 'Salary', path: '/employee/salary', icon: IndianRupee },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans pb-20 md:pb-0">
      {/* Desktop & Mobile Header */}
      <header className="bg-white/85 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200/80 shadow-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">

            {/* Brand Logo & Desktop Nav */}
            <div className="flex items-center space-x-8">
              <Link to="/employee" className="flex items-center space-x-3 group">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 p-0.5 shadow-sm group-hover:scale-105 transition-transform flex items-center justify-center">
                  <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center overflow-hidden">
                    <img src="/logo.png" alt="Shero Home Food" className="h-6 object-contain" onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }} />
                    <span className="text-teal-700 font-extrabold text-sm tracking-tight">SH</span>
                  </div>
                </div>
                <div>
                  <span className="font-bold text-slate-900 text-sm tracking-tight block">Shero Home Food</span>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-teal-600 block -mt-0.5">Staff Portal</span>
                </div>
              </Link>

              {/* Desktop Nav Pills */}
              <nav className="hidden md:flex items-center space-x-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                        isActive
                          ? 'bg-white text-teal-700 shadow-sm border border-slate-200/50'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 mr-1.5 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Profile Info & Logout */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center pl-3 pr-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
                <div className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 font-bold flex items-center justify-center mr-2 text-[11px]">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'E'}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-800 text-xs leading-none">{user?.name}</p>
                  <p className="text-[10px] font-mono text-slate-500 mt-0.5">{user?.employeeId}</p>
                </div>
              </div>

              <button
                onClick={() => setLogoutModalOpen(true)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 animate-fade-in">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar (Fitts's Law Ergonomic Touch Targets) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 shadow-lg">
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-semibold transition-all ${
                  isActive
                    ? 'text-teal-700 bg-teal-50/80'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {logoutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-slate-100 animate-slide-up">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-8 ring-rose-50/50">
              <LogOut className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1.5">Sign Out</h2>
            <p className="text-xs text-slate-500 mb-6">Are you sure you want to log out from your portal?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setLogoutModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleLogout}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeLayout;
