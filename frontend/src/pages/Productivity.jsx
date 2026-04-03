import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Play, Pause, RotateCcw, Volume2, VolumeX, Brain,
  TrendingUp, CheckCircle2, Circle, Flame, Clock, Bell, CheckCheck,
  Trash2, X, Target, Plus, CheckSquare, Activity, Zap, Trophy,
  Star, Lock, ChevronUp, Wind, Sparkles, ChevronRight, RefreshCw,
  ArrowRight, Grid2x2, Music2,
} from 'lucide-react';


import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection, query, onSnapshot, where, orderBy,
  addDoc, updateDoc, deleteDoc, doc, Timestamp,
} from 'firebase/firestore';

// ─── constants ────────────────────────────────────────────────────────────────

const FOCUS_MODES = {
  focus: { label: 'Focus', duration: 25 * 60, color: '#6366f1' },
  break: { label: 'Short Break', duration: 5 * 60, color: '#10b981' },
  long:  { label: 'Long Break', duration: 15 * 60, color: '#3b82f6' },
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKS = 26;
const HEATMAP_DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

const XP_PER_TASK  = 10;
const XP_PER_HABIT = 15;
const XP_PER_FOCUS = 25;
const XP_PER_LEVEL = 500;
const LEVEL_TITLES = ['Beginner','Focused','Consistent','Productive','Expert','Master','Legend'];

const BADGE_DEFS = [
  { id: 'tasks_10',  icon: <CheckSquare size={20}/>, label: '10 Tasks Done',   color: 'from-indigo-500 to-purple-500', check: s => s.totalTasksDone >= 10 },
  { id: 'tasks_50',  icon: <CheckSquare size={20}/>, label: '50 Tasks Done',   color: 'from-indigo-500 to-purple-500', check: s => s.totalTasksDone >= 50 },
  { id: 'streak_7',  icon: <Flame size={20}/>,       label: '7-Day Streak',    color: 'from-orange-500 to-red-500',   check: s => s.habitStreak >= 7 },
  { id: 'streak_30', icon: <Flame size={20}/>,       label: '30-Day Streak',   color: 'from-pink-500 to-rose-500',    check: s => s.habitStreak >= 30 },
  { id: 'goal_1',    icon: <Target size={20}/>,      label: 'Goal Crusher',    color: 'from-emerald-500 to-teal-500', check: s => s.goalsCompleted >= 1 },
  { id: 'focus_10',  icon: <Zap size={20}/>,         label: 'Focus Master',    color: 'from-yellow-500 to-orange-500',check: s => s.totalFocusSessions >= 10 },
];

const NOTIF_TYPE = {
  streak:   { icon: <Flame size={14}/>,       color: 'text-orange-400', bg: 'bg-orange-500/10' },
  task:     { icon: <CheckSquare size={14}/>, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  goal:     { icon: <Target size={14}/>,      color: 'text-emerald-400',bg: 'bg-emerald-500/10' },
  reminder: { icon: <Clock size={14}/>,       color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
};

const SEARCH_TYPE_CFG = {
  task:  { color: 'text-indigo-400', bg: 'bg-indigo-500/10', icon: <CheckSquare size={13}/> },
  habit: { color: 'text-emerald-400',bg: 'bg-emerald-500/10',icon: <Activity size={13}/> },
  goal:  { color: 'text-orange-400', bg: 'bg-orange-500/10', icon: <Target size={13}/> },
};

const MATRIX_QUADRANTS = [
  { id: 'do',       label: 'Do First', sub: 'Urgent + Important',         color: 'border-red-500/30 bg-red-500/5',      badge: 'bg-red-500/20 text-red-400',     dot: 'bg-red-500',    symbol: '!' },
  { id: 'schedule', label: 'Schedule', sub: 'Not Urgent + Important',     color: 'border-indigo-500/30 bg-indigo-500/5',badge: 'bg-indigo-500/20 text-indigo-400',dot: 'bg-indigo-500', symbol: '→' },
  { id: 'delegate', label: 'Delegate', sub: 'Urgent + Not Important',     color: 'border-yellow-500/30 bg-yellow-500/5',badge: 'bg-yellow-500/20 text-yellow-400',dot: 'bg-yellow-500', symbol: '↗' },
  { id: 'eliminate',label: 'Eliminate',sub: 'Not Urgent + Not Important', color: 'border-zinc-700/50 bg-zinc-900/30',   badge: 'bg-zinc-700/50 text-zinc-500',    dot: 'bg-zinc-600',   symbol: '✕' },
];



// ─── helpers ──────────────────────────────────────────────────────────────────

const buildWeek = () => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
    days.push({ date: new Date(d), day: DAY_LABELS[d.getDay()], tasks: 0, habits: 0, focus: 0 });
  }
  return days;
};

const buildHeatGrid = () => {
  const today = new Date();
  const grid = [];
  for (let w = WEEKS - 1; w >= 0; w--) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - w * 7 - (6 - d));
      date.setHours(0,0,0,0);
      week.push({ date: new Date(date), count: 0, _tasks: 0, _habits: 0, _focus: 0 });
    }
    grid.push(week);
  }
  return grid;
};

const heatColor = c => {
  if (c === 0) return 'bg-white/5';
  if (c <= 2)  return 'bg-emerald-900/60';
  if (c <= 4)  return 'bg-emerald-700/70';
  if (c <= 6)  return 'bg-emerald-500/80';
  return 'bg-emerald-400';
};

const getMonthLabels = grid => {
  const labels = []; let last = -1;
  grid.forEach((week, wi) => {
    const m = week[0].date.getMonth();
    if (m !== last) { labels.push({ week: wi, label: week[0].date.toLocaleString('default',{month:'short'}) }); last = m; }
  });
  return labels;
};

const classifyTask = task => {
  const isUrgent = task.dueDate && task.dueDate !== 'No Date' && (() => {
    const diff = (new Date(task.dueDate) - new Date()) / 86400000;
    return diff <= 2;
  })();
  const isImportant = task.priority === 'High';
  if (isUrgent && isImportant)  return 'do';
  if (!isUrgent && isImportant) return 'schedule';
  if (isUrgent && !isImportant) return 'delegate';
  return 'eliminate';
};

