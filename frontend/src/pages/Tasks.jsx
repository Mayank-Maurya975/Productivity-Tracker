import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Calendar, Flag, CheckCircle2, Circle, 
  ListTodo, Archive, Check, Sparkles, AlertCircle, Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../firebase';
import { 
  collection, addDoc, deleteDoc, updateDoc, doc, 
  onSnapshot, query, orderBy, writeBatch
} from 'firebase/firestore';

const Tasks = () => {
  const { user } = useAuth();
  const { theme } = useTheme(); // Access dynamic accent theme
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState('Med');
  const [date, setDate] = useState('');
  const [filter, setFilter] = useState('all');

  // ✅ REAL-TIME LISTENER
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  /* ---------------- HANDLERS ---------------- */
  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    await addDoc(collection(db, 'users', user.uid, 'tasks'), {
      text: newTask,
      priority,
      dueDate: date || 'No Date',
      completed: false,
      createdAt: new Date()
    });
    setNewTask('');
    setDate('');
    setPriority('Med');
  };

  const toggleTask = async (id, currentStatus) => {
    await updateDoc(doc(db, 'users', user.uid, 'tasks', id), { completed: !currentStatus });
  };

  const deleteTask = async (id) => {
    await deleteDoc(doc(db, 'users', user.uid, 'tasks', id));
  };

  const clearCompleted = async () => {
    if(!window.confirm("Purge all completed tasks?")) return;
    const batch = writeBatch(db);
    tasks.filter(t => t.completed).forEach(t => batch.delete(doc(db, 'users', user.uid, 'tasks', t.id)));
    await batch.commit();
  };

  // Logic & Derived Stats
  const filteredTasks = useMemo(() => tasks.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  }), [tasks, filter]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.completed).length;
    const rate = total > 0 ? Math.round((done / total) * 100) : 0;
    const highPrio = tasks.filter(t => !t.completed && t.priority === 'High').length;
    return { total, done, rate, highPrio };
  }, [tasks]);

  const getPriorityStyle = (p) => {
    switch (p) {
      case 'High': return 'text-rose-500 border-rose-500/20 bg-rose-500/5';
      case 'Med': return 'text-amber-500 border-amber-500/20 bg-amber-500/5';
      case 'Low': return 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5';
      default: return 'text-slate-500 border-slate-500/20';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24 px-4 animate-in fade-in duration-700">
      
      {/* HEADER & BENTO STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 flex items-center gap-4 p-4 bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-[32px]">
          <div className={`w-14 h-14 ${theme.bg} rounded-[24px] flex items-center justify-center shadow-2xl ${theme.shadow}`}>
            <ListTodo className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase ">Tasks</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Workflow Engine</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-[32px]">
           <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
               <CheckCircle2 size={12} className="text-emerald-500" /> Velocity
             </p>
             <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.rate}%</p>
           </div>
           <div className="text-right">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active</p>
             <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.total - stats.done}</p>
           </div>
        </div>

        <div className="flex items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-[32px]">
           <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
               <AlertCircle size={12} className="text-rose-500" /> Critical
             </p>
             <p className="text-3xl font-black text-rose-500">{stats.highPrio}</p>
           </div>
           <Sparkles size={32} className="text-amber-500/20" />
        </div>
      </div>

      {/* ADD TASK INPUT */}
      <div className="bg-white dark:bg-black p-2 rounded-[32px] border border-slate-200 dark:border-zinc-800 shadow-xl">
        <form onSubmit={addTask} className="flex flex-col md:flex-row items-center gap-2">
          <input 
            type="text" 
            placeholder="Next major objective..." 
            value={newTask} 
            onChange={(e) => setNewTask(e.target.value)} 
            className="flex-1 bg-transparent px-6 py-4 outline-none text-lg font-bold text-slate-800 dark:text-white placeholder:text-slate-500" 
          />
          <div className="flex items-center gap-2 p-2 w-full md:w-auto">
            <select 
              value={priority} 
              onChange={(e) => setPriority(e.target.value)} 
              className="bg-slate-50 dark:bg-zinc-900 px-4 py-3 rounded-2xl text-xs font-black uppercase text-slate-500 outline-none cursor-pointer border border-transparent focus:border-indigo-500"
            >
              <option value="High">High</option>
              <option value="Med">Medium</option>
              <option value="Low">Low</option>
            </select>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="bg-slate-50 dark:bg-zinc-900 px-4 py-3 rounded-2xl text-xs font-black uppercase text-slate-500 outline-none cursor-pointer dark:[color-scheme:dark]" 
            />
            <button type="submit" className={`${theme.bg} text-white p-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg ${theme.shadow}`}>
              <Plus size={24} />
            </button>
          </div>
        </form>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center justify-between px-2 border-b border-slate-100 dark:border-zinc-900">
        <div className="flex gap-8">
          {['all', 'active', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[10px] font-black uppercase tracking-[0.2em] pb-4 transition-all relative
                ${filter === f ? 'text-indigo-500' : 'text-slate-400 hover:text-slate-600'}
              `}
            >
              {f}
              {filter === f && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500 rounded-full" />}
            </button>
          ))}
        </div>
        
        {tasks.some(t => t.completed) && (
          <button onClick={clearCompleted} className="text-[10px] font-black uppercase text-rose-500 flex items-center gap-2 mb-4 hover:opacity-70 transition-opacity">
            <Archive size={14} /> Purge Finished
          </button>
        )}
      </div>

      {/* LIST CONTENT */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center opacity-30">
            <Filter size={48} className="mb-4" />
            <p className="font-black uppercase tracking-widest text-xs">No Signal Detected</p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div 
              key={task.id} 
              className={`group flex items-center justify-between p-6 rounded-[28px] border transition-all duration-500
                ${task.completed 
                  ? 'bg-zinc-900/20 border-zinc-900/50 opacity-40' 
                  : 'bg-white dark:bg-zinc-950 border-slate-100 dark:border-zinc-900 hover:border-indigo-500/50'
                }`}
            >
              <div className="flex items-center gap-6 flex-1">
                <button 
                  onClick={() => toggleTask(task.id, task.completed)} 
                  className="transition-transform active:scale-75"
                >
                  {task.completed 
                    ? <CheckCircle2 size={28} className="text-emerald-500" fill="currentColor" /> 
                    : <div className="w-7 h-7 rounded-full border-2 border-slate-300 dark:border-zinc-700 hover:border-indigo-500 transition-colors" />
                  }
                </button>
                
                <div className="min-w-0 flex-1">
                  <p className={`text-lg font-bold tracking-tight transition-all ${task.completed ? 'line-through text-slate-500' : 'text-slate-800 dark:text-zinc-100'}`}>
                    {task.text}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${getPriorityStyle(task.priority)}`}>
                      {task.priority}
                    </span>
                    {task.dueDate !== 'No Date' && (
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Calendar size={12} /> {task.dueDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => deleteTask(task.id)} 
                className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Tasks;