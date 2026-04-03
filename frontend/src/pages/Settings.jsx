import { useState, useEffect, useRef } from 'react';
import {
  User, Camera, Settings as SettingsIcon, Shield, Download,
  Trash2, Target, Zap, Save, Clock, Moon, Sun, Monitor,
  Palette, Layers, Check, LogOut, Bell, Mail, Briefcase,
  AlignLeft, ChevronRight, Flame
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, writeBatch } from 'firebase/firestore';

// ── tiny reusable toggle ──────────────────────────────────────────────────────
const Toggle = ({ on, onChange }) => (
  <button onClick={() => onChange(!on)}
    className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${on ? 'bg-indigo-600' : 'bg-white/10'}`}>
    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${on ? 'translate-x-5' : ''}`} />
  </button>
);

// ── section wrapper ───────────────────────────────────────────────────────────
const Section = ({ icon, title, color = 'text-indigo-400', children }) => (
  <div className="bg-black border border-white/10 rounded-3xl p-6 space-y-5">
    <div className="flex items-center gap-3 pb-4 border-b border-white/10">
      <div className={`w-9 h-9 rounded-2xl bg-white/5 flex items-center justify-center ${color}`}>{icon}</div>
      <h2 className="font-black text-white text-sm uppercase tracking-widest">{title}</h2>
    </div>
    {children}
  </div>
);

