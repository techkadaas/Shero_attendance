import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Settings, Percent, Clock } from 'lucide-react';

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    pfEmployeeRate: 0.12,
    pfEmployerRate: 0.12,
    esiEmployeeRate: 0.0075,
    esiEmployerRate: 0.0325,
    officeStartTime: '09:00',
    officeEndTime: '18:00',
    graceMinutes: 15,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      });
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/admin/settings', settings);
      toast.success('Settings updated successfully!');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Settings className="w-6 h-6 mr-2 text-teal-600" />
        <h1 className="text-2xl font-bold text-gray-900">Statutory Settings</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">Configure the global rates for Provident Fund (PF) and Employee State Insurance (ESI). These values will be used to calculate deductions automatically during payroll processing.</p>

      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-3xl">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* PF Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Provident Fund (PF)</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee Contribution Rate</label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Percent className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={settings.pfEmployeeRate * 100}
                    onChange={(e) => setSettings({ ...settings, pfEmployeeRate: parseFloat(e.target.value) / 100 })}
                    className="focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">% of Basic</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employer Contribution Rate</label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Percent className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={settings.pfEmployerRate * 100}
                    onChange={(e) => setSettings({ ...settings, pfEmployerRate: parseFloat(e.target.value) / 100 })}
                    className="focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">% of Basic</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ESI Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Employee State Insurance (ESI)</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee Contribution Rate</label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Percent className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={settings.esiEmployeeRate * 100}
                    onChange={(e) => setSettings({ ...settings, esiEmployeeRate: parseFloat(e.target.value) / 100 })}
                    className="focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">% of Gross</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employer Contribution Rate</label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Percent className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={settings.esiEmployerRate * 100}
                    onChange={(e) => setSettings({ ...settings, esiEmployerRate: parseFloat(e.target.value) / 100 })}
                    className="focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">% of Gross</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Office Working Hours */}
          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-600" />
              <h3 className="text-lg font-semibold text-gray-900">Office Working Hours & Late Threshold</h3>
            </div>
            <p className="text-xs text-gray-500">
              Set standard business hours. Employees checking in past the start time plus grace period are marked as Late on the Admin Dashboard.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Office Start Time</label>
                <input
                  type="time"
                  required
                  value={settings.officeStartTime}
                  onChange={(e) => setSettings({ ...settings, officeStartTime: e.target.value })}
                  className="focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Office End Time</label>
                <input
                  type="time"
                  required
                  value={settings.officeEndTime}
                  onChange={(e) => setSettings({ ...settings, officeEndTime: e.target.value })}
                  className="focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period (Minutes)</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  required
                  value={settings.graceMinutes}
                  onChange={(e) => setSettings({ ...settings, graceMinutes: parseInt(e.target.value) || 0 })}
                  className="focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminSettings;
