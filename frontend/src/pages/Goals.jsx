import React, { useState, useEffect, useMemo } from 'react';
import { 
  Target, Plus, Trash2, Calendar, CheckCircle2, Flag, RotateCcw, 
  ChevronRight, ListTodo, Trophy, AlertCircle, Bookmark, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { 
  collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, query, orderBy, writeBatch, getDocs 
} from 'firebase/firestore';

const Goals = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [newGoal, setNewGoal] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [milestoneInput, setMilestoneInput] = useState({});

  // 1. Sync Goals from Firebase
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'goals'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setGoals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  // 2. Global Analytics
  const stats = useMemo(() => {
    const total = goals.length;
    const completed = goals.filter(g => g.progress === 100).length;
    const urgent = goals.filter(g => {
        if (!g.deadline || g.deadline === 'No Deadline') return false;
        const diff = new Date(g.deadline) - new Date();
        return diff > 0 && diff < (7 * 24 * 60 * 60 * 1000); // Less than 7 days
    }).length;
    return { total, completed, urgent };
  }, [goals]);

  // 3. Handlers
  const addGoal = async (e) => {
    e.preventDefault();
    if (!newGoal.trim()) return;
    await addDoc(collection(db, 'users', user.uid, 'goals'), {
      title: newGoal,
      deadline: deadline || 'No Deadline',
      priority: priority,
      progress: 0,
      milestones: [],
      createdAt: new Date()
    });
    setNewGoal('');
    setDeadline('');
  };

  const addMilestone = async (goalId) => {
    const text = milestoneInput[goalId];
    if (!text?.trim()) return;
    const goal = goals.find(g => g.id === goalId);
    
    // Extract day number if exists
    const dayMatch = text.match(/day\s*(\d+)/i);
    const dayNumber = dayMatch ? parseInt(dayMatch[1]) : null;
    
    // Check if milestone with this day number already exists
    if (dayNumber) {
      const existingMilestone = goal.milestones?.find(m => {
        const existingDayMatch = m.text.match(/day\s*(\d+)/i);
        return existingDayMatch && parseInt(existingDayMatch[1]) === dayNumber;
      });
      
      if (existingMilestone) {
        alert(`Day ${dayNumber} already exists! Please use a different day.`);
        return;
      }
    }
    
    const updatedMilestones = [...(goal.milestones || []), { 
      text, 
      completed: false, 
      id: Date.now(),
      createdAt: new Date().toISOString()
    }];
    
    await updateDoc(doc(db, 'users', user.uid, 'goals', goalId), { 
      milestones: updatedMilestones 
    });
    setMilestoneInput({ ...milestoneInput, [goalId]: '' });
  };

  const toggleMilestone = async (goalId, milestoneId) => {
    const goal = goals.find(g => g.id === goalId);
    const updatedMilestones = goal.milestones.map(m => 
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );
    
    // Auto-calculate progress based on milestones
    const completedCount = updatedMilestones.filter(m => m.completed).length;
    const newProgress = Math.round((completedCount / updatedMilestones.length) * 100);

    await updateDoc(doc(db, 'users', user.uid, 'goals', goalId), { 
      milestones: updatedMilestones,
      progress: newProgress
    });
  };

  const deleteMilestone = async (goalId, milestoneId, e) => {
    e.stopPropagation(); // Prevent triggering the parent onClick
    
    if (window.confirm("Delete this milestone?")) {
      const goal = goals.find(g => g.id === goalId);
      const updatedMilestones = goal.milestones.filter(m => m.id !== milestoneId);
      
      // Recalculate progress after deletion
      const completedCount = updatedMilestones.filter(m => m.completed).length;
      const newProgress = updatedMilestones.length > 0 
        ? Math.round((completedCount / updatedMilestones.length) * 100) 
        : 0;

      await updateDoc(doc(db, 'users', user.uid, 'goals', goalId), { 
        milestones: updatedMilestones,
        progress: newProgress
      });
    }
  };

  const deleteGoal = async (id) => {
    if (window.confirm("Permanent delete?")) {
      await deleteDoc(doc(db, 'users', user.uid, 'goals', id));
    }
  };

  const containerClass = "bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-[32px] shadow-sm transition-all duration-300";

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 px-4">
      
      {/* ANALYTICS BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${containerClass} p-6 flex items-center justify-between bg-indigo-600 dark:bg-indigo-600`}>
          <div>
            <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mb-1">Total Focus</p>
            <p className="text-3xl font-black text-white">{stats.total} Goals</p>
          </div>
          <Trophy className="text-white/40" size={40} />
        </div>
        <div className={`${containerClass} p-6 flex items-center justify-between`}>
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Achievement</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.completed}</p>
          </div>
          <CheckCircle2 className="text-emerald-500/20" size={40} />
        </div>
        <div className={`${containerClass} p-6 flex items-center justify-between`}>
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Urgent Tasks</p>
            <p className="text-3xl font-black text-rose-500">{stats.urgent}</p>
          </div>
          <AlertCircle className="text-rose-500/20" size={40} />
        </div>
      </div>

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-900 dark:bg-white rounded-[20px] flex items-center justify-center">
            <Target className="text-white dark:text-black" size={28} />
          </div>
          <div>
            <h5 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase ">Long-Term</h5>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-widest">Vision Strategy</p>
          </div>
        </div>
        <button onClick={() => { if(window.confirm("Clear all data?")) goals.forEach(g => deleteGoal(g.id)) }} className="flex items-center gap-2 px-5 py-2 text-slate-400 font-bold hover:text-rose-500 transition-colors uppercase text-xs tracking-widest"><RotateCcw size={16} /> Reset Dashboard</button>
      </div>

      {/* ADD GOAL FORM */}
      <div className={`${containerClass} p-6`}>
        <form onSubmit={addGoal} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 bg-slate-50 dark:bg-white/5 p-3 rounded-2xl flex items-center gap-3 border border-transparent focus-within:border-indigo-500 transition-all">
             <Bookmark className="text-slate-400" size={18} />
             <input type="text" value={newGoal} onChange={(e) => setNewGoal(e.target.value)} placeholder="Enter a major life objective..." className="bg-transparent border-none outline-none w-full font-bold text-slate-700 dark:text-white" />
          </div>
          <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-2xl flex items-center gap-3 border border-transparent">
             <Calendar className="text-slate-400" size={18} />
             <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 dark:text-white dark:[color-scheme:dark]" />
          </div>
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-500/20">Set Vision</button>
        </form>
      </div>

      {/* GOALS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {goals.map(goal => (
          <div key={goal.id} className="group relative bg-white dark:bg-zinc-900 border-b-4 border-slate-200 dark:border-white/5 p-8 rounded-[40px] shadow-sm transition-all hover:-translate-y-1">
            
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${goal.priority === 'High' ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{goal.priority} Priority</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{goal.title}</h3>
                <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <Calendar size={12} /> Deadline: {goal.deadline}
                </p>
              </div>
              <button onClick={() => deleteGoal(goal.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 size={20} />
              </button>
            </div>

            {/* Progress Visualization */}
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase text-slate-400">Current Velocity</span>
                <span className={`text-2xl font-black ${goal.progress === 100 ? 'text-emerald-500' : 'text-indigo-500'}`}>{goal.progress}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${goal.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${goal.progress}%` }} />
              </div>
            </div>

            {/* Milestone System */}
            <div className="space-y-4">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <ListTodo size={14} /> Roadmap Milestones
                 <span className="text-xs font-bold text-slate-500 ml-2">
                   ({goal.milestones?.filter(m => m.completed).length || 0}/{goal.milestones?.length || 0})
                 </span>
               </p>
               <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                 {goal.milestones?.sort((a, b) => {
                   // Sort by day number if available
                   const dayA = a.text.match(/day\s*(\d+)/i);
                   const dayB = b.text.match(/day\s*(\d+)/i);
                   if (dayA && dayB) {
                     return parseInt(dayA[1]) - parseInt(dayB[1]);
                   }
                   return 0;
                 }).map(m => (
                   <div 
                     key={m.id} 
                     className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-white/5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors group/milestone"
                   >
                     <div 
                       onClick={() => toggleMilestone(goal.id, m.id)}
                       className="flex items-center gap-3 flex-1 cursor-pointer"
                     >
                       {m.completed ? 
                         <CheckCircle2 className="text-emerald-500 shrink-0" size={18} /> : 
                         <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0" />
                       }
                       <span className={`text-sm font-bold ${m.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                         {m.text}
                       </span>
                     </div>
                     
                     {/* Delete milestone button */}
                     <button 
                       onClick={(e) => deleteMilestone(goal.id, m.id, e)}
                       className="opacity-0 group-hover/milestone:opacity-100 transition-all p-1 hover:bg-rose-500/10 rounded-lg"
                       title="Delete milestone"
                     >
                       <X size={14} className="text-slate-400 hover:text-rose-500" />
                     </button>
                   </div>
                 ))}
               </div>
               
               {/* Add Milestone */}
               <div className="flex gap-2 mt-4">
                 <input 
                   type="text" 
                   value={milestoneInput[goal.id] || ''} 
                   onChange={(e) => setMilestoneInput({ ...milestoneInput, [goal.id]: e.target.value })}
                   onKeyDown={(e) => e.key === 'Enter' && addMilestone(goal.id)}
                   placeholder="Add a step... (e.g., Day 5: Complete module)" 
                   className="flex-1 bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-xl text-xs font-bold outline-none border border-transparent focus:border-indigo-500 transition-all" 
                 />
                 <button onClick={() => addMilestone(goal.id)} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">
                   <ChevronRight size={18}/>
                 </button>
               </div>
               
               {/* Quick add day buttons */}
               <div className="flex flex-wrap gap-2 mt-2">
                 {[1,2,3,4,5,6,7].map(day => {
                   const dayExists = goal.milestones?.some(m => {
                     const match = m.text.match(/day\s*(\d+)/i);
                     return match && parseInt(match[1]) === day;
                   });
                   
                   return (
                     <button
                       key={day}
                       onClick={() => {
                         if (!dayExists) {
                           setMilestoneInput({
                             ...milestoneInput, 
                             [goal.id]: `Day ${day}: `
                           });
                         }
                       }}
                       disabled={dayExists}
                       className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${
                         dayExists 
                           ? 'bg-emerald-500/10 text-emerald-500 cursor-not-allowed' 
                           : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-500'
                       }`}
                     >
                       Day {day}
                     </button>
                   );
                 })}
               </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default Goals;