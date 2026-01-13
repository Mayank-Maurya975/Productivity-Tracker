import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sun, Moon, Trash2, Play, RotateCcw, Clock, Plus, 
  Sparkles, ListChecks, ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { 
  collection, addDoc, deleteDoc, doc, onSnapshot, query, 
  writeBatch, getDocs, where, orderBy 
} from 'firebase/firestore';

const SUGGESTIONS = {
  morning: ['Meditate', 'Drink Water', 'Exercise', 'Journal', 'Cold Shower'],
  evening: ['Read', 'Skin Care', 'Plan Tomorrow', 'No Screens', 'Reflect']
};

const Routines = () => {
  const { user } = useAuth();
  const [routines, setRoutines] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [newTime, setNewTime] = useState('08:00');
  const [activeTab, setActiveTab] = useState('morning');

  // Fetch with chronological ordering
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'routines'),
      orderBy('time', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setRoutines(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const addItem = async (e, textOverride = null) => {
    if (e) e.preventDefault();
    const text = textOverride || newItem;
    if (!text.trim()) return;

    await addDoc(collection(db, 'users', user.uid, 'routines'), {
      text: text,
      type: activeTab,
      time: newTime,
      createdAt: new Date()
    });
    setNewItem('');
  };

  const deleteItem = async (id) => {
    await deleteDoc(doc(db, 'users', user.uid, 'routines', id));
  };

  const pushToTasks = async () => {
    const currentItems = routines.filter(r => r.type === activeTab);
    if (currentItems.length === 0) return;
    
    if (!window.confirm(`Convert your ${activeTab} routine into today's task list?`)) return;
    
    const batch = writeBatch(db);
    currentItems.forEach(item => {
      const newRef = doc(collection(db, 'users', user.uid, 'tasks'));
      batch.set(newRef, {
        text: `[${activeTab.toUpperCase()}] ${item.text}`,
        priority: 'Med',
        completed: false,
        dueDate: new Date().toISOString().split('T')[0],
        createdAt: new Date()
      });
    });
    await batch.commit();
    alert("Tasks generated! Check your task board.");
  };

  const currentList = useMemo(() => 
    routines.filter(r => r.type === activeTab)
  , [routines, activeTab]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20 px-4 md:px-0">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center shadow-2xl transition-all duration-500 ${activeTab === 'morning' ? 'bg-amber-400 rotate-3' : 'bg-indigo-600 -rotate-3'}`}>
            {activeTab === 'morning' ? <Sun className="text-white" size={28} /> : <Moon className="text-white" size={28} />}
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight capitalize">{activeTab} Flow</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Your chronological blueprint for success.</p>
          </div>
        </div>

        <button 
          onClick={() => {
            if(window.confirm(`Clear all items in ${activeTab}?`)) {
               const batch = writeBatch(db);
               currentList.forEach(item => batch.delete(doc(db, 'users', user.uid, 'routines', item.id)));
               batch.commit();
            }
          }}
          className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-red-500 font-bold text-xs uppercase tracking-widest transition-colors"
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      {/* TABS CONTROLLER */}
      <div className="flex p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner">
        {['morning', 'evening'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-black rounded-xl capitalize transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === tab 
                ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xl scale-[1.02]' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab === 'morning' ? <Sun size={16} /> : <Moon size={16} />}
            {tab}
          </button>
        ))}
      </div>

      {/* QUICK SUGGESTIONS */}
      <div className="flex flex-wrap gap-2 py-2">
        <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1 mr-2"><Sparkles size={12}/> Quick Add:</span>
        {SUGGESTIONS[activeTab].map(s => (
          <button
            key={s}
            onClick={() => addItem(null, s)}
            className="px-3 py-1.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:border-indigo-500 transition-all hover:scale-105"
          >
            + {s}
          </button>
        ))}
      </div>

      {/* MAIN LIST CARD */}
      <div className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-[32px] overflow-hidden shadow-sm backdrop-blur-md">
        
        {/* ADD FORM */}
        <form onSubmit={addItem} className="p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex flex-wrap md:flex-nowrap gap-4">
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-xl">
            <Clock size={16} className="text-slate-400" />
            <input 
              type="time" 
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="bg-transparent outline-none text-sm font-bold text-slate-700 dark:text-white"
            />
          </div>
          <div className="flex-1 flex items-center gap-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 px-4 py-2 rounded-xl">
            <Plus size={18} className="text-slate-400" />
            <input 
              type="text" 
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder={`What's next in your ${activeTab}?`}
              className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all">
            Add Step
          </button>
        </form>

        {/* ITEMS LIST */}
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {currentList.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-300 dark:text-zinc-700 mb-4">
                <ListChecks size={32} />
              </div>
              <p className="text-slate-400 text-sm font-medium">Your {activeTab} is currently a blank canvas.</p>
            </div>
          ) : (
            currentList.map((item, index) => (
              <div key={item.id} className="p-5 flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-all">
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md">
                      {item.time}
                    </span>
                    {index !== currentList.length - 1 && (
                      <div className="w-0.5 h-6 bg-slate-100 dark:bg-zinc-800 mt-2"></div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-900 dark:text-slate-100 font-bold text-sm">{item.text}</span>
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Step {index + 1}</span>
                  </div>
                </div>
                <button 
                  onClick={() => deleteItem(item.id)} 
                  className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* ACTION FOOTER */}
        {currentList.length > 0 && (
          <div className="p-6 bg-slate-50/50 dark:bg-zinc-900/30 border-t border-slate-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
               <Sparkles size={14} className="text-amber-500" />
               Convert this routine into active tasks for today.
            </div>
            <button 
              onClick={pushToTasks}
              className="w-full md:w-auto flex items-center justify-center gap-3 bg-slate-900 dark:bg-white text-white dark:text-black px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.15em] transition-all hover:scale-105 active:scale-95 shadow-xl"
            >
              Start Session <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Routines;