const buildSuggestions = stats => {
  const s = [];
  if (stats.overdueTasks > 0)
    s.push({ id:'overdue', icon:<Clock size={14}/>, color:'text-red-400', bg:'bg-red-500/10', title:`${stats.overdueTasks} overdue task${stats.overdueTasks>1?'s':''}`, desc:'Reschedule or complete them to stay on track.', tag:'Urgent' });
  if (stats.habitsTotal > 0 && stats.habitsDoneToday < stats.habitsTotal) {
    const r = stats.habitsTotal - stats.habitsDoneToday;
    s.push({ id:'habits', icon:<Activity size={14}/>, color:'text-emerald-400', bg:'bg-emerald-500/10', title:`${r} habit${r>1?'s':''} left today`, desc:`${stats.habitsDoneToday}/${stats.habitsTotal} habits done. Keep your streak alive!`, tag:'Habits' });
  }
  if (stats.focusSessionsToday === 0)
    s.push({ id:'focus', icon:<Clock size={14}/>, color:'text-indigo-400', bg:'bg-indigo-500/10', title:'No focus sessions yet today', desc:'Start a 25-min Pomodoro to boost productivity.', tag:'Focus' });
  if (stats.goalsWithNoMilestones > 0)
    s.push({ id:'goals', icon:<Target size={14}/>, color:'text-orange-400', bg:'bg-orange-500/10', title:'Goals need milestones', desc:`${stats.goalsWithNoMilestones} goal${stats.goalsWithNoMilestones>1?' have':' has'} no milestones.`, tag:'Goals' });
  if (stats.taskCompletionRate >= 80)
    s.push({ id:'great', icon:<Sparkles size={14}/>, color:'text-violet-400', bg:'bg-violet-500/10', title:'Great productivity today!', desc:`${stats.taskCompletionRate}% of tasks done. Keep the momentum!`, tag:'Motivation' });
  if (s.length === 0)
    s.push({ id:'default', icon:<Sparkles size={14}/>, color:'text-violet-400', bg:'bg-violet-500/10', title:"You're all caught up!", desc:'No urgent actions. Consider adding new goals or habits.', tag:'Tip' });
  return s;
};

// ─── sub-components (no separate files) ───────────────────────────────────────

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs">
      <p className="font-bold text-white mb-1">{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>)}
    </div>
  );
};

const Ring = ({ value, max, color, size = 64 }) => {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ffffff08" strokeWidth="6"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - pct * circ}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}/>
    </svg>
  );
};

// ─── FocusTimer ───────────────────────────────────────────────────────────────
function FocusTimer() {
  const { user } = useAuth();
  const [mode, setMode] = useState('focus');
  const [timeLeft, setTimeLeft] = useState(FOCUS_MODES.focus.duration);
  const [running, setRunning] = useState(false);
  const [todaySessions, setTodaySessions] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const start = new Date(); start.setHours(0,0,0,0);
    const q = query(collection(db,'users',user.uid,'focusSessions'), where('completedAt','>=',Timestamp.fromDate(start)));
    return onSnapshot(q, snap => setTodaySessions(snap.size));
  }, [user]);

  const playBeep = useCallback(() => {
    if (!soundOn) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.8);
    } catch {}
  }, [soundOn]);

  const saveSession = useCallback(async () => {
    if (!user || mode !== 'focus') return;
    try { await addDoc(collection(db,'users',user.uid,'focusSessions'), { durationMinutes: 25, completedAt: Timestamp.now(), mode }); } catch {}
  }, [user, mode]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(intervalRef.current); setRunning(false); playBeep(); saveSession(); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, playBeep, saveSession]);

  const switchMode = m => { clearInterval(intervalRef.current); setRunning(false); setMode(m); setTimeLeft(FOCUS_MODES[m].duration); };
  const reset = () => { clearInterval(intervalRef.current); setRunning(false); setTimeLeft(FOCUS_MODES[mode].duration); };

  const total = FOCUS_MODES[mode].duration;
  const circ = 2 * Math.PI * 90;
  const dash = circ - ((total - timeLeft) / total) * circ;
  const color = FOCUS_MODES[mode].color;
  const mm = String(Math.floor(timeLeft / 60)).padStart(2,'0');
  const ss = String(timeLeft % 60).padStart(2,'0');

  return (
    <div className="bg-black border border-white/10 rounded-3xl p-6 flex flex-col items-center gap-6">
      <div className="flex gap-2 bg-white/5 rounded-2xl p-1 w-full">
        {Object.entries(FOCUS_MODES).map(([key, val]) => (
          <button key={key} onClick={() => switchMode(key)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${mode===key?'bg-white/10 text-white':'text-zinc-500 hover:text-zinc-300'}`}>
            {val.label}
          </button>
        ))}
      </div>
      <div className="relative flex items-center justify-center">
        <svg width="220" height="220" className="-rotate-90">
          <circle cx="110" cy="110" r="90" fill="none" stroke="#ffffff08" strokeWidth="10"/>
          <circle cx="110" cy="110" r="90" fill="none" stroke={color} strokeWidth="10"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dash}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}/>
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-5xl font-black text-white tracking-tighter">{mm}:{ss}</span>
          <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">{FOCUS_MODES[mode].label}</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={reset} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
          <RotateCcw size={18}/>
        </button>
        <button onClick={() => setRunning(r => !r)} style={{ backgroundColor: color }}
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-all">
          {running ? <Pause size={24}/> : <Play size={24} className="ml-1"/>}
        </button>
        <button onClick={() => setSoundOn(s => !s)} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
          {soundOn ? <Volume2 size={18}/> : <VolumeX size={18}/>}
        </button>
      </div>
      <div className="flex items-center gap-3 w-full justify-center">
        <Brain size={14} className="text-indigo-400"/>
        <span className="text-xs text-zinc-500 font-bold">Sessions today:</span>
        <div className="flex gap-1.5">
          {Array.from({ length: Math.max(todaySessions, 4) }).map((_,i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < todaySessions ? 'bg-indigo-500' : 'bg-white/10'}`}/>
          ))}
        </div>
        <span className="text-xs font-black text-indigo-400">{todaySessions}</span>
      </div>
    </div>
  );
}

// ─── WeeklyProgress ───────────────────────────────────────────────────────────
const WP_TABS   = ['Tasks','Habits','Focus'];
const WP_COLORS = { Tasks:'#6366f1', Habits:'#10b981', Focus:'#f59e0b' };
const WP_KEYS   = { Tasks:'tasks', Habits:'habits', Focus:'focus' };

