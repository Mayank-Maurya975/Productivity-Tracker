import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext'; 
import { 
  ChevronDown, Menu, LogOut, Settings, User, Palette, 
  Moon, Sun, Check, Clock, SunMedium, Sparkles, Zap, Edit2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from 'firebase/firestore'; // Added setDoc and getDoc
import { db } from '../firebase';

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const { darkMode, setDarkMode, accentColor, setAccentColor, theme } = useTheme();
  
  // --- STATE ---
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isBrightnessOpen, setIsBrightnessOpen] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [workspaceName, setWorkspaceName] = useState('');

  // Refs for clicking outside
  const profileRef = useRef(null);
  const themeRef = useRef(null);
  const brightnessRef = useRef(null);

  // --- EFFECTS ---

  // 1. Sync Workspace Name from Firestore (Real-time)
  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().workspaceName) {
        setWorkspaceName(docSnap.data().workspaceName);
      } else {
        // Fallback to Gmail Display Name if no custom workspace name exists
        setWorkspaceName(user.displayName || 'User');
      }
    });
    return () => unsubscribe();
  }, [user]);

  // 2. Live Clock Update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. Apply Hardware-style Brightness Filter
  useEffect(() => {
    document.documentElement.style.filter = `brightness(${brightness}%)`;
    return () => { document.documentElement.style.filter = 'none'; };
  }, [brightness]);

  // 4. Click Outside Listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) setIsProfileOpen(false);
      if (themeRef.current && !themeRef.current.contains(event.target)) setIsThemeOpen(false);
      if (brightnessRef.current && !brightnessRef.current.contains(event.target)) setIsBrightnessOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- HANDLERS ---
  const handleRename = async (e) => {
    e.stopPropagation(); 
    
    const currentName = workspaceName;
    const newName = prompt("Enter your new Workspace Name:", currentName);
    
    if (newName !== null && newName.trim() !== "" && newName !== currentName) {
      const formattedName = newName.trim().toUpperCase();
      const userDocRef = doc(db, 'users', user.uid);
      
      try {
        // Optimistic Update: Reflect in UI immediately
        setWorkspaceName(formattedName);
        
        // Use getDoc to see if we need to create (setDoc) or update (updateDoc)
        const docSnap = await getDoc(userDocRef);
        
        if (docSnap.exists()) {
          // If document exists, we can safely update the specific field
          await updateDoc(userDocRef, { workspaceName: formattedName });
        } else {
          // If document doesn't exist, we must create it with setDoc
          await setDoc(userDocRef, { 
            workspaceName: formattedName,
            email: user.email,
            updatedAt: new Date()
          });
        }
      } catch (err) {
        console.error("Firestore Error:", err);
        // Revert UI on failure
        setWorkspaceName(currentName);
        alert(`Sync error: ${err.message}. Check your internet or Firebase permissions.`);
      }
    }
  };

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
            <p className="text-xs font-bold text-slate-500 dark:text-zinc-500">Workspace: {workspaceName}</p>
          </div>
        </div>
      </div>

      {/* RIGHT: Tools & Global Controls */}
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        
        {/* BRIGHTNESS CONTROL */}
        <div className="relative" ref={brightnessRef}>
          <button onClick={() => setIsBrightnessOpen(!isBrightnessOpen)}
            className={`p-3 rounded-2xl transition-all duration-300 ${isBrightnessOpen ? `bg-zinc-100 dark:bg-zinc-900 ${theme.text} scale-110 shadow-lg` : 'hover:bg-slate-100 dark:hover:bg-zinc-900'}`}
          >
            <SunMedium size={22} />
          </button>
          {isBrightnessOpen && (
            <div className="absolute top-full right-0 mt-4 w-72 bg-white dark:bg-zinc-950 rounded-[32px] shadow-2xl border border-slate-200 dark:border-zinc-800 p-6 animate-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Luminance</span>
                <span className={`text-xs font-black px-2 py-1 rounded-lg ${theme.badge}`}>{brightness}%</span>
              </div>
              <input type="range" min="20" max="100" value={brightness} onChange={(e) => setBrightness(e.target.value)}
                className="w-full h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full appearance-none cursor-pointer accent-indigo-600" />
            </div>
          )}
        </div>

        {/* CUSTOMIZATION ENGINE */}
        <div className="relative" ref={themeRef}>
          <button onClick={() => setIsThemeOpen(!isThemeOpen)}
            className={`p-3 rounded-2xl transition-all duration-300 ${isThemeOpen ? `bg-zinc-100 dark:bg-zinc-900 ${theme.text} scale-110 shadow-lg` : 'hover:bg-slate-100 dark:hover:bg-zinc-900'}`}
          >
            <Palette size={22} />
          </button>
          {isThemeOpen && (
            <div className="absolute top-full right-0 mt-4 w-72 bg-white dark:bg-zinc-950 rounded-[32px] shadow-2xl border border-slate-200 dark:border-zinc-800 p-2 animate-in slide-in-from-top-2">
              <div className="p-4">
                <p className="text-[10px] font-black text-slate-400 dark:text-zinc-600 uppercase tracking-widest mb-4">Accent Engine</p>
                <div className="grid grid-cols-6 gap-2">
                  {colors.map((c) => (
                    <button key={c.id} onClick={() => setAccentColor(c.id)}
                      className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center transition-all ${accentColor === c.id ? 'ring-2 ring-offset-2 ring-slate-300 dark:ring-offset-black scale-110' : 'opacity-60'}`}
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

        {/* PROFILE SECTION */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 p-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-zinc-900 transition-all pr-4 group"
          >
            <div className="relative">
              <img src={user?.photoURL || 'https://via.placeholder.com/150'} className="h-10 w-10 rounded-2xl object-cover ring-2 ring-white dark:ring-zinc-900 shadow-lg" alt="avatar" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-black rounded-full" />
            </div>
            <div className="hidden md:flex flex-col items-start leading-none group/name">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black text-slate-900 dark:text-white tracking-tight uppercase">
                  {workspaceName}
                </span>
                <Edit2 
                  size={10} 
                  className="opacity-0 group-hover/name:opacity-100 transition-opacity text-indigo-500 cursor-pointer" 
                  onClick={handleRename} 
                />
              </div>
              <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest mt-1">Active Session</span>
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isProfileOpen && (
            <div className="absolute top-full right-0 mt-4 w-60 bg-white dark:bg-zinc-950 rounded-[32px] shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden animate-in slide-in-from-top-2">
              <div className="p-6 border-b border-slate-100 dark:border-zinc-900 flex flex-col items-center">
                <img src={user?.photoURL} className="w-16 h-16 rounded-[24px] mb-3 shadow-xl" alt="profile" />
                <div className="flex items-center gap-2 group/dd-name cursor-pointer" onClick={handleRename}>
                  <p className="text-sm font-black text-slate-900 dark:text-white truncate uppercase tracking-tighter hover:text-indigo-500 transition-colors">
                    {workspaceName}
                  </p>
                  <Edit2 size={10} className="text-slate-400 group-hover/dd-name:text-indigo-500" />
                </div>
                <div className="flex items-center gap-1 mt-1">
                   <Zap size={10} className="text-amber-500 fill-amber-500" />
                   <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Workspace Member</p>
                </div>
              </div>
              <div className="p-2">
                <Link to="/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-xs font-black uppercase text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-2xl">
                  <User size={16} className={theme.text} /> Profile Engine
                </Link>
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