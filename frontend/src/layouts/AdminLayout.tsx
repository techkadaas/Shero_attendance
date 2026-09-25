import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Users, CalendarDays, Menu, X, Settings, Clock4, ShieldCheck } from 'lucide-react';
import { AttendanceReminderAndPWA } from '../components/common/AttendanceReminderAndPWA';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: CalendarDays },
    { name: 'Employees', path: '/admin/employees', icon: Users },
    { name: 'Permissions', path: '/admin/permissions', icon: Clock4 },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      <AttendanceReminderAndPWA />
      {/* Top Header */}
      <header className="bg-white/85 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200/80 shadow-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">

            {/* Brand Logo & Desktop Segmented Navigation */}
            <div className="flex items-center space-x-8">
              <Link to="/admin" className="flex items-center space-x-3 group">
                <div className="h-9 px-2 bg-slate-50 border border-slate-200/80 rounded-xl shadow-2xs group-hover:scale-105 transition-transform flex items-center justify-center">
                  <img 
                    src="/logo.png" 
                    alt="Shero Home Food" 
                    className="h-6 w-auto max-w-[100px] object-contain" 
                    onError={(e) => {
                      const target = e.target as HTMLElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'block';
                    }} 
                  />
                  <span className="hidden text-teal-700 font-extrabold text-sm tracking-tight">SHERO</span>
                </div>
                <div className="hidden md:block">
                  <span className="font-bold text-slate-900 text-sm tracking-tight block">Shero Home Food</span>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-teal-600 block -mt-0.5">Admin Workspace</span>
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

            {/* User Profile & Actions */}
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center pl-3 pr-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
                <div className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 font-bold flex items-center justify-center mr-2 text-[11px]">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="mr-2 text-left">
                  <p className="font-semibold text-slate-800 text-xs leading-none">{user?.name}</p>
                  <p className="text-[10px] text-teal-600 font-medium flex items-center mt-0.5">
                    <ShieldCheck className="w-2.5 h-2.5 mr-0.5" /> Administrator
                  </p>
                </div>
              </div>

              <button
                onClick={() => setLogoutModalOpen(true)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>

              {/* Mobile menu trigger */}
              <button
                className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Slide-Down Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-1 shadow-lg animate-slide-up">
            <div className="px-3 py-2 bg-slate-50 rounded-xl mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                <p className="text-[10px] text-teal-600 font-medium">{user?.email}</p>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-teal-100 text-teal-800">ADMIN</span>
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <Outlet />
      </main>

      {/* Logout Confirmation Modal */}
      {logoutModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-slate-100 animate-slide-up">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-8 ring-rose-50/50">
              <LogOut className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1.5">Sign Out</h2>
            <p className="text-xs text-slate-500 mb-6">Are you sure you want to end your current session?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setLogoutModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
              >
                Stay Logged In
              </button>
              <button 
                onClick={handleLogout}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminLayout;
