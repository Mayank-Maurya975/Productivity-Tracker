import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar, AreaChart, Area
} from 'recharts';
import { 
  RotateCcw, Plus, Flame, ChevronLeft, ChevronRight, 
  Trash2, CalendarDays, Check, Award, Maximize2, Minimize2, Lock,
  TrendingUp, Target, Zap, Clock, Star, Gem, Crown, Sparkles,
  BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon,
  CheckSquare, Calendar, Filter, Settings, GripVertical, Edit2, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  writeBatch,
  orderBy
} from 'firebase/firestore';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#84cc16', '#06b6d4',
  '#10b981', '#f97316', '#a855f7'
];

// Helper function to get month key in YYYY-M format (no leading zero)
const getMonthKey = (date) => {
  return `${date.getFullYear()}-${date.getMonth() + 1}`;
};

// Edit Habit Modal Component
const EditHabitModal = ({ habit, isOpen, onClose, onSave }) => {
  const [name, setName] = useState(habit?.name || '');
  const [color, setColor] = useState(habit?.color || COLORS[0]);

  useEffect(() => {
    if (habit) {
      setName(habit.name);
      setColor(habit.color);
    }
  }, [habit]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-[32px] max-w-md w-full p-6 border border-slate-200 dark:border-white/10 shadow-2xl animate-in zoom-in">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Edit Habit</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 block">
              Habit Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white font-bold"
              placeholder="Enter habit name"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 block">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg transition-all hover:scale-110 hover:shadow-lg ${
                    color === c ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110 shadow-lg' : ''
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check size={14} className="text-white mx-auto" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(habit.id, name, color)}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sortable Habit Row Component
const SortableHabitRow = ({ habit, index, daysInMonthArray, isCurrentMonth, todayDay, currentDate, today, onToggle, onRemove, onEdit }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: habit.id,
    animateLayoutChanges: () => false,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    backgroundColor: isDragging ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
    cursor: isDragging ? 'grabbing' : 'default'
  };

  const HabitCell = ({ day }) => {
    const monthKey = getMonthKey(currentDate);
    const currentMonthChecks = habit.monthlyData?.[monthKey] || [];
    
    // Handle both string and number values in checks array
    const isChecked = currentMonthChecks.some(check => Number(check) === day);
    
    const isToday = isCurrentMonth && day === todayDay;
    const isPast = day < todayDay && isCurrentMonth;
    const isClickable = isCurrentMonth && day === todayDay;

    return (
      <td key={day} className={`py-2 ${isToday ? 'bg-gradient-to-b from-indigo-500/5 via-transparent to-transparent' : ''}`}>
        <div className="flex justify-center">
          <button
            onClick={() => onToggle(habit.id, day)}
            disabled={!isClickable}
            className={`
              relative w-6 h-6 md:w-7 md:h-7 rounded-lg transition-all duration-200 flex items-center justify-center
              ${isChecked 
                ? 'scale-100 shadow-lg ring-2 ring-offset-2' 
                : 'bg-gradient-to-br from-slate-100 to-slate-50 dark:from-white/10 dark:to-white/5 border border-slate-200 dark:border-white/10'
              }
              ${!isClickable 
                ? (isPast || !isCurrentMonth
                  ? 'opacity-30 cursor-not-allowed' 
                  : 'opacity-10 cursor-not-allowed'
                ) 
                : 'hover:scale-110 active:scale-95 cursor-pointer hover:shadow-xl hover:ring-2 hover:ring-offset-2'
              }
            `}
            style={{
              backgroundColor: isChecked ? habit.color : '',
              boxShadow: isChecked ? `0 4px 12px ${habit.color}40` : '',
              ringColor: isChecked ? habit.color : '#6366f1'
            }}
          >
            {isChecked && <Check size={14} className="text-white relative z-10" strokeWidth={4} />}
            {!isChecked && !isClickable && isPast && <Lock size={10} className="text-slate-400" />}
          </button>
        </div>
      </td>
    );
  };

  const monthKey = getMonthKey(currentDate);
  const currentMonthChecks = habit.monthlyData?.[monthKey] || [];
  const totalChecks = currentMonthChecks.length;
  const percentage = daysInMonthArray.length > 0 ? Math.round((totalChecks / daysInMonthArray.length) * 100) : 0;

  return (
    <tr 
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group hover:bg-gradient-to-r from-slate-50/50 to-transparent dark:from-white/[0.02] transition-all duration-200 ${isDragging ? 'shadow-xl' : ''}`}
    >
      <td className="py-4 pl-4 text-sm font-bold text-slate-700 dark:text-slate-200 sticky left-0 bg-white dark:bg-black group-hover:bg-gradient-to-r from-slate-50/50 to-slate-50 dark:from-black dark:to-black z-10 border-r border-slate-100 dark:border-white/5">
        <div className="flex items-center justify-between pr-4">
          <div className="flex items-center gap-2">
            <div 
              {...attributes} 
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors touch-none"
            >
              <GripVertical size={16} className="text-slate-400" />
            </div>
            <div className="relative">
              <div className="w-3 h-3 rounded-full ring-2 ring-offset-2" style={{ backgroundColor: habit.color, ringColor: habit.color + '40' }} />
            </div>
            <div className="flex items-center gap-2">
              <span className="truncate max-w-[150px]">{habit.name}</span>
              {isHovered && (
                <button
                  onClick={() => onEdit(habit)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Edit2 size={14} className="text-slate-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      </td>
      {daysInMonthArray.map(day => (
        <HabitCell key={day} day={day} />
      ))}
      <td className="py-4 pr-4 text-right sticky right-0 bg-white dark:bg-black group-hover:bg-gradient-to-r from-transparent to-slate-50/50 dark:from-black dark:to-black z-10 border-l border-slate-100 dark:border-white/5">
        <div className="flex items-center justify-end gap-2">
          <div className="text-right">
            <p className="text-sm font-black text-slate-900 dark:text-white">
              {percentage}%
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {totalChecks}/{daysInMonthArray.length}
            </p>
          </div>
          <button 
            onClick={() => onRemove(habit.id)}
            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
};

// Custom Tooltip Components
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl p-4 shadow-2xl">
        <p className="text-xs font-bold text-slate-300 mb-1">Day {label}</p>
        <p className="text-sm font-bold text-white">{Math.round(payload[0].value)}% completion</p>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl p-4 shadow-2xl">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: payload[0].payload.color }} />
          <p className="text-sm font-bold text-white">{payload[0].payload.name}</p>
        </div>
        <p className="text-2xl font-black text-white">{payload[0].value} days</p>
        <p className="text-xs text-slate-400">{payload[0].payload.percentage}% of total</p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }) => (
  <div className="flex flex-wrap justify-center gap-2 mt-4">
    {payload.map((entry, index) => (
      <div key={index} className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 px-2 py-1 bg-white/50 dark:bg-black/50 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-white/10">
        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
        <span className="font-black">{entry.payload.value}</span>
        <span className="text-slate-400">days</span>
      </div>
    ))}
  </div>
);

const Habits = () => {
  const { user } = useAuth();
  const [habits, setHabits] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [habitInput, setHabitInput] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [isBoldCharts, setIsBoldCharts] = useState(false);
  const [activeView, setActiveView] = useState('matrix');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const tableContainerRef = useRef(null);

  const daysInMonthCount = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const daysInMonthArray = Array.from({ length: daysInMonthCount }, (_, i) => i + 1);
  
  const today = new Date();
  const todayDay = today.getDate();
  const isCurrentMonth = currentDate.getMonth() === today.getMonth() && 
                         currentDate.getFullYear() === today.getFullYear();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'users', user.uid, 'habits'),
      orderBy('order', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const habitsData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        monthlyData: doc.data().monthlyData || {}
      }));
      setHabits(habitsData);
    }, (error) => {
      console.error('Error fetching habits:', error);
    });
    
    return () => unsubscribe();
  }, [user]);

  const handleMonthChange = (direction) => {
    setIsAnimating(true);
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
    setTimeout(() => setIsAnimating(false), 500);
  };

  const addHabit = async (e) => {
    e.preventDefault();
    if (!habitInput.trim()) return;
    setIsAnimating(true);
    
    const maxOrder = habits.reduce((max, habit) => Math.max(max, habit.order || 0), -1);
    
    await addDoc(collection(db, 'users', user.uid, 'habits'), {
      name: habitInput,
      color: selectedColor,
      monthlyData: {},
      createdAt: new Date().toISOString(),
      order: maxOrder + 1,
      lastUpdated: new Date().toISOString()
    });
    
    setHabitInput("");
    setSelectedColor(COLORS[(COLORS.indexOf(selectedColor) + 1) % COLORS.length]);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const removeHabit = async (id) => {
    if (!window.confirm("Delete this habit?")) return;
    setIsAnimating(true);
    await deleteDoc(doc(db, 'users', user.uid, 'habits', id));
    setTimeout(() => setIsAnimating(false), 300);
  };

  const editHabit = (habit) => {
    setEditingHabit(habit);
    setIsEditModalOpen(true);
  };

  const saveHabitEdit = async (id, newName, newColor) => {
    if (!newName.trim()) return;
    
    await updateDoc(doc(db, 'users', user.uid, 'habits', id), {
      name: newName,
      color: newColor,
      lastUpdated: new Date().toISOString()
    });
    
    setIsEditModalOpen(false);
    setEditingHabit(null);
  };

  const toggleCheck = async (habitId, day) => {
    if (!isCurrentMonth || day !== todayDay) return;
    
    setIsAnimating(true);
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    
    const monthKey = getMonthKey(currentDate);
    const currentMonthChecks = habit.monthlyData?.[monthKey] || [];
    const isChecked = currentMonthChecks.some(check => Number(check) === day);
    
    const newMonthChecks = isChecked 
      ? currentMonthChecks.filter(d => Number(d) !== day) 
      : [...currentMonthChecks, day];
    
    await updateDoc(doc(db, 'users', user.uid, 'habits', habitId), { 
      monthlyData: {
        ...habit.monthlyData,
        [monthKey]: newMonthChecks.sort((a, b) => Number(a) - Number(b))
      },
      lastUpdated: new Date().toISOString()
    });
    
    setTimeout(() => setIsAnimating(false), 200);
  };

  const resetAllHabits = async () => {
    if (!window.confirm(`RESET ALL CHECKS FOR ${currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}? This cannot be undone.`)) return;
    setIsAnimating(true);
    
    const monthKey = getMonthKey(currentDate);
    const batch = writeBatch(db);
    
    habits.forEach(habit => {
      batch.update(doc(db, 'users', user.uid, 'habits', habit.id), { 
        monthlyData: {
          ...habit.monthlyData,
          [monthKey]: []
        },
        lastUpdated: new Date().toISOString()
      });
    });
    
    await batch.commit();
    setTimeout(() => setIsAnimating(false), 500);
  };

  const handleDragEnd = async (event) => {
    setIsDragging(false);
    const { active, over } = event;
    
    if (active.id !== over.id) {
      const oldIndex = habits.findIndex((h) => h.id === active.id);
      const newIndex = habits.findIndex((h) => h.id === over.id);
      
      const newHabits = arrayMove(habits, oldIndex, newIndex);
      setHabits(newHabits);
      
      const batch = writeBatch(db);
      newHabits.forEach((habit, index) => {
        const habitRef = doc(db, 'users', user.uid, 'habits', habit.id);
        batch.update(habitRef, { 
          order: index,
          lastUpdated: new Date().toISOString()
        });
      });
      
      await batch.commit();
    }
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const monthKey = getMonthKey(currentDate);
  
  const currentStreak = useMemo(() => {
    if (habits.length === 0) return 0;
    
    const allChecks = new Set();
    habits.forEach(habit => {
      const checks = habit.monthlyData?.[monthKey] || [];
      checks.forEach(day => allChecks.add(Number(day)));
    });
    
    let streak = 0;
    let checkDay = daysInMonthCount;
    
    while (checkDay > 0) {
      if (allChecks.has(checkDay)) {
        streak++;
        checkDay--;
      } else {
        break;
      }
    }
    return streak;
  }, [habits, monthKey, daysInMonthCount]);

  const topHabit = useMemo(() => {
    if (habits.length === 0) return null;
    
    return habits.reduce((prev, curr) => {
      const prevChecks = prev.monthlyData?.[monthKey]?.length || 0;
      const currChecks = curr.monthlyData?.[monthKey]?.length || 0;
      return prevChecks > currChecks ? prev : curr;
    });
  }, [habits, monthKey]);

  const completionRate = useMemo(() => {
    if (habits.length === 0) return 0;
    
    const totalChecks = habits.reduce((acc, h) => acc + (h.monthlyData?.[monthKey]?.length || 0), 0);
    const maxPossible = habits.length * daysInMonthCount;
    return Math.round((totalChecks / maxPossible) * 100) || 0;
  }, [habits, monthKey, daysInMonthCount]);

  const lineData = useMemo(() => {
    return daysInMonthArray.map(day => {
      const habitsChecked = habits.filter(h => {
        const checks = h.monthlyData?.[monthKey] || [];
        return checks.some(check => Number(check) === day);
      }).length;
      
      return {
        day,
        value: habits.length > 0 ? (habitsChecked / habits.length) * 100 : 0,
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toLocaleDateString('en-US', { weekday: 'short' })
      };
    });
  }, [habits, monthKey, daysInMonthArray, currentDate]);

  const pieData = useMemo(() => {
    const totalChecks = habits.reduce((acc, h) => acc + (h.monthlyData?.[monthKey]?.length || 0), 0);
    
    return habits.map(h => {
      const checks = h.monthlyData?.[monthKey]?.length || 0;
      return { 
        name: h.name, 
        value: checks || 0.01,
        percentage: totalChecks > 0 ? Math.round((checks / totalChecks) * 100) : 0,
        color: h.color 
      };
    });
  }, [habits, monthKey]);

  const barData = useMemo(() => {
    return habits.map(h => {
      const checks = h.monthlyData?.[monthKey]?.length || 0;
      return {
        name: h.name.length > 8 ? h.name.substring(0, 8) + '...' : h.name,
        checks: checks,
        color: h.color,
        rate: Math.round((checks / daysInMonthCount) * 100) || 0
      };
    })
    .sort((a, b) => b.checks - a.checks)
    .slice(0, 5);
  }, [habits, monthKey, daysInMonthCount]);

  const containerClass = "bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-[24px] shadow-sm transition-all duration-300 hover:shadow-xl hover:border-slate-300 dark:hover:border-white/20";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24 md:pb-10 text-slate-900 dark:text-white px-2 md:px-0">
      
      <EditHabitModal 
        habit={editingHabit}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingHabit(null);
        }}
        onSave={saveHabitEdit}
      />
      
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 dark:from-indigo-500/10 dark:via-purple-500/10 dark:to-pink-500/10 border border-slate-200 dark:border-white/10 p-6 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_2s_infinite]" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                  <Sparkles size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent">
                    Habit Tracker
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base mt-1">
                    Build consistency with beautiful visual tracking
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={resetAllHabits}
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-br from-white to-slate-50 dark:from-black dark:to-slate-900/50 border border-slate-200 dark:border-white/20 text-slate-600 dark:text-slate-400 font-bold rounded-2xl text-sm hover:scale-105 transition-all hover:shadow-lg hover:border-red-300 dark:hover:border-red-500/30 group"
              >
                <RotateCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                Reset Month
              </button>
              <button 
                onClick={() => setCurrentDate(new Date())}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white font-bold rounded-2xl text-sm hover:shadow-xl hover:scale-105 transition-all shadow-lg shadow-indigo-500/25 relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Zap size={16} className="group-hover:rotate-12 transition-transform" />
                  Today
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW TOGGLER */}
      <div className="flex items-center justify-center">
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl p-1 flex items-center gap-1">
          {['matrix', 'charts', 'stats'].map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                activeView === view 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {view === 'matrix' && 'Matrix'}
              {view === 'charts' && 'Charts'}
              {view === 'stats' && 'Stats'}
            </button>
          ))}
        </div>
      </div>

      {/* STATS CARDS */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${activeView !== 'stats' ? 'hidden' : ''}`}>
        <div className={`${containerClass} p-6 relative overflow-hidden group`}>
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-xl" />
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
              <Flame size={20} className="text-orange-500" />
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-gradient-to-r from-orange-500/10 to-orange-500/5 text-orange-600 dark:text-orange-400 rounded-full">
              {isCurrentMonth ? 'Current' : 'Historical'}
            </span>
          </div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Streak</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl md:text-4xl font-black bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
              {currentStreak}
            </p>
            <p className="text-lg text-slate-400 mb-1">days</p>
          </div>
        </div>

        <div className={`${containerClass} p-6 relative overflow-hidden group`}>
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-xl" />
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
              <Award size={20} className="text-emerald-500" />
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 rounded-full">
              Top Habit
            </span>
          </div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Most Consistent</p>
          <div className="flex items-center gap-3">
            {topHabit && (
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: topHabit.color }} />
            )}
            <p className="text-xl font-black text-slate-900 dark:text-white truncate">
              {topHabit ? topHabit.name : 'No habits yet'}
            </p>
          </div>
          {topHabit && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              {topHabit.monthlyData?.[monthKey]?.length || 0} checks this month
            </p>
          )}
        </div>

        <div className={`${containerClass} p-6 relative overflow-hidden group`}>
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full blur-xl" />
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
              <Target size={20} className="text-blue-500" />
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-gradient-to-r from-blue-500/10 to-blue-500/5 text-blue-600 dark:text-blue-400 rounded-full">
              Rate
            </span>
          </div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Completion Rate</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
              {completionRate}%
            </p>
            <div className="flex-1 h-2 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-white/5 dark:to-white/10 rounded-full overflow-hidden mb-1 ml-2">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-1000"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>

        <div className={`${containerClass} p-6 relative overflow-hidden group`}>
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-full blur-xl" />
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10">
              <TrendingUp size={20} className="text-violet-500" />
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-gradient-to-r from-violet-500/10 to-violet-500/5 text-violet-600 dark:text-violet-400 rounded-full">
              Progress
            </span>
          </div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Active Habits</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl md:text-4xl font-black bg-gradient-to-r from-violet-500 to-purple-500 bg-clip-text text-transparent">
              {habits.length}
            </p>
            <p className="text-lg text-slate-400 mb-1">total</p>
          </div>
        </div>
      </div>

      {/* MATRIX VIEW */}
      <div className={`space-y-6 ${activeView !== 'matrix' ? 'hidden' : ''}`}>
        {/* MONTH NAVIGATION */}
        <div className={`${containerClass} p-6`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => handleMonthChange(-1)}
                className="p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-white/5 dark:to-white/10 border border-slate-200 dark:border-white/10 hover:scale-105 transition-all group"
              >
                <ChevronLeft size={20} className="text-slate-600 dark:text-slate-400 group-hover:text-indigo-500 transition-colors" />
              </button>
              
              <div className="text-center">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2 justify-center">
                  <CalendarDays size={14} className="text-indigo-500" />
                  Selected Month
                </p>
                <p className="text-2xl md:text-3xl font-black bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              
              <button 
                onClick={() => handleMonthChange(1)}
                className="p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-white/5 dark:to-white/10 border border-slate-200 dark:border-white/10 hover:scale-105 transition-all group"
              >
                <ChevronRight size={20} className="text-slate-600 dark:text-slate-400 group-hover:text-indigo-500 transition-colors" />
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Today</p>
                <p className={`text-2xl font-black ${isCurrentMonth ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {todayDay}
                </p>
              </div>
              <div className="h-10 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent dark:via-slate-700" />
              <div className="text-center">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Days</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{daysInMonthCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ADD HABIT FORM */}
        <div className={`${containerClass} p-6 relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/5 to-transparent animate-[shimmer_2s_infinite]" />
          <div className="relative z-10">
            <form onSubmit={addHabit} className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <Plus size={20} className="text-indigo-500" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="What habit do you want to build? (e.g., Morning Exercise, Daily Reading)"
                    value={habitInput}
                    onChange={(e) => setHabitInput(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white font-bold placeholder-slate-400 dark:placeholder-zinc-600 transition-all shadow-inner"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2 p-2 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-white/5 dark:to-white/10 border border-slate-200 dark:border-white/10">
                  {COLORS.slice(0, 7).map((color) => (
                    <button 
                      key={color} 
                      type="button" 
                      onClick={() => setSelectedColor(color)}
                      className={`w-6 h-6 md:w-7 md:h-7 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg ${selectedColor === color ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110 shadow-lg' : 'opacity-70 hover:opacity-100'}`} 
                      style={{ backgroundColor: color }}
                    >
                      {selectedColor === color && <Check size={12} className="text-white mx-auto" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
                
                <button 
                  type="submit"
                  disabled={!habitInput.trim()}
                  className="px-8 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white font-bold rounded-2xl text-sm hover:shadow-xl hover:scale-105 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                    Add Habit
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* HABIT MATRIX TABLE */}
        <div className={`${containerClass} p-0 overflow-hidden`}>
          <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Habit Matrix</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Track your daily consistency • Drag to reorder • Hover over habit name to edit</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 rounded-full">
                {habits.length} habits
              </span>
              <span className="text-xs font-bold px-3 py-1 bg-gradient-to-r from-indigo-500/10 to-indigo-500/5 text-indigo-600 dark:text-indigo-400 rounded-full">
                {habits.reduce((acc, h) => {
                  return acc + (h.monthlyData?.[monthKey]?.length || 0);
                }, 0)} checks
              </span>
            </div>
          </div>
          
          <div 
            ref={tableContainerRef}
            className="overflow-x-auto custom-scrollbar"
            style={{ 
              maxHeight: 'calc(100vh - 400px)',
              overflowY: 'auto',
              scrollBehavior: isDragging ? 'auto' : 'smooth'
            }}
          >
            <table className="w-full border-collapse min-w-[800px]">
              <thead className="sticky top-0 z-30">
                <tr className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-white/5 dark:to-white/10 border-b border-slate-200 dark:border-white/10">
                  <th className="text-left py-5 pl-4 min-w-[200px] sticky left-0 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-white/5 dark:to-white/10 z-20 text-xs font-black text-slate-500 uppercase border-r border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <GripVertical size={14} className="opacity-50" />
                      <CheckSquare size={14} />
                      Habit Name
                    </div>
                  </th>
                  {daysInMonthArray.map(d => (
                    <th 
                      key={d} 
                      className={`py-4 text-center min-w-[40px] text-xs font-bold transition-all ${
                        isCurrentMonth && d === todayDay 
                          ? 'text-white bg-gradient-to-b from-indigo-500 to-purple-500' 
                          : 'text-slate-400 bg-slate-50 dark:bg-white/5'
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span>{d}</span>
                        {lineData[d-1] && (
                          <span className="text-[10px] opacity-60">{lineData[d-1].date}</span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="text-right py-5 pr-4 sticky right-0 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-white/5 dark:to-white/10 z-20 text-xs font-black text-slate-500 uppercase border-l border-slate-200 dark:border-white/10">
                    Progress
                  </th>
                </tr>
              </thead>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={habits.map(h => h.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {habits.map((habit, index) => (
                      <SortableHabitRow
                        key={habit.id}
                        habit={habit}
                        index={index}
                        daysInMonthArray={daysInMonthArray}
                        isCurrentMonth={isCurrentMonth}
                        todayDay={todayDay}
                        currentDate={currentDate}
                        today={today}
                        onToggle={toggleCheck}
                        onRemove={removeHabit}
                        onEdit={editHabit}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </DndContext>
            </table>
          </div>
          
          {habits.length > 1 && (
            <div className="p-3 text-center border-t border-slate-200 dark:border-white/10 bg-gradient-to-b from-transparent to-slate-50/50 dark:to-white/[0.02]">
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                <GripVertical size={12} />
                Drag the <GripVertical size={12} /> handle to reorder habits • Hover over habit name to edit
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CHARTS VIEW */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${activeView !== 'charts' ? 'hidden' : ''}`}>
        {/* TREND CHART */}
        <div className={`${containerClass} p-6 h-[400px] relative overflow-hidden group`}>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5" />
          <div className="relative z-10 h-full flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">Consistency Trend</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })} daily completion
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsBoldCharts(!isBoldCharts)}
                  className="p-2 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-white/5 dark:to-white/10 hover:scale-105 transition-all"
                >
                  {isBoldCharts ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-500">
                  <LineChartIcon size={20} className="text-white" />
                </div>
              </div>
            </div>
            
            <div className="flex-1">
              {habits.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={lineData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="day" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      interval={Math.floor(daysInMonthCount / 10)}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      domain={[0, 100]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#6366f1" 
                      strokeWidth={isBoldCharts ? 3 : 2}
                      fill="url(#colorValue)"
                      dot={{ r: isBoldCharts ? 4 : 2, fill: '#6366f1' }}
                      activeDot={{ r: 6, fill: '#ffffff', stroke: '#6366f1', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  No data to display
                </div>
              )}
            </div>
          </div>
        </div>

        {/* DISTRIBUTION PIE CHART */}
        <div className={`${containerClass} p-6 h-[400px] relative overflow-hidden group`}>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5" />
          <div className="relative z-10 h-full flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">Habit Distribution</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })} check-ins
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsBoldCharts(!isBoldCharts)}
                  className="p-2 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-white/5 dark:to-white/10 hover:scale-105 transition-all"
                >
                  {isBoldCharts ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-500">
                  <PieChartIcon size={20} className="text-white" />
                </div>
              </div>
            </div>
            
            <div className="flex-1 relative">
              {habits.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={pieData} 
                      innerRadius={isBoldCharts ? 50 : 60} 
                      outerRadius={isBoldCharts ? 90 : 80} 
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                      strokeWidth={2}
                    >
                      {pieData.map((entry, index) => (
                        <Cell 
                          key={index} 
                          fill={entry.color}
                          stroke="#0f172a"
                          strokeWidth={1}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend content={<CustomLegend />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  No data to display
                </div>
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-white/10 to-transparent backdrop-blur-sm border border-white/10 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{habits.length}</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold mt-1">Habits</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BAR CHART */}
        <div className={`${containerClass} p-6 h-[350px] lg:col-span-2 relative overflow-hidden group`}>
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-yellow-500/5" />
          <div className="relative z-10 h-full flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">Top Performing Habits</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })} most checked
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-500 to-yellow-500">
                <BarChart3 size={20} className="text-white" />
              </div>
            </div>
            
            <div className="flex-1">
              {habits.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <defs>
                      {barData.map((entry, index) => (
                        <linearGradient key={index} id={`gradient${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={entry.color} stopOpacity={0.8}/>
                          <stop offset="100%" stopColor={entry.color} stopOpacity={0.2}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        border: '1px solid #334155', 
                        borderRadius: '12px',
                        color: '#fff'
                      }}
                      formatter={(value) => [value, 'Days']}
                    />
                    <Bar 
                      dataKey="checks" 
                      radius={[8, 8, 0, 0]}
                      animationDuration={1500}
                    >
                      {barData.map((entry, index) => (
                        <Cell key={index} fill={`url(#gradient${index})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  No data to display
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EMPTY STATE */}
      {habits.length === 0 && (
        <div className={`${containerClass} p-12 text-center`}>
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center mx-auto mb-6">
              <Sparkles size={32} className="text-indigo-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">No habits yet</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Start building your first habit to see beautiful visual tracking and progress analytics
            </p>
            <button 
              onClick={() => document.querySelector('input[type="text"]')?.focus()}
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl text-sm hover:shadow-xl hover:scale-105 transition-all"
            >
              Create Your First Habit
            </button>
          </div>
        </div>
      )}

      {/* ACHIEVEMENT BADGES */}
      {habits.length > 0 && currentStreak > 0 && isCurrentMonth && (
        <div className={`${containerClass} p-6`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Achievements</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Your habit milestones this month</p>
            </div>
            <Award size={24} className="text-yellow-500" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {currentStreak >= 7 && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <Flame size={20} className="text-yellow-500" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">1 Week Streak</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Amazing consistency!</p>
              </div>
            )}
            
            {habits.length >= 5 && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <Target size={20} className="text-emerald-500" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">5 Habits</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Building multiple habits</p>
              </div>
            )}
            
            {completionRate >= 80 && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border border-indigo-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp size={20} className="text-indigo-500" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">80%+ Rate</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Excellent completion rate</p>
              </div>
            )}
            
            {topHabit && topHabit.monthlyData?.[monthKey]?.length >= 20 && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <Crown size={20} className="text-purple-500" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Master Habit</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {topHabit.monthlyData?.[monthKey]?.length}+ days
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Habits;