import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, Settings2, LayoutGrid, List as ListIcon, 
  Check, Plus, Sparkles, Target, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc } from 'firebase/firestore';

const Calendar = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  
  // Customization State
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('calendar_config');
    return saved ? JSON.parse(saved) : { theme: 'indigo', view: 'grid' };
  });

  useEffect(() => {
    localStorage.setItem('calendar_config', JSON.stringify(config));
  }, [config]);

  // Firebase Sync
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'tasks'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  // Helpers
  const daysInMonthCount = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const handleMonthChange = (dir) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + dir, 1));
  };

  const themes = {
    indigo: { bg: 'bg-indigo-600', text: 'text-indigo-500', light: 'bg-indigo-500/10', border: 'border-indigo-500/30' },
    blue:   { bg: 'bg-blue-600',   text: 'text-blue-500',   light: 'bg-blue-500/10',   border: 'border-blue-500/30' },
    emerald:{ bg: 'bg-emerald-600',text: 'text-emerald-500',light: 'bg-emerald-500/10',border: 'border-emerald-500/30' },
    rose:   { bg: 'bg-rose-600',   text: 'text-rose-500',   light: 'bg-rose-500/10',   border: 'border-rose-500/30' },
    violet: { bg: 'bg-violet-600', text: 'text-violet-500', light: 'bg-violet-500/10', border: 'border-violet-500/30' },
  };

  const currentTheme = themes[config.theme];

  const getTaskStatus = (dueDate) => {
    if (!dueDate || dueDate === "No Date") return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dueDate);
    const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { color: 'bg-slate-500', text: 'text-slate-500', label: 'Past', border: 'border-slate-500/20' };
    if (diffDays === 0) return { color: 'bg-amber-500', text: 'text-amber-500', label: 'Today', border: 'border-amber-500/20' };
    if (diffDays <= 3) return { color: 'bg-red-500', text: 'text-red-500', label: 'Urgent', border: 'border-red-500/20' };
    return { color: currentTheme.bg, text: currentTheme.text, label: 'Planned', border: currentTheme.border };
  };

  // Monthly Analytics
  const monthlyStats = useMemo(() => {
    const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const monthTasks = tasks.filter(t => t.dueDate?.startsWith(monthStr));
    const completed = monthTasks.filter(t => t.completed).length;
    return {
      total: monthTasks.length,
      rate: monthTasks.length > 0 ? Math.round((completed / monthTasks.length) * 100) : 0
    };
  }, [tasks, currentDate]);

  const containerClass = "bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-[32px] shadow-sm transition-all duration-300";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* 1. TOP STATS & CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${containerClass} p-6 col-span-2 flex items-center justify-between`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 ${currentTheme.bg} rounded-3xl flex items-center justify-center shadow-xl shadow-black/10`}>
              <CalendarIcon className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase ">Schedule</h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Monthly Overview</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 p-1 rounded-2xl border border-slate-100 dark:border-white/5">
              <button onClick={() => handleMonthChange(-1)} className="p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-all"><ChevronLeft size={20} /></button>
              <h2 className="text-sm font-black min-w-[100px] text-center text-slate-800 dark:text-white uppercase tracking-tighter">
                {currentDate.toLocaleString('default', { month: 'short', year: 'numeric' })}
              </h2>
              <button onClick={() => handleMonthChange(1)} className="p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-all"><ChevronRight size={20} /></button>
            </div>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-3 rounded-2xl border transition-all ${showSettings ? `${currentTheme.bg} text-white` : 'bg-white dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/10'}`}
            >
              <Settings2 size={20} />
            </button>
          </div>
        </div>

        <div className={`${containerClass} p-6 flex items-center justify-between bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-black`}>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Target size={12} className={currentTheme.text} /> Month Goal
            </p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{monthlyStats.rate}%</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Tasks</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{monthlyStats.total}</p>
          </div>
        </div>
      </div>

      {/* 2. SETTINGS PANEL */}
      {showSettings && (
        <div className={`${containerClass} p-6 border-dashed border-2 ${currentTheme.border} animate-in slide-in-from-top-4`}>
          <div className="flex flex-col md:flex-row gap-8">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 mb-3 block tracking-widest">Layout View</label>
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-xl">
                <button onClick={() => setConfig({ ...config, view: 'grid' })} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${config.view === 'grid' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}><LayoutGrid size={14} /> Grid</button>
                <button onClick={() => setConfig({ ...config, view: 'list' })} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${config.view === 'list' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}><ListIcon size={14} /> List</button>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 mb-3 block tracking-widest">Accent</label>
              <div className="flex gap-3">
                {Object.keys(themes).map((colorKey) => (
                  <button
                    key={colorKey}
                    onClick={() => setConfig({ ...config, theme: colorKey })}
                    className={`w-8 h-8 rounded-full ${themes[colorKey].bg} flex items-center justify-center transition-transform hover:scale-110 ${config.theme === colorKey ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-black' : 'opacity-40'}`}
                  >
                    {config.theme === colorKey && <Check size={14} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CALENDAR BODY */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Calendar Grid/List Area */}
        <div className="xl:col-span-3">
          {config.view === 'grid' ? (
            <div className={`${containerClass} p-4 md:p-8`}>
              <div className="grid grid-cols-7 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 border-t border-l border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-24 md:h-32 bg-slate-50/50 dark:bg-zinc-900/20 border-b border-r border-slate-100 dark:border-white/5" />
                ))}

                {Array.from({ length: daysInMonthCount(currentDate.getFullYear(), currentDate.getMonth()) }).map((_, i) => {
                  const day = i + 1;
                  const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayTasks = tasks.filter(t => t.dueDate === dateString);
                  const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
                  const isSelected = selectedDate.toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

                  return (
                    <div 
                      key={day} 
                      onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                      className={`h-24 md:h-32 p-2 border-b border-r border-slate-100 dark:border-white/5 relative cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-zinc-900/50 ${isSelected ? 'bg-zinc-100/50 dark:bg-zinc-900' : 'bg-white dark:bg-black'}`}
                    >
                      <span className={`flex items-center justify-center w-7 h-7 text-xs font-black rounded-xl transition-colors ${isToday ? `${currentTheme.bg} text-white shadow-lg` : isSelected ? 'bg-zinc-800 text-white' : 'text-slate-400'}`}>
                        {day}
                      </span>
                      
                      <div className="mt-2 space-y-1 overflow-hidden">
                        {dayTasks.slice(0, 3).map(task => (
                          <div key={task.id} className="flex items-center gap-1.5 px-1.5 py-1 rounded-md bg-slate-100 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/5">
                            <div className={`w-1 h-1 rounded-full shrink-0 ${getTaskStatus(task.dueDate)?.color || 'bg-slate-400'}`} />
                            <span className="text-[9px] font-bold truncate text-slate-600 dark:text-slate-300">{task.text}</span>
                          </div>
                        ))}
                        {dayTasks.length > 3 && (
                          <p className="text-[8px] font-black text-slate-400 ml-1">+{dayTasks.length - 3} MORE</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={`${containerClass} p-8 space-y-4 max-h-[700px] overflow-y-auto custom-scrollbar`}>
              {/* List implementation logic remains similar but with updated OLED styling */}
              {tasks.filter(t => t.dueDate?.startsWith(`${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}`)).length === 0 ? (
                <div className="text-center py-20 opacity-40 italic">No tasks this month.</div>
              ) : (
                tasks.map(task => (
                   // List row component...
                   <div key={task.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-white/5">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${getTaskStatus(task.dueDate)?.color}`} />
                        <span className="text-sm font-bold text-slate-700 dark:text-zinc-200">{task.text}</span>
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-400">{task.dueDate}</span>
                   </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 4. SELECTED DATE SIDEBAR */}
        <div className="space-y-6">
          <div className={`${containerClass} p-6 border-t-4 ${currentTheme.border}`}>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Sparkles size={14} className={currentTheme.text} /> Selected Date
            </h3>
            <div className="mb-6">
              <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                {selectedDate.toLocaleDateString('default', { day: '2-digit' })}
              </p>
              <p className="text-sm font-bold text-slate-500 uppercase">
                {selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'short' })}
              </p>
            </div>

            <div className="space-y-3">
              {tasks.filter(t => t.dueDate === selectedDate.toISOString().split('T')[0]).length === 0 ? (
                <div className="py-8 text-center border-2 border-dashed border-slate-100 dark:border-zinc-800 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Free Day</p>
                </div>
              ) : (
                tasks.filter(t => t.dueDate === selectedDate.toISOString().split('T')[0]).map(task => (
                  <div key={task.id} className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-xl flex items-center gap-3 group">
                    <div className={`w-1.5 h-1.5 rounded-full ${task.completed ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className={`text-xs font-bold ${task.completed ? 'line-through opacity-40' : ''}`}>{task.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;