export default function Settings() {
  const { user, logout } = useAuth();
  const { darkMode, setDarkMode, accentColor, setAccentColor, bgType, setBgType, theme } = useTheme();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef(null);

  const [profile, setProfile] = useState({
    name:   user?.displayName || '',
    email:  user?.email || '',
    title:  '',
    bio:    '',
    avatar: user?.photoURL || '',
  });

  const [prefs, setPrefs] = useState({
    dailyGoal:     5,
    focusDuration: 25,
    workStart:     '09:00',
    workEnd:       '17:00',
    emailNotifs:   true,
    pushNotifs:    false,
    soundEffects:  true,
  });

  // ── load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid, 'settings', 'config')).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.profile)  setProfile(p => ({ ...p, ...d.profile }));
        if (d.prefs)    setPrefs(p => ({ ...p, ...d.prefs }));
      }
    }).finally(() => setLoading(false));
  }, [user]);

  // ── save ──────────────────────────────────────────────────────────────────
  const save = async (newProfile = profile, newPrefs = prefs) => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'config'),
        { profile: newProfile, prefs: newPrefs }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  const handleProfileChange = e => setProfile(p => ({ ...p, [e.target.name]: e.target.value }));
  const handlePrefChange    = (k, v) => { const u = { ...prefs, [k]: v }; setPrefs(u); save(profile, u); };

  const handleAvatarUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const u = { ...profile, avatar: reader.result };
      setProfile(u); save(u, prefs);
    };
    reader.readAsDataURL(file);
  };

  const exportData = () => {
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ profile, prefs }, null, 2));
    a.download = 'focusflow_backup.json';
    a.click();
  };

  const purgeData = async () => {
    if (!window.confirm('Delete ALL tasks, habits and goals? This cannot be undone.')) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      for (const col of ['tasks', 'habits', 'goals', 'focusSessions', 'notifications']) {
        const snap = await getDocs(collection(db, 'users', user.uid, col));
        snap.forEach(d => batch.delete(d.ref));
      }
      await batch.commit();
    } finally { setLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const ACCENTS = [
    { id: 'indigo', color: 'bg-indigo-600' },
    { id: 'violet', color: 'bg-violet-600' },
    { id: 'blue',   color: 'bg-blue-600'   },
    { id: 'emerald',color: 'bg-emerald-600' },
    { id: 'rose',   color: 'bg-rose-600'   },
    { id: 'amber',  color: 'bg-amber-500'  },
  ];

  const BG_THEMES = [
    { id: 'oled',     label: 'OLED',     preview: 'bg-black' },
    { id: 'midnight', label: 'Midnight', preview: 'bg-[#0B1120]' },
    { id: 'forest',   label: 'Forest',   preview: 'bg-[#060D0D]' },
  ];

  const inputCls = "w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 transition-all placeholder:text-zinc-600 text-sm font-medium";
  const labelCls = "text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2 block";

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 ${theme.bg} rounded-2xl flex items-center justify-center shadow-lg ${theme.shadow}`}>
            <SettingsIcon className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Settings</h1>
            <p className="text-zinc-500 text-xs mt-0.5">Manage your account & preferences</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 text-xs font-black text-emerald-400 transition-all duration-300 ${saved ? 'opacity-100' : 'opacity-0'}`}>
          <Check size={14} /> Saved
        </div>
      </div>

      {/* ── 1. Profile ── */}
      <Section icon={<User size={18}/>} title="Profile">
        {/* Avatar */}
        <div className="flex items-center gap-5">
          <div className="relative group shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
              {profile.avatar
                ? <img src={profile.avatar} alt="avatar" className="w-full h-full object-cover"/>
                : <User size={32} className="text-zinc-600"/>
              }
            </div>
            <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 rounded-xl flex items-center justify-center cursor-pointer hover:bg-indigo-500 transition-colors border-2 border-black">
              <Camera size={12} className="text-white"/>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarUpload}/>
            </label>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-white text-lg truncate">{profile.name || 'Your Name'}</p>
            <p className="text-zinc-500 text-xs truncate">{user?.email}</p>
            <p className="text-zinc-600 text-xs mt-0.5">{profile.title || 'Add a title'}</p>
          </div>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Display Name</label>
            <input name="name" value={profile.name} onChange={handleProfileChange}
              onBlur={() => save()} className={inputCls} placeholder="Your name"/>
          </div>
          <div>
            <label className={labelCls}>Job Title</label>
            <div className="relative">
              <Briefcase size={15} className="absolute left-4 top-3.5 text-zinc-600"/>
              <input name="title" value={profile.title} onChange={handleProfileChange}
                onBlur={() => save()} className={`${inputCls} pl-10`} placeholder="e.g. Designer"/>
            </div>
          </div>
        </div>
        <div>
          <label className={labelCls}>Bio</label>
          <div className="relative">
            <AlignLeft size={15} className="absolute left-4 top-3.5 text-zinc-600"/>
            <textarea name="bio" value={profile.bio} onChange={handleProfileChange}
              onBlur={() => save()} rows={2}
              className={`${inputCls} pl-10 resize-none`} placeholder="Your productivity mantra..."/>
          </div>
        </div>
      </Section>

      {/* ── 2. Appearance ── */}
      <Section icon={<Palette size={18}/>} title="Appearance" color="text-violet-400">
        {/* Dark / Light */}
        <div>
          <label className={labelCls}>Mode</label>
          <div className="flex gap-2">
            {[
              { id: 'dark',   icon: <Moon size={15}/>,    label: 'Dark'   },
              { id: 'light',  icon: <Sun size={15}/>,     label: 'Light'  },
              { id: 'system', icon: <Monitor size={15}/>, label: 'System' },
            ].map(m => {
              const isActive = m.id === 'dark' ? darkMode : m.id === 'light' ? !darkMode : false;
              return (
                <button key={m.id}
                  onClick={() => { if (m.id === 'dark') setDarkMode(true); else if (m.id === 'light') setDarkMode(false); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl border text-xs font-bold transition-all ${
                    isActive ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-zinc-600 hover:text-zinc-400 hover:bg-white/5'
                  }`}>
                  {m.icon}{m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Background theme */}
        <div>
          <label className={labelCls}>Background</label>
          <div className="flex gap-2">
            {BG_THEMES.map(bg => (
              <button key={bg.id} onClick={() => setBgType(bg.id)}
                className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-2xl border text-xs font-bold transition-all ${
                  bgType === bg.id ? 'border-white/20 bg-white/10 text-white' : 'border-white/5 text-zinc-600 hover:text-zinc-400 hover:bg-white/5'
                }`}>
                <span className={`w-3 h-3 rounded-full ${bg.preview} border border-white/20 shrink-0`}/>
                {bg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Accent color */}
        <div>
          <label className={labelCls}>Accent Color</label>
          <div className="flex gap-3">
            {ACCENTS.map(a => (
              <button key={a.id} onClick={() => setAccentColor(a.id)}
                className={`w-9 h-9 rounded-xl ${a.color} flex items-center justify-center transition-all hover:scale-110 ${
                  accentColor === a.id ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-black scale-110' : ''
                }`}>
                {accentColor === a.id && <Check size={14} className="text-white" strokeWidth={3}/>}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── 3. Productivity ── */}
      <Section icon={<Target size={18}/>} title="Productivity" color="text-emerald-400">
        <div className="space-y-5">
          {/* Daily goal slider */}
          <div>
            <div className="flex justify-between mb-3">
              <label className={labelCls}>Daily Task Goal</label>
              <span className="text-xs font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg">{prefs.dailyGoal} tasks</span>
            </div>
            <input type="range" min="1" max="20" value={prefs.dailyGoal}
              onChange={e => handlePrefChange('dailyGoal', parseInt(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer accent-indigo-600 bg-white/10"/>
            <div className="flex justify-between text-[10px] text-zinc-700 mt-1"><span>1</span><span>20</span></div>
          </div>

          {/* Focus duration slider */}
          <div>
            <div className="flex justify-between mb-3">
              <label className={labelCls}>Focus Session Duration</label>
              <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">{prefs.focusDuration} min</span>
            </div>
            <input type="range" min="5" max="90" step="5" value={prefs.focusDuration}
              onChange={e => handlePrefChange('focusDuration', parseInt(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer accent-emerald-500 bg-white/10"/>
            <div className="flex justify-between text-[10px] text-zinc-700 mt-1"><span>5m</span><span>90m</span></div>
          </div>

          {/* Work hours */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
            <div>
              <label className={labelCls}>Work Start</label>
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-3.5 text-zinc-600"/>
                <input type="time" value={prefs.workStart}
                  onChange={e => handlePrefChange('workStart', e.target.value)}
                  className={`${inputCls} pl-9 dark:[color-scheme:dark]`}/>
              </div>
            </div>
            <div>
              <label className={labelCls}>Work End</label>
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-3.5 text-zinc-600"/>
                <input type="time" value={prefs.workEnd}
                  onChange={e => handlePrefChange('workEnd', e.target.value)}
                  className={`${inputCls} pl-9 dark:[color-scheme:dark]`}/>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── 4. Notifications & Sound ── */}
      <Section icon={<Bell size={18}/>} title="Notifications & Sound" color="text-yellow-400">
        <div className="space-y-3">
          {[
            { key: 'emailNotifs',  label: 'Email Digest',    sub: 'Daily summary to your inbox',   icon: <Mail size={15} className="text-indigo-400"/> },
            { key: 'pushNotifs',   label: 'Push Alerts',     sub: 'Browser push notifications',    icon: <Bell size={15} className="text-yellow-400"/> },
            { key: 'soundEffects', label: 'Sound Effects',   sub: 'Audio feedback on actions',     icon: <Zap size={15} className="text-emerald-400"/> },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/5 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">{item.icon}</div>
                <div>
                  <p className="text-sm font-bold text-white">{item.label}</p>
                  <p className="text-[10px] text-zinc-600">{item.sub}</p>
                </div>
              </div>
              <Toggle on={prefs[item.key]} onChange={v => handlePrefChange(item.key, v)}/>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 5. Account ── */}
      <Section icon={<Shield size={18}/>} title="Account" color="text-zinc-400">
        <div className="space-y-3">
          {/* Account info card */}
          <div className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 shrink-0">
              {profile.avatar
                ? <img src={profile.avatar} alt="" className="w-full h-full object-cover"/>
                : <User size={20} className="text-zinc-600 m-auto mt-2.5"/>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white truncate">{profile.name || 'User'}</p>
              <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
            </div>
            <span className="text-[10px] font-black px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg">Free</span>
          </div>

          {/* Export */}
          <button onClick={exportData}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/5 transition-colors group">
            <div className="flex items-center gap-3">
              <Download size={16} className="text-zinc-500"/>
              <div className="text-left">
                <p className="text-sm font-bold text-white">Export Data</p>
                <p className="text-[10px] text-zinc-600">Download your settings as JSON</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-zinc-700 group-hover:text-zinc-400 transition-colors"/>
          </button>

          {/* Sign out */}
          <button onClick={logout}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/5 transition-colors group">
            <div className="flex items-center gap-3">
              <LogOut size={16} className="text-zinc-500"/>
              <div className="text-left">
                <p className="text-sm font-bold text-white">Sign Out</p>
                <p className="text-[10px] text-zinc-600">Log out of your account</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-zinc-700 group-hover:text-zinc-400 transition-colors"/>
          </button>

          {/* Danger */}
          <button onClick={purgeData}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-red-500/5 border border-red-500/10 rounded-2xl hover:bg-red-500/10 transition-colors group">
            <div className="flex items-center gap-3">
              <Trash2 size={16} className="text-red-500"/>
              <div className="text-left">
                <p className="text-sm font-bold text-red-400">Delete All Data</p>
                <p className="text-[10px] text-red-500/60">Permanently wipe tasks, habits & goals</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-red-700 group-hover:text-red-500 transition-colors"/>
          </button>
        </div>
      </Section>

      {/* ── Save button ── */}
      <button onClick={() => save()}
        disabled={saving}
        className={`w-full py-4 ${theme.bg} text-white font-black rounded-2xl shadow-lg ${theme.shadow} hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm`}>
        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Save size={16}/>}
        {saving ? 'Saving...' : 'Save Changes'}
      </button>

    </div>
  );
}
