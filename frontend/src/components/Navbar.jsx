import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext'; 
import { 
  ChevronDown, Menu, LogOut, Settings, User, Palette, 
  Moon, Sun, Check, Clock, SunMedium, Sparkles, Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const { darkMode, setDarkMode, accentColor, setAccentColor, theme } = useTheme();
  
  // --- STATE ---
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isBrightnessOpen, setIsBrightnessOpen] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Refs for clicking outside
  const profileRef = useRef(null);
  const themeRef = useRef(null);
  const brightnessRef = useRef(null);

  // --- EFFECTS ---

  // 1. Live Clock Update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Apply Hardware-style Brightness Filter
  useEffect(() => {
    document.documentElement.style.filter = `brightness(${brightness}%)`;
    return () => { document.documentElement.style.filter = 'none'; };
  }, [brightness]);

  // 3. Click Outside Listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) setIsProfileOpen(false);
      if (themeRef.current && !themeRef.current.contains(event.target)) setIsThemeOpen(false);
      if (brightnessRef.current && !brightnessRef.current.contains(event.target)) setIsBrightnessOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Formatters
  const formatDate = (date) => date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const colors = [
    { id: 'indigo', bg: 'bg-indigo-600' },
    { id: 'blue',   bg: 'bg-blue-600' },
    { id: 'emerald',bg: 'bg-emerald-600' },
    { id: 'rose',   bg: 'bg-rose-600' },
    { id: 'amber',  bg: 'bg-amber-500' },
    { id: 'violet', bg: 'bg-violet-600' },
  ];

  return (
    <header className="h-20 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 transition-all duration-500
      bg-white/70 dark:bg-black/70 backdrop-blur-2xl 
      border-b border-slate-200 dark:border-zinc-900 text-slate-600 dark:text-zinc-400">
      
      {/* LEFT: Mobile Menu & Intelligence Clock */}
      <div className="flex items-center gap-6 shrink-0">
        <button 
          onClick={toggleSidebar}
          className="p-3 md:hidden text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-2xl transition-all active:scale-90"
        >
          <Menu size={24} />
        </button>

        <div className="hidden sm:flex items-center gap-4">
          <div className="flex flex-col leading-none">
            <span className="text-[10px] font-black text-slate-400 dark:text-zinc-600 uppercase tracking-[0.2em] mb-1.5">
              {formatDate(currentTime)}
            </span>
            <div className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-white tracking-tighter">
              <Clock size={16} className={theme.text} />
              <span>{formatTime(currentTime)}</span>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-zinc-800" />
          <div className="hidden lg:block">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1">
              <Sparkles size={12} /> System Active
            </p>
            <p className="text-xs font-bold text-slate-500 dark:text-zinc-500">Welcome back, {user?.displayName?.split(' ')[0] || 'User'}</p>
          </div>
        </div>
      </div>

      {/* RIGHT: Tools & Global Controls */}
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        
        {/* BRIGHTNESS CONTROL */}
        <div className="relative" ref={brightnessRef}>
          <button 
            onClick={() => setIsBrightnessOpen(!isBrightnessOpen)}
            className={`p-3 rounded-2xl transition-all duration-300 ${isBrightnessOpen ? `bg-zinc-100 dark:bg-zinc-900 ${theme.text} scale-110 shadow-lg` : 'hover:bg-slate-100 dark:hover:bg-zinc-900'}`}
          >
            <SunMedium size={22} />
          </button>

          {isBrightnessOpen && (
            <div className="absolute top-full right-0 mt-4 w-72 bg-white dark:bg-zinc-950 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-zinc-800 p-6 animate-in slide-in-from-top-2 duration-300">
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Luminance</span>
                <span className={`text-xs font-black px-2 py-1 rounded-lg ${theme.badge}`}>{brightness}%</span>
              </div>
              <div className="relative flex items-center group">
                <SunMedium size={14} className="absolute left-0 text-zinc-500 group-hover:text-amber-500 transition-colors" />
                <input 
                  type="range" min="20" max="100" value={brightness} 
                  onChange={(e) => setBrightness(e.target.value)}
                  className="w-full h-1.5 ml-8 bg-slate-100 dark:bg-zinc-800 rounded-full appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
              <p className="text-[9px] text-zinc-500 font-bold mt-4 uppercase tracking-tighter text-center italic">Protects eyes in low-light environments</p>
            </div>
          )}
        </div>

        {/* CUSTOMIZATION ENGINE */}
        <div className="relative" ref={themeRef}>
          <button 
            onClick={() => setIsThemeOpen(!isThemeOpen)}
            className={`p-3 rounded-2xl transition-all duration-300 ${isThemeOpen ? `bg-zinc-100 dark:bg-zinc-900 ${theme.text} scale-110 shadow-lg` : 'hover:bg-slate-100 dark:hover:bg-zinc-900'}`}
          >
            <Palette size={22} />
          </button>

          {isThemeOpen && (
            <div className="absolute top-full right-0 mt-4 w-72 bg-white dark:bg-zinc-950 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-zinc-800 p-2 animate-in slide-in-from-top-2 duration-300">
              <div className="p-4">
                <p className="text-[10px] font-black text-slate-400 dark:text-zinc-600 uppercase tracking-widest mb-4">Visual Mode</p>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-black p-1 rounded-2xl">
                  <button onClick={() => setDarkMode(false)} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${!darkMode ? 'bg-white shadow-xl text-indigo-600' : 'text-slate-500'}`}><Sun size={14} /> Light</button>
                  <button onClick={() => setDarkMode(true)} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${darkMode ? 'bg-zinc-900 shadow-xl text-white' : 'text-slate-500'}`}><Moon size={14} /> Dark</button>
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 dark:border-zinc-900">
                <p className="text-[10px] font-black text-slate-400 dark:text-zinc-600 uppercase tracking-widest mb-4">Accent Engine</p>
                <div className="grid grid-cols-6 gap-2">
                  {colors.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setAccentColor(c.id)}
                      className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center transition-all hover:scale-125 active:scale-90 ${accentColor === c.id ? 'ring-2 ring-offset-2 ring-slate-300 dark:ring-offset-black scale-110 shadow-lg' : 'opacity-60'}`}
                    >
                      {accentColor === c.id && <Check size={14} className="text-white" strokeWidth={4} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-10 w-px bg-slate-200 dark:bg-zinc-900 mx-2 hidden md:block" />

        {/* AUTHENTICATED PROFILE */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 p-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-zinc-900 transition-all pr-4 group"
          >
            <div className="relative">
              <img src={user?.photoURL || 'https://via.placeholder.com/150'} className="h-10 w-10 rounded-2xl object-cover ring-2 ring-white dark:ring-zinc-900 transition-transform group-hover:scale-110 shadow-lg" alt="avatar" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-black rounded-full" />
            </div>
            <div className="hidden md:flex flex-col items-start leading-none">
              <span className="text-[10px] font-black text-slate-900 dark:text-white tracking-tight uppercase">{user?.displayName?.split(' ')[0] || 'Member'}</span>
              <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest mt-1">Level 12</span>
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isProfileOpen && (
            <div className="absolute top-full right-0 mt-4 w-60 bg-white dark:bg-zinc-950 rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.4)] border border-slate-200 dark:border-zinc-800 overflow-hidden animate-in slide-in-from-top-2 duration-300">
              <div className="p-6 border-b border-slate-100 dark:border-zinc-900 flex flex-col items-center">
                <img src={user?.photoURL} className="w-16 h-16 rounded-[24px] mb-3 shadow-xl" alt="profile" />
                <p className="text-sm font-black text-slate-900 dark:text-white truncate uppercase tracking-tighter">{user?.displayName}</p>
                <div className="flex items-center gap-1 mt-1">
                   <Zap size={10} className="text-amber-500 fill-amber-500" />
                   <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Pro Ecosystem</p>
                </div>
              </div>
              <div className="p-2">
                <Link to="/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-xs font-black uppercase text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-2xl transition-colors">
                  <User size={16} className={theme.text} /> Profile Dashboard
                </Link>
                <Link to="/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-xs font-black uppercase text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-2xl transition-colors">
                  <Settings size={16} className={theme.text} /> OS Settings
                </Link>
              </div>
              <div className="p-2 border-t border-slate-100 dark:border-zinc-900">
                <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl transition-colors">
                  <LogOut size={16} /> Secure Logout
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export default Navbar;