function WeeklyProgress() {
  const { user } = useAuth();
  const [active, setActive] = useState('Tasks');
  const [weekData, setWeekData] = useState(buildWeek());

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db,'users',user.uid,'tasks')), snap => {
      const tasks = snap.docs.map(d => d.data());
      setWeekData(prev => prev.map(day => {
        const next = new Date(day.date); next.setDate(next.getDate()+1);
        const count = tasks.filter(t => {
          if (!t.completed || !t.createdAt) return false;
          const ts = t.createdAt?.seconds ? new Date(t.createdAt.seconds*1000) : new Date(t.createdAt);
          return ts >= day.date && ts < next;
        }).length;
        return { ...day, tasks: count };
      }));
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db,'users',user.uid,'habits')), snap => {
      const habits = snap.docs.map(d => d.data());
      setWeekData(prev => prev.map(day => {
        const mk = `${day.date.getFullYear()}-${day.date.getMonth()+1}`;
        const dn = day.date.getDate();
        const count = habits.filter(h => (h.monthlyData?.[mk]||[]).map(Number).includes(dn)).length;
        return { ...day, habits: count };
      }));
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-6); weekAgo.setHours(0,0,0,0);
    return onSnapshot(
      query(collection(db,'users',user.uid,'focusSessions'), where('completedAt','>=',Timestamp.fromDate(weekAgo))),
      snap => {
        const sessions = snap.docs.map(d => d.data());
        setWeekData(prev => prev.map(day => {
          const next = new Date(day.date); next.setDate(next.getDate()+1);
          const count = sessions.filter(s => {
            const ts = s.completedAt?.seconds ? new Date(s.completedAt.seconds*1000) : new Date(s.completedAt);
            return ts >= day.date && ts < next;
          }).length;
          return { ...day, focus: count };
        }));
      }
    );
  }, [user]);

  const total = weekData.reduce((s,d) => s + (d[WP_KEYS[active]]||0), 0);
  const avg   = (total/7).toFixed(1);
  const best  = Math.max(...weekData.map(d => d[WP_KEYS[active]]||0));

  return (
    <div className="bg-black border border-white/10 rounded-3xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center"><TrendingUp size={18} className="text-indigo-400"/></div>
          <div><h3 className="font-black text-white text-sm">Weekly Progress</h3><p className="text-xs text-zinc-500">Last 7 days — live</p></div>
        </div>
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {WP_TABS.map(t => (
            <button key={t} onClick={() => setActive(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${active===t?'bg-white/10 text-white':'text-zinc-500 hover:text-zinc-300'}`}>{t}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[{label:'Total',value:total},{label:'Daily Avg',value:avg},{label:'Best Day',value:best}].map(s => (
          <div key={s.label} className="bg-white/5 rounded-2xl p-3 text-center">
            <p className="text-xl font-black text-white">{s.value}</p>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={weekData} barSize={20}>
          <XAxis dataKey="day" tick={{ fill:'#52525b', fontSize:11, fontWeight:700 }} axisLine={false} tickLine={false}/>
          <YAxis hide/>
          <Tooltip content={<ChartTooltip/>} cursor={{ fill:'rgba(255,255,255,0.03)' }}/>
          <Bar dataKey={WP_KEYS[active]} fill={WP_COLORS[active]} radius={[6,6,0,0]} name={active}/>
        </BarChart>
      </ResponsiveContainer>
      <ResponsiveContainer width="100%" height={50}>
        <LineChart data={weekData}>
          <Line type="monotone" dataKey={WP_KEYS[active]} stroke={WP_COLORS[active]} strokeWidth={2} dot={false}/>
          <Tooltip content={<ChartTooltip/>}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── DailySummary ─────────────────────────────────────────────────────────────
function DailySummary() {
  const { user } = useAuth();
  const [sum, setSum] = useState({ tasksDone:0, tasksTotal:0, habitsDone:0, habitsTotal:0, focusSessions:0, streak:0 });

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db,'users',user.uid,'tasks')), snap => {
      const tasks = snap.docs.map(d => d.data());
      setSum(s => ({ ...s, tasksTotal: tasks.length, tasksDone: tasks.filter(t => t.completed).length }));
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db,'users',user.uid,'habits')), snap => {
      const habits = snap.docs.map(d => d.data());
      const today = new Date();
      const mk = `${today.getFullYear()}-${today.getMonth()+1}`;
      const dn = today.getDate();
      const done = habits.filter(h => (h.monthlyData?.[mk]||[]).map(Number).includes(dn)).length;
      let streak = 0;
      for (let i = 0; i < 30; i++) {
        const d = new Date(); d.setDate(d.getDate()-i);
        const m = `${d.getFullYear()}-${d.getMonth()+1}`;
        if (habits.some(h => (h.monthlyData?.[m]||[]).map(Number).includes(d.getDate()))) streak++; else break;
      }
      setSum(s => ({ ...s, habitsTotal: habits.length, habitsDone: done, streak }));
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const start = new Date(); start.setHours(0,0,0,0);
    return onSnapshot(
      query(collection(db,'users',user.uid,'focusSessions'), where('completedAt','>=',Timestamp.fromDate(start))),
      snap => setSum(s => ({ ...s, focusSessions: snap.size }))
    );
  }, [user]);

  const { tasksDone, tasksTotal, habitsDone, habitsTotal, focusSessions, streak } = sum;
  const pct = (tasksTotal + habitsTotal) > 0 ? Math.round(((tasksDone + habitsDone) / (tasksTotal + habitsTotal)) * 100) : 0;

  const StatRing = ({ label, done, total, color, icon }) => (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <Ring value={done} max={total} color={color} />
        <div className="absolute inset-0 flex items-center justify-center" style={{ color }}>{icon}</div>
      </div>
      <div className="text-center">
        <p className="text-sm font-black text-white">{done}<span className="text-zinc-600">/{total||'—'}</span></p>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="bg-black border border-white/10 rounded-3xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center"><TrendingUp size={18} className="text-emerald-400"/></div>
        <div>
          <h3 className="font-black text-white text-sm">Daily Summary</h3>
          <p className="text-xs text-zinc-500">{new Date().toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})}</p>
        </div>
      </div>
      <div className="flex justify-around py-2">
        <StatRing label="Tasks"  done={tasksDone}     total={tasksTotal}  color="#6366f1" icon={<CheckCircle2 size={16}/>}/>
        <StatRing label="Habits" done={habitsDone}    total={habitsTotal} color="#10b981" icon={<Circle size={16}/>}/>
        <StatRing label="Focus"  done={focusSessions} total={Math.max(focusSessions,4)} color="#f59e0b" icon={<Clock size={16}/>}/>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-2xl p-3 flex items-center gap-3">
          <Flame size={18} className="text-orange-400"/>
          <div><p className="text-lg font-black text-white">{streak} days</p><p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Streak</p></div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 flex items-center gap-3">
          <Clock size={18} className="text-yellow-400"/>
          <div><p className="text-lg font-black text-white">{focusSessions*25}m</p><p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Focus Time</p></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500 font-bold">Day Completion</span>
          <span className="text-white font-black">{pct}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-700" style={{ width:`${pct}%` }}/>
        </div>
      </div>
    </div>
  );
}

// ─── NotificationCenter ───────────────────────────────────────────────────────
function NotificationCenter() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState([]);

  // Auto-generate overdue task notification once per day
  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db,'users',user.uid,'tasks')), async snap => {
      const now = new Date();
      const overdue = snap.docs.map(d => d.data()).filter(t => !t.completed && t.dueDate && t.dueDate !== 'No Date' && new Date(t.dueDate) < now);
      if (overdue.length === 0) return;
      const start = new Date(); start.setHours(0,0,0,0);
      const existing = await new Promise(res => {
        const u = onSnapshot(
          query(collection(db,'users',user.uid,'notifications'), where('autoGenerated','==',true), where('createdAt','>=',Timestamp.fromDate(start))),
          s => { res(s); u(); }
        );
      });
      if (existing.empty) {
        await addDoc(collection(db,'users',user.uid,'notifications'), {
          type:'task', title:'Overdue Tasks',
          message:`You have ${overdue.length} overdue task${overdue.length>1?'s':''}. Time to catch up!`,
          read:false, autoGenerated:true, createdAt:Timestamp.now(),
        });
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db,'users',user.uid,'notifications'), orderBy('createdAt','desc')), snap => {
      setNotifs(snap.docs.map(d => ({
        id: d.id, ...d.data(),
        time: d.data().createdAt?.seconds
          ? new Date(d.data().createdAt.seconds*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})
          : 'Just now',
      })));
    });
  }, [user]);

  const unread = notifs.filter(n => !n.read).length;
  const markRead    = id => user && updateDoc(doc(db,'users',user.uid,'notifications',id), { read:true });
  const markAllRead = ()  => notifs.filter(n => !n.read).forEach(n => markRead(n.id));
  const remove      = id => user && deleteDoc(doc(db,'users',user.uid,'notifications',id));

  return (
    <div className="bg-black border border-white/10 rounded-3xl overflow-hidden w-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-white"/>
          <span className="font-black text-white text-sm">Notifications</span>
          {unread > 0 && <span className="px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-black rounded-full">{unread}</span>}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1">
            <CheckCheck size={12}/> All read
          </button>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-white/5">
        {notifs.length === 0 ? (
          <div className="py-12 text-center"><Bell size={32} className="text-zinc-700 mx-auto mb-3"/><p className="text-zinc-500 text-sm">All caught up!</p></div>
        ) : notifs.map(n => {
          const cfg = NOTIF_TYPE[n.type] || NOTIF_TYPE.reminder;
          return (
            <div key={n.id} onClick={() => markRead(n.id)}
              className={`flex gap-3 px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors ${!n.read?'bg-white/[0.02]':''}`}>
              <div className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5 ${cfg.color}`}>{cfg.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-bold truncate ${n.read?'text-zinc-400':'text-white'}`}>{n.title}</p>
                  {!n.read && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0"/>}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-[10px] text-zinc-600 mt-1">{n.time}</p>
              </div>
              <button onClick={e => { e.stopPropagation(); remove(n.id); }} className="text-zinc-700 hover:text-red-400 transition-colors shrink-0 mt-1">
                <Trash2 size={13}/>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── UserLevel ────────────────────────────────────────────────────────────────
function UserLevel() {
  const { user } = useAuth();
  const [xp, setXp] = useState({ tasks:0, habits:0, focus:0 });

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db,'users',user.uid,'tasks')), snap => {
      setXp(s => ({ ...s, tasks: snap.docs.filter(d => d.data().completed).length * XP_PER_TASK }));
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db,'users',user.uid,'habits')), snap => {
      const total = snap.docs.reduce((acc,d) => {
        const md = d.data().monthlyData || {};
        return acc + Object.values(md).reduce((s,arr) => s + (arr?.length||0), 0);
      }, 0);
      setXp(s => ({ ...s, habits: total * XP_PER_HABIT }));
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db,'users',user.uid,'focusSessions')), snap => {
      setXp(s => ({ ...s, focus: snap.size * XP_PER_FOCUS }));
    });
  }, [user]);

  const totalXP  = xp.tasks + xp.habits + xp.focus;
  const level    = Math.floor(totalXP / XP_PER_LEVEL) + 1;
  const curXP    = totalXP % XP_PER_LEVEL;
  const progress = (curXP / XP_PER_LEVEL) * 100;
  const title    = LEVEL_TITLES[Math.min(level-1, LEVEL_TITLES.length-1)];
  const sources  = [
    { label:'Tasks',  xp:xp.tasks,  icon:<CheckSquare size={12}/>, color:'#6366f1' },
    { label:'Habits', xp:xp.habits, icon:<Activity size={12}/>,    color:'#10b981' },
    { label:'Focus',  xp:xp.focus,  icon:<Clock size={12}/>,       color:'#f59e0b' },
  ];

  return (
    <div className="bg-black border border-white/10 rounded-3xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center"><Zap size={18} className="text-indigo-400"/></div>
        <div><h3 className="font-black text-white text-sm">Level & XP</h3><p className="text-xs text-zinc-500">Earn XP from tasks, habits & focus</p></div>
      </div>
      <div className="flex items-center gap-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center shadow-lg shadow-indigo-500/20">
          <span className="text-2xl font-black text-white">{level}</span>
          <ChevronUp size={12} className="text-indigo-200"/>
        </div>
        <div className="flex-1">
          <p className="text-white font-black text-lg">{title}</p>
          <p className="text-xs text-zinc-500">{totalXP.toLocaleString()} total XP</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>{curXP} XP</span><span>{XP_PER_LEVEL} XP to level {level+1}</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700" style={{ width:`${progress}%` }}/>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">XP Sources</p>
        {sources.map(item => (
          <div key={item.label} className="flex items-center gap-3">
            <span style={{ color:item.color }}>{item.icon}</span>
            <span className="text-xs text-zinc-400 flex-1">{item.label}</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: totalXP>0?`${(item.xp/totalXP)*100}%`:'0%', backgroundColor:item.color }}/>
              </div>
              <span className="text-xs font-black text-zinc-400 w-14 text-right">+{item.xp} XP</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Achievements ─────────────────────────────────────────────────────────────
function Achievements() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalTasksDone:0, habitStreak:0, goalsCompleted:0, totalFocusSessions:0 });

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db,'users',user.uid,'tasks')), snap => {
      setStats(s => ({ ...s, totalTasksDone: snap.docs.filter(d => d.data().completed).length }));
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db,'users',user.uid,'habits')), snap => {
      const habits = snap.docs.map(d => d.data());
      let streak = 0;
      for (let i = 0; i < 60; i++) {
        const d = new Date(); d.setDate(d.getDate()-i);
        const mk = `${d.getFullYear()}-${d.getMonth()+1}`;
        if (habits.some(h => (h.monthlyData?.[mk]||[]).map(Number).includes(d.getDate()))) streak++; else break;
      }
      setStats(s => ({ ...s, habitStreak: streak }));
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db,'users',user.uid,'goals')), snap => {
      setStats(s => ({ ...s, goalsCompleted: snap.docs.filter(d => d.data().progress >= 100).length }));
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db,'users',user.uid,'focusSessions')), snap => {
      setStats(s => ({ ...s, totalFocusSessions: snap.size }));
    });
  }, [user]);

  const badges = BADGE_DEFS.map(b => ({ ...b, earned: b.check(stats) }));
  const earned = badges.filter(b => b.earned).length;

  return (
    <div className="bg-black border border-white/10 rounded-3xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 flex items-center justify-center"><Trophy size={18} className="text-yellow-400"/></div>
          <div><h3 className="font-black text-white text-sm">Achievements</h3><p className="text-xs text-zinc-500">{earned}/{badges.length} unlocked</p></div>
        </div>
        <span className="text-xs text-zinc-600 font-bold">{Math.round((earned/badges.length)*100)}%</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-700" style={{ width:`${(earned/badges.length)*100}%` }}/>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {badges.map(badge => (
          <div key={badge.id}
            className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${badge.earned?'border-white/10 bg-white/5 hover:bg-white/10':'border-white/5 bg-white/[0.02] opacity-50'}`}>
            {badge.earned
              ? <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${badge.color} flex items-center justify-center text-white shadow-lg`}>{badge.icon}</div>
              : <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-600"><Lock size={16}/></div>
            }
            <p className={`text-[10px] font-black text-center leading-tight ${badge.earned?'text-white':'text-zinc-600'}`}>{badge.label}</p>
            {badge.earned && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                <Star size={8} className="text-black fill-black"/>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────
function Heatmap() {
  const { user } = useAuth();
  const [grid, setGrid] = useState(buildHeatGrid());
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!user) return;
    let tasksUnsub, habitsUnsub, focusUnsub;

    tasksUnsub = onSnapshot(query(collection(db,'users',user.uid,'tasks')), snap => {
      const freshBase = buildHeatGrid();
      snap.docs.forEach(d => {
        const data = d.data();
        if (!data.completed || !data.createdAt) return;
        const ts = data.createdAt?.seconds ? new Date(data.createdAt.seconds*1000) : new Date(data.createdAt);
        const day = new Date(ts); day.setHours(0,0,0,0);
        freshBase.forEach(week => week.forEach(cell => { if (cell.date.getTime()===day.getTime()) cell.count++; }));
      });
      setGrid(prev => prev.map((week,wi) => week.map((cell,di) => ({
        ...cell, _tasks: freshBase[wi]?.[di]?.count||0,
        count: (freshBase[wi]?.[di]?.count||0) + (cell._habits||0) + (cell._focus||0),
      }))));
    });

    habitsUnsub = onSnapshot(query(collection(db,'users',user.uid,'habits')), snap => {
      const counts = {};
      snap.docs.forEach(d => {
        const md = d.data().monthlyData || {};
        Object.entries(md).forEach(([mk, days]) => {
          const [y,m] = mk.split('-').map(Number);
          (days||[]).forEach(day => {
            const date = new Date(y, m-1, Number(day)); date.setHours(0,0,0,0);
            counts[date.getTime()] = (counts[date.getTime()]||0) + 1;
          });
        });
      });
      setGrid(prev => prev.map(week => week.map(cell => ({
        ...cell, _habits: counts[cell.date.getTime()]||0,
        count: (cell._tasks||0) + (counts[cell.date.getTime()]||0) + (cell._focus||0),
      }))));
    });

    focusUnsub = onSnapshot(query(collection(db,'users',user.uid,'focusSessions')), snap => {
      const counts = {};
      snap.docs.forEach(d => {
        const ts = d.data().completedAt?.seconds ? new Date(d.data().completedAt.seconds*1000) : null;
        if (!ts) return;
        const day = new Date(ts); day.setHours(0,0,0,0);
        counts[day.getTime()] = (counts[day.getTime()]||0) + 1;
      });
      setGrid(prev => prev.map(week => week.map(cell => ({
        ...cell, _focus: counts[cell.date.getTime()]||0,
        count: (cell._tasks||0) + (cell._habits||0) + (counts[cell.date.getTime()]||0),
      }))));
    });

    return () => { tasksUnsub?.(); habitsUnsub?.(); focusUnsub?.(); };
  }, [user]);

  const total = grid.flat().reduce((s,d) => s+d.count, 0);
  const monthLabels = getMonthLabels(grid);

  return (
    <div className="bg-black border border-white/10 rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black text-white text-sm">Activity Heatmap</h3>
          <p className="text-xs text-zinc-500">{total} activities in the last 6 months</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
          <span>Less</span>
          {['bg-white/5','bg-emerald-900/60','bg-emerald-700/70','bg-emerald-500/80','bg-emerald-400'].map(c => (
            <div key={c} className={`w-3 h-3 rounded-sm ${c}`}/>
          ))}
          <span>More</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div className="flex mb-1 ml-6">
            {grid.map((_,w) => {
              const lbl = monthLabels.find(m => m.week===w);
              return <div key={w} className="w-4 mr-0.5 text-[9px] text-zinc-600 font-bold">{lbl?.label||''}</div>;
            })}
          </div>
          <div className="flex gap-0.5">
            <div className="flex flex-col gap-0.5 mr-1">
              {HEATMAP_DAY_LABELS.map((d,i) => (
                <div key={i} className="w-4 h-3.5 text-[9px] text-zinc-600 font-bold flex items-center">{d}</div>
              ))}
            </div>
            {grid.map((week,wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((cell,di) => (
                  <div key={di}
                    className={`w-3.5 h-3.5 rounded-sm cursor-pointer transition-all hover:ring-1 hover:ring-white/20 ${heatColor(cell.count)}`}
                    onMouseEnter={() => setTooltip(cell)} onMouseLeave={() => setTooltip(null)}/>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      {tooltip && (
        <div className="text-xs text-zinc-400 bg-white/5 rounded-xl px-3 py-2 inline-block">
          <span className="font-bold text-white">{tooltip.count} activities</span> on{' '}
          {tooltip.date.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
        </div>
      )}
    </div>
  );
}

// ─── AmbientPlayer ────────────────────────────────────────────────────────────
// ─── AmbientPlayer ────────────────────────────────────────────────────────────
function AmbientPlayer() {
  const [userTracks, setUserTracks] = useState(() => {
    try {
      const saved = localStorage.getItem('ambient_user_track_names');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [activeId, setActiveId] = useState(null);
  const [volume, setVolume]     = useState(0.8);
  const [muted, setMuted]       = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const fileRef  = useRef(null);
  const blobsRef = useRef({});

  const allTracks = userTracks.map(t => ({
    id: t.id, label: t.label, src: blobsRef.current[t.id] || null,
  }));

  // play selected track
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!activeId) { audio.pause(); setIsPlaying(false); return; }
    const track = allTracks.find(t => t.id === activeId);
    if (!track?.src) return;
    audio.src = track.src;
    audio.loop = true;
    audio.volume = muted ? 0 : volume;
    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }, [activeId]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const select = (track) => {
    const audio = audioRef.current;
    if (activeId === track.id) {
      if (audio.paused) { audio.play().catch(() => {}); setIsPlaying(true); }
      else              { audio.pause(); setIsPlaying(false); setActiveId(null); }
    } else {
      setActiveId(track.id);
    }
  };

  const handleFileAdd = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const newTracks = files.map(file => {
      const id  = `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const url = URL.createObjectURL(file);
      blobsRef.current[id] = url;
      // strip extension for label
      const label = file.name.replace(/\.[^.]+$/, '');
      return { id, label };
    });
    setUserTracks(prev => {
      const updated = [...prev, ...newTracks];
      localStorage.setItem('ambient_user_track_names', JSON.stringify(updated));
      return updated;
    });
    e.target.value = '';
  };

  const removeTrack = (id, e) => {
    e.stopPropagation();
    if (activeId === id) { audioRef.current?.pause(); setActiveId(null); setIsPlaying(false); }
    // revoke blob if user track
    if (blobsRef.current[id]) { URL.revokeObjectURL(blobsRef.current[id]); delete blobsRef.current[id]; }
    setUserTracks(prev => {
      const updated = prev.filter(t => t.id !== id);
      localStorage.setItem('ambient_user_track_names', JSON.stringify(updated));
      return updated;
    });
  };

  const handleTimeUpdate = () => {
    const a = audioRef.current;
    if (a?.duration) setProgress(a.currentTime / a.duration);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const seekTo = (e) => {
    const a = audioRef.current;
    if (!a?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration;
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;
  };

  const activeTrack = allTracks.find(t => t.id === activeId);

  return (
    <div className="bg-black border border-white/10 rounded-3xl p-6 space-y-5">
      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}/>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-500/10 flex items-center justify-center">
            <Wind size={18} className="text-violet-400"/>
          </div>
          <div>
            <h3 className="font-black text-white text-sm">Ambient Player</h3>
            <p className="text-xs text-zinc-500 truncate max-w-[160px]">
              {activeTrack ? `▶ ${activeTrack.label}` : `${allTracks.length} track${allTracks.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        {/* Add track button */}
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 rounded-xl text-xs font-bold transition-all">
          <Plus size={13}/> Add
        </button>
        <input ref={fileRef} type="file" accept=".mp3,.mp4,.mpeg,audio/*,video/mp4"
          multiple className="hidden" onChange={handleFileAdd}/>
      </div>

      {/* Track list */}
      {allTracks.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-white/10 rounded-2xl">
          <Music2 size={28} className="text-zinc-700 mx-auto mb-2"/>
          <p className="text-xs text-zinc-600">No tracks yet</p>
          <button onClick={() => fileRef.current?.click()}
            className="mt-2 text-xs text-violet-400 hover:text-violet-300 font-bold">
            + Add your first track
          </button>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
          {allTracks.map((track, idx) => {
            const isActive = activeId === track.id;
            return (
              <div key={track.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl border cursor-pointer group transition-all ${
                  isActive
                    ? 'border-violet-500/40 bg-violet-500/10'
                    : 'border-white/5 bg-white/[0.02] hover:bg-white/5'
                }`}
                onClick={() => select(track)}>
                {/* Index / waveform */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black ${
                  isActive ? 'bg-violet-500/20 text-violet-400' : 'bg-white/5 text-zinc-600'
                }`}>
                  {isActive && isPlaying
                    ? <div className="flex gap-0.5 items-end h-4">
                        {[2,3,4,3,2].map((h,i) => (
                          <div key={i} className="w-0.5 bg-violet-400 rounded-full animate-pulse"
                            style={{ height:`${h*3}px`, animationDelay:`${i*0.1}s` }}/>
                        ))}
                      </div>
                    : idx + 1
                  }
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-zinc-400'}`}>
                    {track.label}
                  </p>
                  {isActive && (
                    <p className="text-[10px] text-violet-400">{isPlaying ? 'Playing' : 'Paused'}</p>
                  )}
                </div>

                {/* Play/Pause icon */}
                <div className={`shrink-0 ${isActive ? 'text-violet-400' : 'text-zinc-700 group-hover:text-zinc-400'}`}>
                  {isActive && isPlaying ? <Pause size={14}/> : <Play size={14}/>}
                </div>

                {/* Remove button */}
                <button
                  onClick={(e) => removeTrack(track.id, e)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-400 transition-all ml-1">
                  <Trash2 size={13}/>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Progress bar */}
      {activeId && (
        <div className="space-y-1">
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden cursor-pointer" onClick={seekTo}>
            <div className="h-full bg-violet-500 rounded-full transition-none"
              style={{ width:`${progress * 100}%` }}/>
          </div>
          <div className="flex justify-between text-[10px] text-zinc-600">
            <span>{fmt(audioRef.current?.currentTime)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>
      )}

      {/* Volume */}
      <div className="flex items-center gap-3">
        <button onClick={() => setMuted(m => !m)} className="text-zinc-500 hover:text-white transition-colors">
          {muted ? <VolumeX size={16}/> : <Volume2 size={16}/>}
        </button>
        <input type="range" min="0" max="1" step="0.01" value={muted ? 0 : volume}
          onChange={e => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
          className="flex-1 h-1.5 accent-violet-500 cursor-pointer"/>
        <span className="text-xs text-zinc-600 font-bold w-8 text-right">{Math.round(volume*100)}%</span>
      </div>

      {/* Supported formats hint */}
      <p className="text-[10px] text-zinc-700 text-center">Supports MP3 · MP4 · MPEG</p>
    </div>
  );
}

// ─── SmartSuggestions ─────────────────────────────────────────────────────────
function SmartSuggestions() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState([]);
  const [stats, setStats] = useState({ overdueTasks:0, habitsTotal:0, habitsDoneToday:0, focusSessionsToday:0, goalsWithNoMilestones:0, taskCompletionRate:0 });

  useEffect(() => {
    if (!user) return;
    const unsubs = [];
    unsubs.push(onSnapshot(query(collection(db,'users',user.uid,'tasks')), snap => {
      const tasks = snap.docs.map(d => d.data());
      const now = new Date();
      const overdue = tasks.filter(t => !t.completed && t.dueDate && t.dueDate!=='No Date' && new Date(t.dueDate)<now).length;
      const done = tasks.filter(t => t.completed).length;
      setStats(s => ({ ...s, overdueTasks:overdue, taskCompletionRate: tasks.length>0?Math.round((done/tasks.length)*100):0 }));
    }));
    unsubs.push(onSnapshot(query(collection(db,'users',user.uid,'habits')), snap => {
      const habits = snap.docs.map(d => d.data());
      const today = new Date();
      const mk = `${today.getFullYear()}-${today.getMonth()+1}`;
      const done = habits.filter(h => (h.monthlyData?.[mk]||[]).map(Number).includes(today.getDate())).length;
      setStats(s => ({ ...s, habitsTotal:habits.length, habitsDoneToday:done }));
    }));
    const start = new Date(); start.setHours(0,0,0,0);
    unsubs.push(onSnapshot(query(collection(db,'users',user.uid,'focusSessions')), snap => {
      const count = snap.docs.filter(d => {
        const ts = d.data().completedAt?.seconds ? new Date(d.data().completedAt.seconds*1000) : null;
        return ts && ts >= start;
      }).length;
      setStats(s => ({ ...s, focusSessionsToday:count }));
    }));
    unsubs.push(onSnapshot(query(collection(db,'users',user.uid,'goals')), snap => {
      setStats(s => ({ ...s, goalsWithNoMilestones: snap.docs.filter(d => !(d.data().milestones?.length>0)).length }));
    }));
    return () => unsubs.forEach(u => u());
  }, [user]);

  const suggestions = buildSuggestions(stats).filter(s => !dismissed.includes(s.id));

  return (
    <div className="bg-black border border-white/10 rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-500/10 flex items-center justify-center"><Sparkles size={18} className="text-violet-400"/></div>
          <div><h3 className="font-black text-white text-sm">Smart Suggestions</h3><p className="text-xs text-zinc-500">Based on your real activity</p></div>
        </div>
        <button onClick={() => setDismissed([])} className="text-zinc-600 hover:text-zinc-400 transition-colors"><RefreshCw size={14}/></button>
      </div>
      <div className="space-y-2">
        {suggestions.slice(0,3).map(s => (
          <div key={s.id} className="flex gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all">
            <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center shrink-0 ${s.color}`}>{s.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-xs font-bold text-white">{s.title}</p>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${s.bg} ${s.color}`}>{s.tag}</span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">{s.desc}</p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button className="text-zinc-700 hover:text-white transition-colors"><ChevronRight size={14}/></button>
              <button onClick={() => setDismissed(d => [...d, s.id])} className="text-[9px] text-zinc-700 hover:text-zinc-500 font-bold">✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── GlobalSearch ─────────────────────────────────────────────────────────────
function GlobalSearch({ onClose }) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [allItems, setAllItems] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!user) return;
    const unsubs = [];
    const items = { tasks:[], habits:[], goals:[] };
    const merge = () => setAllItems([...items.tasks, ...items.habits, ...items.goals]);

    unsubs.push(onSnapshot(query(collection(db,'users',user.uid,'tasks')), snap => {
      items.tasks = snap.docs.map(d => {
        const data = d.data();
        return { id:d.id, type:'task', label:data.text, completed:data.completed,
          meta: data.completed ? 'Completed' : data.dueDate!=='No Date' ? `Due ${data.dueDate}` : data.priority||'' };
      });
      merge();
    }));
    unsubs.push(onSnapshot(query(collection(db,'users',user.uid,'habits')), snap => {
      items.habits = snap.docs.map(d => {
        const data = d.data();
        const today = new Date();
        const mk = `${today.getFullYear()}-${today.getMonth()+1}`;
        return { id:d.id, type:'habit', label:data.name, meta:`${(data.monthlyData?.[mk]||[]).length} check-ins this month` };
      });
      merge();
    }));
    unsubs.push(onSnapshot(query(collection(db,'users',user.uid,'goals')), snap => {
      items.goals = snap.docs.map(d => {
        const data = d.data();
        return { id:d.id, type:'goal', label:data.title, meta:`${data.progress||0}% complete` };
      });
      merge();
    }));
    return () => unsubs.forEach(u => u());
  }, [user]);

  const results = allItems.filter(item => {
    const mq = item.label?.toLowerCase().includes(searchQuery.toLowerCase());
    const mf = filter==='All' || item.type===filter.toLowerCase().slice(0,-1);
    return mq && mf;
  });

  useEffect(() => setSelectedIdx(0), [searchQuery, filter]);

  const handleKeyDown = e => {
    if (e.key==='ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i+1, results.length-1)); }
    if (e.key==='ArrowUp')   { e.preventDefault(); setSelectedIdx(i => Math.max(i-1, 0)); }
    if (e.key==='Escape') onClose?.();
  };

  return (
    <div className="bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl w-full max-w-lg">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <Search size={16} className="text-zinc-500 shrink-0"/>
        <input ref={inputRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Search tasks, habits, goals..."
          className="flex-1 bg-transparent text-white placeholder-zinc-600 text-sm outline-none"/>
        {searchQuery && <button onClick={() => setSearchQuery('')} className="text-zinc-600 hover:text-zinc-400 transition-colors"><X size={14}/></button>}
        {onClose && <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition-colors ml-1"><X size={16}/></button>}
      </div>
      <div className="flex gap-1 px-4 py-2 border-b border-white/5">
        {['All','Tasks','Habits','Goals'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${filter===f?'bg-white/10 text-white':'text-zinc-600 hover:text-zinc-400'}`}>{f}</button>
        ))}
      </div>
      <div className="max-h-72 overflow-y-auto custom-scrollbar">
        {results.length === 0 ? (
          <div className="py-10 text-center">
            <Search size={24} className="text-zinc-700 mx-auto mb-2"/>
            <p className="text-xs text-zinc-600">{searchQuery ? `No results for "${searchQuery}"` : 'Start typing to search'}</p>
          </div>
        ) : results.map((item, idx) => {
          const cfg = SEARCH_TYPE_CFG[item.type];
          return (
            <div key={item.id}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer group transition-colors ${idx===selectedIdx?'bg-white/10':'hover:bg-white/5'}`}>
              <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center ${cfg.color} shrink-0`}>{cfg.icon}</div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${item.completed?'line-through text-zinc-500':'text-white'}`}>{item.label}</p>
                <p className="text-[10px] text-zinc-600">{item.meta}</p>
              </div>
              <ArrowRight size={13} className="text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0"/>
            </div>
          );
        })}
      </div>
      <div className="px-4 py-2 border-t border-white/5 flex items-center gap-3 text-[10px] text-zinc-700">
        <span><kbd className="bg-white/5 px-1.5 py-0.5 rounded text-zinc-600">↑↓</kbd> navigate</span>
        <span><kbd className="bg-white/5 px-1.5 py-0.5 rounded text-zinc-600">Esc</kbd> close</span>
        <span className="ml-auto">{results.length} results</span>
      </div>
    </div>
  );
}

// ─── PriorityMatrix ───────────────────────────────────────────────────────────
function PriorityMatrix() {
  const { user } = useAuth();
  const [byQ, setByQ] = useState({ do:[], schedule:[], delegate:[], eliminate:[] });

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db,'users',user.uid,'tasks')), snap => {
      const grouped = { do:[], schedule:[], delegate:[], eliminate:[] };
      snap.docs.forEach(d => {
        const task = { id:d.id, ...d.data() };
        if (!task.completed) grouped[classifyTask(task)].push(task);
      });
      setByQ(grouped);
    });
  }, [user]);

  const completeTask = id => user && updateDoc(doc(db,'users',user.uid,'tasks',id), { completed:true });

  return (
    <div className="bg-black border border-white/10 rounded-3xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center"><Grid2x2 size={18} className="text-rose-400"/></div>
        <div><h3 className="font-black text-white text-sm">Priority Matrix</h3><p className="text-xs text-zinc-500">Auto-sorted from your tasks — live</p></div>
      </div>
      <div className="flex justify-center">
        <div className="flex items-center gap-8 text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
          <span>← Not Urgent</span><span>Urgent →</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {MATRIX_QUADRANTS.map(q => (
          <div key={q.id} className={`border rounded-2xl p-3 space-y-2 min-h-[120px] ${q.color}`}>
            <div>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${q.dot}`}/><span className="text-xs font-black text-white">{q.label}</span>
              </div>
              <p className="text-[9px] text-zinc-600 mt-0.5">{q.sub}</p>
            </div>
            <div className="space-y-1 max-h-28 overflow-y-auto custom-scrollbar">
              {byQ[q.id].length === 0
                ? <p className="text-[10px] text-zinc-700 italic">No tasks</p>
                : byQ[q.id].map(task => (
                  <div key={task.id} className="flex items-center gap-1.5 group">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${q.badge} shrink-0`}>{q.symbol}</span>
                    <span className="text-[11px] text-zinc-400 flex-1 truncate">{task.text}</span>
                    <button onClick={() => completeTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-emerald-400 transition-all">
                      <X size={10}/>
                    </button>
                  </div>
                ))
              }
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-zinc-700 text-center">High priority + due ≤2 days = Do First</p>
    </div>
  );
}

