import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { 
  Settings, 
  Percent, 
  Clock, 
  ShieldCheck, 
  HelpCircle, 
  Save, 
  RefreshCw, 
  Calculator,
  AlertCircle,
  MapPin,
  Navigation,
  Building2,
  Compass
} from 'lucide-react';

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    pfEmployeeRate: 0.12,
    pfEmployerRate: 0.12,
    esiEmployeeRate: 0.0075,
    esiEmployerRate: 0.0325,
    officeStartTime: '09:00',
    officeEndTime: '18:00',
    graceMinutes: 15,
    officeLocation: {
      latitude: 13.0827,
      longitude: 80.2707,
      radiusMeters: 500,
      address: 'Shero Home Food Head Office',
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [sampleSalary, setSampleSalary] = useState(25000);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/admin/settings');
      setSettings({
        ...res.data,
        officeStartTime: res.data.officeStartTime || '09:00',
        officeEndTime: res.data.officeEndTime || '18:00',
        graceMinutes: res.data.graceMinutes ?? 15,
        officeLocation: {
          latitude: res.data.officeLocation?.latitude ?? 13.0827,
          longitude: res.data.officeLocation?.longitude ?? 80.2707,
          radiusMeters: res.data.officeLocation?.radiusMeters ?? 500,
          address: res.data.officeLocation?.address || 'Shero Home Food Head Office',
        },
      });
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setSettings((prev) => ({
          ...prev,
          officeLocation: {
            ...prev.officeLocation,
            latitude: Number(latitude.toFixed(6)),
            longitude: Number(longitude.toFixed(6)),
          },
        }));
        setDetectingLocation(false);
        toast.success(`Current GPS coordinates captured! (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
      },
      (err) => {
        setDetectingLocation(false);
        toast.error('Unable to retrieve location. Please allow browser location access.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/admin/settings', settings);
      toast.success('System settings updated successfully!');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  // Quick live simulator calculations
  const sampleBasic = sampleSalary * 0.5; // typical 50% basic
  const simPfEmployee = sampleBasic * settings.pfEmployeeRate;
  const simPfEmployer = sampleBasic * settings.pfEmployerRate;
  const simEsiEmployee = sampleSalary <= 21000 ? sampleSalary * settings.esiEmployeeRate : 0;
  const simEsiEmployer = sampleSalary <= 21000 ? sampleSalary * settings.esiEmployerRate : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <div className="w-10 h-10 border-4 border-teal-500/20 border-t-teal-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Loading system configurations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-semibold uppercase tracking-wider mb-3">
            <Settings className="w-3.5 h-3.5" />
            Global Configurations
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-white">
            System & Geofence Settings
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Configure automated compliance deductions, shift benchmarks, and set office geofencing for WFO employees.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <button
            type="button"
            onClick={fetchSettings}
            className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Office Geolocation & Geofencing Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 sm:p-8 space-y-6 hover:shadow-card-hover transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold shadow-xs">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  Office Geofence & Location Boundary
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded-full border border-teal-200/80">
                    WFO Security
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  WFO employees can only log in and mark attendance within this physical office perimeter.
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={detectingLocation}
              className="px-4 py-2 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 active:scale-95 shrink-0"
            >
              <Navigation className={`w-3.5 h-3.5 text-teal-600 ${detectingLocation ? 'animate-spin' : ''}`} />
              {detectingLocation ? 'Detecting GPS...' : 'Use My Current Location'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Office Name / Address Label</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={settings.officeLocation.address}
                  onChange={(e) => setSettings({
                    ...settings,
                    officeLocation: { ...settings.officeLocation, address: e.target.value }
                  })}
                  className="form-input pl-10"
                  placeholder="e.g. Shero HQ, Anna Nagar, Chennai"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Displayed to employees during geofence verification.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Latitude</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Compass className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={settings.officeLocation.latitude}
                  onChange={(e) => setSettings({
                    ...settings,
                    officeLocation: { ...settings.officeLocation, latitude: parseFloat(e.target.value) || 0 }
                  })}
                  className="form-input pl-10 font-mono font-medium text-slate-800"
                  placeholder="13.0827"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">GPS latitude coordinate</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Longitude</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Compass className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={settings.officeLocation.longitude}
                  onChange={(e) => setSettings({
                    ...settings,
                    officeLocation: { ...settings.officeLocation, longitude: parseFloat(e.target.value) || 0 }
                  })}
                  className="form-input pl-10 font-mono font-medium text-slate-800"
                  placeholder="80.2707"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">GPS longitude coordinate</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Allowed Geofence Radius (Meters)</label>
              <div className="relative">
                <input
                  type="number"
                  min="20"
                  max="10000"
                  step="10"
                  required
                  value={settings.officeLocation.radiusMeters}
                  onChange={(e) => setSettings({
                    ...settings,
                    officeLocation: { ...settings.officeLocation, radiusMeters: parseInt(e.target.value) || 100 }
                  })}
                  className="form-input font-mono font-bold text-slate-800"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                  <span className="text-xs text-slate-400 font-medium">meters</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Distance allowance from center coordinate (e.g. 500m).</p>
            </div>

            <div className="sm:col-span-2 flex items-center">
              <div className="w-full bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-start gap-2.5 text-xs text-slate-600">
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">Policy Rules:</span>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-500 text-[11px]">
                    <li><strong className="text-teal-700">WFO Employees:</strong> Blocked from logging in or punching in if outside the {settings.officeLocation.radiusMeters}m office radius.</li>
                    <li><strong className="text-indigo-700">WFH Employees:</strong> Can log in and punch in from any location without geofencing restrictions.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statutory PF & ESI Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* PF Settings Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    PF
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Provident Fund (PF)</h3>
                    <p className="text-xs text-slate-500">Calculated on Employee Basic Salary</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200/60">
                  EPFO Compliant
                </span>
              </div>

              <div className="space-y-4 pt-5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">Employee Contribution Rate</label>
                    <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                      {(settings.pfEmployeeRate * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Percent className="h-4 w-4" />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                      value={Number((settings.pfEmployeeRate * 100).toFixed(4))}
                      onChange={(e) => setSettings({ ...settings, pfEmployeeRate: (parseFloat(e.target.value) || 0) / 100 })}
                      className="form-input pl-10 pr-24 font-mono font-medium"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      <span className="text-xs text-slate-400 font-medium">% of Basic</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Standard statutory employee deduction is typically 12%.</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">Employer Contribution Rate</label>
                    <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                      {(settings.pfEmployerRate * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Percent className="h-4 w-4" />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                      value={Number((settings.pfEmployerRate * 100).toFixed(4))}
                      onChange={(e) => setSettings({ ...settings, pfEmployerRate: (parseFloat(e.target.value) || 0) / 100 })}
                      className="form-input pl-10 pr-24 font-mono font-medium"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      <span className="text-xs text-slate-400 font-medium">% of Basic</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Direct company contribution credited towards employee provident fund.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-start gap-2.5 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>Deductions update automatically during monthly payroll generation.</span>
            </div>
          </div>

          {/* ESI Settings Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    ESI
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">State Insurance (ESI)</h3>
                    <p className="text-xs text-slate-500">Calculated on Total Gross Earnings</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-200/60">
                  ESIC Standard
                </span>
              </div>

              <div className="space-y-4 pt-5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">Employee Contribution Rate</label>
                    <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                      {(settings.esiEmployeeRate * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Percent className="h-4 w-4" />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                      value={Number((settings.esiEmployeeRate * 100).toFixed(4))}
                      onChange={(e) => setSettings({ ...settings, esiEmployeeRate: (parseFloat(e.target.value) || 0) / 100 })}
                      className="form-input pl-10 pr-24 font-mono font-medium"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      <span className="text-xs text-slate-400 font-medium">% of Gross</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Statutory employee health insurance rate is typically 0.75%.</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">Employer Contribution Rate</label>
                    <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                      {(settings.esiEmployerRate * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Percent className="h-4 w-4" />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                      value={Number((settings.esiEmployerRate * 100).toFixed(4))}
                      onChange={(e) => setSettings({ ...settings, esiEmployerRate: (parseFloat(e.target.value) || 0) / 100 })}
                      className="form-input pl-10 pr-24 font-mono font-medium"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      <span className="text-xs text-slate-400 font-medium">% of Gross</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Company insurance contribution rate is typically 3.25%.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-start gap-2.5 text-xs text-slate-600">
              <HelpCircle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <span>Gross monthly salary exceeding ₹21,000 is automatically exempted from ESI.</span>
            </div>
          </div>

        </div>

        {/* Office Working Hours & Late Grace Period */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6 hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Shift Timings & Grace Policy</h3>
                <p className="text-xs text-slate-500">Defines the benchmark times used for attendance status and late arrivals</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/60">
              <AlertCircle className="w-3.5 h-3.5" />
              Applies to all employee check-ins
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Office Start Time</label>
              <div className="relative">
                <input
                  type="time"
                  required
                  value={settings.officeStartTime}
                  onChange={(e) => setSettings({ ...settings, officeStartTime: e.target.value })}
                  className="form-input font-mono font-semibold text-slate-800 text-sm"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Official morning duty commencement.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Office End Time</label>
              <div className="relative">
                <input
                  type="time"
                  required
                  value={settings.officeEndTime}
                  onChange={(e) => setSettings({ ...settings, officeEndTime: e.target.value })}
                  className="form-input font-mono font-semibold text-slate-800 text-sm"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Official daily wrap-up time.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Late Grace Threshold (Minutes)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="120"
                  required
                  value={settings.graceMinutes}
                  onChange={(e) => setSettings({ ...settings, graceMinutes: parseInt(e.target.value) || 0 })}
                  className="form-input font-mono font-semibold text-slate-800 text-sm"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Minutes after start time before check-in is flagged Late.</p>
            </div>
          </div>

          {/* Visual Shift Timeline representation */}
          <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Shift Timeline Visualization</span>
              <span className="text-slate-500 font-mono">
                Duration: {
                  (() => {
                    const [sH, sM] = settings.officeStartTime.split(':').map(Number);
                    const [eH, eM] = settings.officeEndTime.split(':').map(Number);
                    let diff = (eH * 60 + eM) - (sH * 60 + sM);
                    if (diff < 0) diff += 24 * 60;
                    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
                  })()
                }
              </span>
            </div>
            
            <div className="relative h-6 bg-slate-200/80 rounded-full overflow-hidden flex items-center p-1">
              <div className="h-full bg-emerald-500 rounded-l-full flex items-center justify-center text-[10px] text-white font-bold px-2" style={{ width: '25%' }}>
                On Time ({settings.officeStartTime})
              </div>
              <div className="h-full bg-amber-400 flex items-center justify-center text-[10px] text-slate-900 font-bold px-2" style={{ width: '20%' }}>
                Grace ({settings.graceMinutes}m)
              </div>
              <div className="h-full bg-rose-400/80 flex items-center justify-center text-[10px] text-white font-bold px-2" style={{ width: '30%' }}>
                Late Check-In
              </div>
              <div className="h-full bg-teal-600 rounded-r-full flex items-center justify-center text-[10px] text-white font-bold px-2 flex-1">
                Checkout ({settings.officeEndTime})
              </div>
            </div>
          </div>
        </div>

        {/* Live Statutory Preview Simulator */}
        <div className="bg-gradient-to-br from-teal-50/70 via-emerald-50/40 to-slate-50 rounded-2xl border border-teal-100 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Live Deduction Simulator</h4>
                <p className="text-xs text-slate-500">Preview calculated deductions on sample salary figures</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Sample Gross:</span>
              <div className="relative w-32">
                <span className="absolute inset-y-0 left-2.5 flex items-center text-xs text-slate-400">₹</span>
                <input
                  type="number"
                  step="1000"
                  value={sampleSalary}
                  onChange={(e) => setSampleSalary(parseFloat(e.target.value) || 0)}
                  className="w-full pl-6 pr-2 py-1 text-xs font-mono font-bold bg-white rounded-lg border border-teal-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-white/90 p-3 rounded-xl border border-teal-100 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">Basic (50%)</span>
              <p className="text-sm font-bold font-mono text-slate-800 mt-0.5">₹{sampleBasic.toLocaleString()}</p>
            </div>
            <div className="bg-white/90 p-3 rounded-xl border border-teal-100 shadow-xs">
              <span className="text-[11px] font-medium text-blue-600">PF (Employee)</span>
              <p className="text-sm font-bold font-mono text-slate-800 mt-0.5">₹{simPfEmployee.toFixed(0)}</p>
            </div>
            <div className="bg-white/90 p-3 rounded-xl border border-teal-100 shadow-xs">
              <span className="text-[11px] font-medium text-purple-600">ESI (Employee)</span>
              <p className="text-sm font-bold font-mono text-slate-800 mt-0.5">
                {simEsiEmployee > 0 ? `₹${simEsiEmployee.toFixed(0)}` : 'Exempt (>₹21k)'}
              </p>
            </div>
            <div className="bg-white/90 p-3 rounded-xl border border-emerald-200 shadow-xs">
              <span className="text-[11px] font-semibold text-emerald-700">Estimated Net Pay</span>
              <p className="text-sm font-bold font-mono text-emerald-700 mt-0.5">
                ₹{(sampleSalary - simPfEmployee - simEsiEmployee).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary px-8 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold shadow-lg shadow-teal-700/20 active:scale-95 transition-all"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save System Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminSettings;


