
import React, { useState, useEffect } from 'react';
import { db, formatError } from '../services/db.service';
import { MinistryService } from '../services/ministry.service';
import { AppSettings, UserSession } from '../types';
import { audio } from '../services/audio.service';
import { Settings, Save, AlertTriangle, Star, CheckCircle, Flame, RefreshCcw } from 'lucide-react';

const ControlCenterPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Danger Zone States
  const [isSweeping, setIsSweeping] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Identify User for Audit Logs
  const sessionStr = localStorage.getItem('km_session');
  const user: UserSession | null = sessionStr ? JSON.parse(sessionStr) : null;
  const actor = user?.username || 'ADMIN';

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await db.getSettings();
      setSettings(data);
    } catch (err: any) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setError('');
    setSuccess('');
    audio.playClick();

    try {
      await db.updateSettings({
        matchThreshold: settings.matchThreshold,
        autoCheckoutTime: settings.autoCheckoutTime,
        allowDuplicatePoints: settings.allowDuplicatePoints
      });
      setSuccess('Settings updated successfully');
      audio.playYehey();
    } catch (err: any) {
      setError(formatError(err));
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleEndService = async () => {
    audio.playClick();
    if (!window.confirm("⚠️ END SUNDAY SERVICE?\n\nThis will MARK ABSENT for all students who did not check in today.\nThis affects their consecutive absence count and follow-up status.")) {
      return;
    }

    setIsSweeping(true);
    try {
      const result = await MinistryService.runAbsenceSweep(actor);
      
      audio.playYehey();
      alert(`✅ Service Ended Successfully.\n\nSummary:\n- ${result.absentCount} Marked Absent\n- ${result.frozenCount} Students Frozen`);
    } catch (err) {
      alert("Failed to end service: " + formatError(err));
    } finally {
      setIsSweeping(false);
    }
  };

  const handleResetSeason = async () => {
    audio.playClick();
    
    // Step 1: Confirmation
    if (!window.confirm("⚠️ ARE YOU SURE?\n\nThis will reset ALL student points to 0 for the new season.\nThis action archives existing points and cannot be undone.")) {
      return;
    }

    setIsResetting(true);
    try {
      // Step 2: Perform Batch Update (Soft Reset)
      await db.resetSeason(actor);
      
      // Step 3: Toast / Alert
      audio.playYehey();
      alert("✅ All student points have been reset to 0.");
    } catch (err) {
      alert("Reset failed: " + formatError(err));
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetDashboard = async () => {
    audio.playClick();
    if (!window.confirm("Refresh dashboard metrics? This will re-calculate stats from the database.")) return;
    window.location.reload();
  };

  if (loading) {
    return <div className="p-10 text-center animate-pulse uppercase font-black text-pink-300">Loading Configuration...</div>;
  }

  if (!settings) {
    return <div className="p-10 text-center text-red-400">Failed to load settings.</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">Control Center</h2>
          <p className="text-gray-400 font-medium uppercase tracking-widest text-[10px] mt-1">System Configuration & Admin Actions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {/* Danger Zone / Service Management */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-red-100 shadow-sm space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Flame size={120} />
          </div>
          
          <div className="flex items-center gap-3 border-b border-red-50 pb-4 relative z-10">
             <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-500">
               <AlertTriangle size={20} />
             </div>
             <h3 className="text-lg font-black text-red-500 uppercase tracking-tight">Danger Zone</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4 relative z-10">
             {/* End Service Button */}
             <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="font-black text-gray-800 uppercase text-xs tracking-wide">End Sunday Service</h4>
                  <p className="text-[10px] text-gray-500 font-bold mt-1 leading-relaxed">
                    Marks all unchecked-in students as ABSENT and updates follow-up lists. Run this once service is over.
                  </p>
                </div>
                <button 
                  onClick={handleEndService}
                  disabled={isSweeping}
                  className="w-full py-4 bg-white border border-red-200 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSweeping ? 'PROCESSING...' : 'END SERVICE / MARK ABSENCES'}
                </button>
             </div>

             {/* Reset Season Button */}
             <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="font-black text-gray-800 uppercase text-xs tracking-wide">Reset Season Points</h4>
                  <p className="text-[10px] text-gray-500 font-bold mt-1 leading-relaxed">
                    Resets all student point balances to zero for a new season. Archives old points as voided.
                  </p>
                </div>
                <button 
                  onClick={handleResetSeason}
                  disabled={isResetting}
                  className="w-full py-4 bg-white border border-red-200 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  {isResetting ? 'ARCHIVING...' : 'RESET ALL STARS'}
                </button>
             </div>
          </div>
          
          <div className="relative z-10 pt-4 border-t border-red-50">
             <button 
               onClick={handleResetDashboard}
               className="flex items-center gap-2 text-gray-400 hover:text-red-500 font-black uppercase tracking-widest text-[10px] transition-colors"
             >
               <RefreshCcw size={14} /> Refresh / Reset Dashboard View
             </button>
          </div>
        </div>

        {/* Face Recognition Settings */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-pink-50 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-pink-50 pb-4">
             <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center text-pink-500">
               <Settings size={20} />
             </div>
             <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">AI & Face Recognition</h3>
          </div>

          <div className="space-y-4">
             <div>
               <div className="flex justify-between items-center mb-2">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Match Threshold (Sensitivity)</label>
                 <span className="text-xs font-black text-pink-500 bg-pink-50 px-2 py-1 rounded-lg">{(settings.matchThreshold * 100).toFixed(0)}%</span>
               </div>
               <input 
                 type="range" 
                 min="0.5" 
                 max="0.99" 
                 step="0.01" 
                 value={settings.matchThreshold}
                 onChange={(e) => setSettings({ ...settings, matchThreshold: parseFloat(e.target.value) })}
                 className="w-full h-3 bg-gray-100 rounded-full appearance-none cursor-pointer accent-pink-500"
               />
               <p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest mt-2 leading-relaxed">
                 Higher values require a more precise face match but may fail in poor lighting. Lower values are more forgiving but may cause false positives. Recommended: 75-80%.
               </p>
             </div>
          </div>
        </div>

        {/* Attendance Automation */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-pink-50 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-pink-50 pb-4">
             <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-500">
               <Settings size={20} />
             </div>
             <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Attendance Automation</h3>
          </div>

          <div className="space-y-4">
             <div>
               <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Auto-Checkout Time</label>
               <input 
                 type="time" 
                 value={settings.autoCheckoutTime}
                 onChange={(e) => setSettings({ ...settings, autoCheckoutTime: e.target.value })}
                 className="w-full md:w-48 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 font-bold text-gray-700"
               />
               <p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest mt-2 leading-relaxed">
                 System will automatically mark students as checked-out if they are still 'Active' after this time.
               </p>
             </div>
          </div>
        </div>

        {/* Points & Rewards */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-pink-50 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-pink-50 pb-4">
             <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-500">
               <Star size={20} fill="currentColor" />
             </div>
             <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Points & Rewards</h3>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
             <div>
               <p className="text-xs font-black text-gray-700 uppercase tracking-tight">Allow Duplicate Categories</p>
               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">If enabled, teachers can award points for the same category multiple times per day.</p>
             </div>
             <button 
               onClick={() => setSettings({ ...settings, allowDuplicatePoints: !settings.allowDuplicatePoints })}
               className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.allowDuplicatePoints ? 'bg-green-500' : 'bg-gray-300'}`}
             >
               <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${settings.allowDuplicatePoints ? 'translate-x-6' : 'translate-x-0'}`} />
             </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-center animate-in shake border border-red-100">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-center animate-in zoom-in border border-green-100">
          {success}
        </div>
      )}

      <div className="flex justify-end">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-pink-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-pink-100 hover:bg-pink-600 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
        >
          {saving ? 'Saving...' : (
            <>
              <Save size={18} /> Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ControlCenterPage;