// ─── QuickAdd ─────────────────────────────────────────────────────────────────
const QA_TYPES = [
  { id:'task',  label:'Task',  icon:<CheckSquare size={14}/>, color:'text-indigo-400', placeholder:'Add a task...' },
  { id:'habit', label:'Habit', icon:<Activity size={14}/>,    color:'text-emerald-400',placeholder:'Add a habit...' },
];

function QuickAdd() {
  const { user } = useAuth();
  const [open, setOpen]     = useState(false);
  const [type, setType]     = useState('task');
  const [value, setValue]   = useState('');
  const [saving, setSaving] = useState(false);
  const [recent, setRecent] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = e => {
      if ((e.ctrlKey||e.metaKey) && e.key==='k') { e.preventDefault(); setOpen(o => !o); }
      if (e.key==='Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setValue('');
  }, [open]);

  const submit = async () => {
    if (!value.trim() || !user || saving) return;
    setSaving(true);
    try {
      if (type==='task') {
        await addDoc(collection(db,'users',user.uid,'tasks'), { text:value.trim(), priority:'Med', dueDate:'No Date', completed:false, createdAt:Timestamp.now() });
      } else {
        await addDoc(collection(db,'users',user.uid,'habits'), { name:value.trim(), color:'#6366f1', monthlyData:{}, createdAt:Timestamp.now(), order:Date.now(), lastUpdated:new Date().toISOString() });
      }
      setRecent(p => [{ id:Date.now(), type, text:value.trim() }, ...p.slice(0,4)]);
      setValue('');
      inputRef.current?.focus();
    } finally { setSaving(false); }
  };

  const cur = QA_TYPES.find(t => t.id===type);

  return (
    <>
      <button onClick={() => setOpen(true)} title="Quick Add (Ctrl+K)"
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-2xl shadow-indigo-500/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-40">
        <Plus size={24}/>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-4 pt-4">
              {QA_TYPES.map(t => (
                <button key={t.id} onClick={() => setType(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${type===t.id?'bg-white/10 text-white':'text-zinc-500 hover:text-zinc-300'}`}>
                  <span className={t.color}>{t.icon}</span>{t.label}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-1 text-[10px] text-zinc-600">
                <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-zinc-500">Ctrl</kbd>+
                <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-zinc-500">K</kbd>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <span className={cur.color}>{cur.icon}</span>
              <input ref={inputRef} value={value} onChange={e => setValue(e.target.value)}
                onKeyDown={e => e.key==='Enter' && submit()} placeholder={cur.placeholder}
                className="flex-1 bg-transparent text-white placeholder-zinc-600 text-sm font-medium outline-none"/>
              <button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-zinc-400 transition-colors"><X size={16}/></button>
            </div>
            <div className="px-4 pb-4">
              <button onClick={submit} disabled={!value.trim()||saving}
                className="w-full py-2.5 bg-indigo-600 disabled:bg-white/5 disabled:text-zinc-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-500 flex items-center justify-center gap-2 transition-all">
                <Zap size={14}/>{saving?'Saving...':`Add ${cur.label}`}<span className="text-indigo-300 text-xs ml-1">↵</span>
              </button>
            </div>
            {recent.length > 0 && (
              <div className="border-t border-white/5 px-4 py-3 space-y-2 max-h-48 overflow-y-auto">
                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">Just added</p>
                {recent.map(item => (
                  <div key={item.id} className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className={QA_TYPES.find(t => t.id===item.type)?.color}>{QA_TYPES.find(t => t.id===item.type)?.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Productivity() {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = e => {
      if ((e.ctrlKey||e.metaKey) && e.key==='k') { e.preventDefault(); setSearchOpen(o => !o); }
      if (e.key==='Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Productivity Hub</h1>
          <p className="text-zinc-500 text-sm mt-1">All your tools in one place</p>
        </div>
        <button onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-zinc-500 hover:text-white hover:bg-white/10 transition-all text-sm">
          <Search size={15}/><span>Search</span>
          <kbd className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-zinc-600">Ctrl K</kbd>
        </button>
      </div>

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm" onClick={() => setSearchOpen(false)}>
          <div onClick={e => e.stopPropagation()}>
            <GlobalSearch onClose={() => setSearchOpen(false)}/>
          </div>
        </div>
      )}

      {/* Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <FocusTimer/><DailySummary/><NotificationCenter/>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <WeeklyProgress/><SmartSuggestions/>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UserLevel/><Achievements/>
      </div>

      {/* Row 4 */}
      <Heatmap/>

      {/* Row 5 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <PriorityMatrix/><AmbientPlayer/>
      </div>

      <QuickAdd/>
    </div>
  );
}
