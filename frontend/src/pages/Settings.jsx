import React, { useState, useEffect } from 'react';
import { 
  User, Bell, Camera, Settings as SettingsIcon, 
  Shield, Download, Trash2, Mail, Smartphone,
  Briefcase, AlignLeft, Target, Zap, Save,
  Volume2, Languages, Clock, Eye, Moon, Monitor,
  SmartphoneNfc, CalendarDays, Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, writeBatch } from 'firebase/firestore';

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // --- STATE MANAGEMENT ---
  const [profile, setProfile] = useState({ 
    name: user?.displayName || '', 
    email: user?.email || '', 
    title: 'Productivity Enthusiast',
    bio: '',
    avatar: user?.photoURL || '' 
  });

  const [preferences, setPreferences] = useState({
    emailNotifs: true,
    pushNotifs: false,
    dailyGoal: 5,
    focusMode: false,
    soundEffects: true,
    hapticFeedback: true,
    privacyMode: false,
    language: 'English',
    dateFormat: 'DD/MM/YYYY',
    workStart: '09:00',
    workEnd: '17:00',
    focusDuration: 25,
    theme: 'system' 
  });

  // ✅ 1. Fetch Settings
  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, 'users', user.uid, 'settings', 'config');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile(prev => ({ ...prev, ...data.profile }));
          setPreferences(prev => ({ ...prev, ...data.preferences }));
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [user]);

  // ✅ 2. Universal Save Handler
  const saveAll = async (newProfile = profile, newPrefs = preferences) => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'config'), {
        profile: newProfile,
        preferences: newPrefs
      }, { merge: true });
      
      setTimeout(() => setSaving(false), 800);
    } catch (error) {
      console.error("Error saving:", error);
      setSaving(false);
    }
  };

  const handleProfileChange = (e) => {
    const updated = { ...profile, [e.target.name]: e.target.value };
    setProfile(updated);
  };

  const handlePrefChange = (key, value) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    saveAll(profile, updated); 
  };

  const handleBlur = () => {
    saveAll(profile, preferences);
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const updated = { ...profile, avatar: reader.result };
      setProfile(updated);
      saveAll(updated, preferences);
    };
    reader.readAsDataURL(file);
  };

  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ profile, preferences }));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "focusflow_settings.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const resetData = async () => {
    if (!window.confirm("DANGER: This will delete ALL data. Are you sure?")) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const collections = ['tasks', 'habits'];
      for (const col of collections) {
        const q = await getDocs(collection(db, 'users', user.uid, col));
        q.forEach((doc) => batch.delete(doc.ref));
      }
      await batch.commit();
      alert("All data wiped.");
    } catch (e) {
      alert("Error resetting data.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500 animate-pulse font-bold uppercase tracking-widest">Loading preferences...</div>;

  const sectionClass = "bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-[24px] p-6 md:p-8 shadow-sm transition-all duration-300";
  const inputClass = "w-full rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-sm font-bold";
  const labelClass = "text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 block";

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <SettingsIcon className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Settings</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">Configure your productivity engine</p>
          </div>
        </div>
        
        <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-opacity duration-300 ${saving ? 'opacity-100 text-indigo-500' : 'opacity-0'}`}>
          <Save size={14} className="animate-bounce" /> Saved
        </div>
      </div>

      {/* 1. PROFILE SECTION */}
      <section className={sectionClass}>
        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 dark:border-white/10 pb-4">
          <User className="text-indigo-500" size={20} />
          <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Profile</h2>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 flex items-center justify-center group-hover:border-indigo-500 transition-colors">
              {profile.avatar ? (
                <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="text-slate-400" size={40} />
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-2 bg-indigo-600 rounded-full text-white cursor-pointer hover:bg-indigo-700 transition shadow-lg border-2 border-white dark:border-black transform group-hover:scale-110">
              <Camera size={14} />
              <input type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
            </label>
          </div>
          <div className="text-center md:text-left">
            <h3 className="font-black text-slate-900 dark:text-white text-xl uppercase tracking-tighter">{profile.name || "Anonymous User"}</h3>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className={labelClass}>Full Name</label>
            <input name="name" value={profile.name} onChange={handleProfileChange} onBlur={handleBlur} className={inputClass} placeholder="JOHN DOE" />
          </div>
          <div>
            <label className={labelClass}>Job Title</label>
            <div className="relative">
              <Briefcase className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input name="title" value={profile.title} onChange={handleProfileChange} onBlur={handleBlur} className={`${inputClass} pl-11`} placeholder="PRODUCT DESIGNER" />
            </div>
          </div>
        </div>
        
        <div>
          <label className={labelClass}>Bio</label>
          <div className="relative">
            <AlignLeft className="absolute left-4 top-3.5 text-slate-400" size={18} />
            <textarea name="bio" value={profile.bio} onChange={handleProfileChange} onBlur={handleBlur} rows="3" className={`${inputClass} pl-11 resize-none font-bold uppercase`} placeholder="YOUR PRODUCTIVITY MANTRA" />
          </div>
        </div>
      </section>

      {/* 2. CORE PRODUCTIVITY */}
      <section className={sectionClass}>
         <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-white/10 pb-4">
          <Target className="text-emerald-500" size={20} />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Productivity Engine</h2>
        </div>

        <div className="space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="flex justify-between mb-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Daily Task Goal</label>
                  <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 px-2 py-1 rounded uppercase">{preferences.dailyGoal} Tasks</span>
                </div>
                <input type="range" min="1" max="20" value={preferences.dailyGoal} onChange={(e) => handlePrefChange('dailyGoal', parseInt(e.target.value))} className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
              </div>
              <div>
                <div className="flex justify-between mb-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Focus Session</label>
                  <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded uppercase">{preferences.focusDuration} Minutes</span>
                </div>
                <input type="range" min="5" max="90" step="5" value={preferences.focusDuration} onChange={(e) => handlePrefChange('focusDuration', parseInt(e.target.value))} className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
              <div>
                <label className={labelClass}>Work Schedule Start</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-3 text-slate-400" size={16} />
                  <input type="time" value={preferences.workStart} onChange={(e) => handlePrefChange('workStart', e.target.value)} className={`${inputClass} pl-11`} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Work Schedule End</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-3 text-slate-400" size={16} />
                  <input type="time" value={preferences.workEnd} onChange={(e) => handlePrefChange('workEnd', e.target.value)} className={`${inputClass} pl-11`} />
                </div>
              </div>
              <p className="col-span-full text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                Schedule optimizes Focus Mode and automation triggers.
              </p>
           </div>
        </div>
      </section>

      {/* 3. INTERFACE & FEEDBACK */}
      <section className={sectionClass}>
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-white/10 pb-4">
          <Eye className="text-indigo-500" size={20} />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Experience</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'focusMode', label: 'Auto-Focus', icon: <Zap className="text-amber-500" /> },
            { key: 'soundEffects', label: 'Audio Feedback', icon: <Volume2 className="text-blue-500" /> },
            { key: 'hapticFeedback', label: 'Haptic Response', icon: <SmartphoneNfc className="text-emerald-500" /> },
            { key: 'privacyMode', label: 'Session Privacy', icon: <Lock className="text-indigo-500" /> },
            { key: 'emailNotifs', label: 'Email Digest', icon: <Mail className="text-indigo-500" /> },
            { key: 'pushNotifs', label: 'Push Alerts', icon: <Smartphone className="text-rose-500" /> },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-black rounded-lg shadow-sm">{item.icon}</div>
                <p className="font-black text-slate-900 dark:text-white text-[10px] uppercase tracking-widest">{item.label}</p>
              </div>
              <button
                onClick={() => handlePrefChange(item.key, !preferences[item.key])}
                className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${preferences[item.key] ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-white/10'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${preferences[item.key] ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          ))}

          <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
             <div className="flex items-center gap-3 mb-3">
                <CalendarDays className="text-blue-500" size={18} />
                <p className="font-black text-slate-900 dark:text-white text-[10px] uppercase tracking-widest">Date Format</p>
             </div>
             <div className="flex gap-2">
                {['DD/MM/YYYY', 'MM/DD/YYYY'].map(format => (
                  <button key={format} onClick={() => handlePrefChange('dateFormat', format)} className={`flex-1 py-2 text-[9px] font-black rounded-lg border transition-all ${preferences.dateFormat === format ? 'bg-indigo-600 text-white border-transparent' : 'bg-white dark:bg-black border-slate-200 dark:border-white/10 text-slate-500'}`}>
                    {format}
                  </button>
                ))}
             </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
             <div className="flex items-center gap-3 mb-3">
                <Languages className="text-emerald-500" size={18} />
                <p className="font-black text-slate-900 dark:text-white text-[10px] uppercase tracking-widest">System Language</p>
             </div>
             <select 
                value={preferences.language} 
                onChange={(e) => handlePrefChange('language', e.target.value)}
                className="w-full bg-white dark:bg-black p-2 text-[9px] font-black text-indigo-500 border border-slate-200 dark:border-white/10 rounded-lg uppercase tracking-widest outline-none cursor-pointer"
              >
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
              </select>
          </div>
        </div>
      </section>

      {/* 4. DATA SECURITY */}
      <section className={`${sectionClass} border-red-100 dark:border-red-900/20`}>
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-white/10 pb-4">
          <Shield className="text-red-500" size={20} />
          <h2 className="text-lg font-bold text-red-600 dark:text-red-400 uppercase tracking-tighter">Danger Zone</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button onClick={exportData} className="flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-slate-900 dark:text-white font-black text-[10px] uppercase tracking-widest transition-all">
            <Download size={18} /> JSON Export
          </button>
          <button onClick={resetData} className="flex items-center justify-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-black text-[10px] uppercase tracking-widest transition-all">
            <Trash2 size={18} /> Purge Account
          </button>
        </div>
      </section>

    </div>
  );
};

export default Settings;