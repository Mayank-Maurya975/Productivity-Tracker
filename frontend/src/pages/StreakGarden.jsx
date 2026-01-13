import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sprout, Droplets, Sun, Leaf, TreeDeciduous, 
  Circle, CloudRain, Wind, Sparkles, Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';

const StreakGarden = () => {
  const { user } = useAuth();
  const [habits, setHabits] = useState([]);
  
  // Calculate days in the current month for dynamic scaling
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // 1. Live Fetch & Intelligent Streak Logic
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'habits'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const today = new Date().getDate();
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        const checks = d.checks || [];
        
        let currentStreak = 0;
        let dayToCheck = today;
        const checkSet = new Set(checks);

        if (!checkSet.has(today)) dayToCheck--;

        while (checkSet.has(dayToCheck) && dayToCheck > 0) {
          currentStreak++;
          dayToCheck--;
        }

        return { id: doc.id, ...d, streak: currentStreak, totalDays: checks.length };
      });
      setHabits(data);
    });
    return () => unsubscribe();
  }, [user]);

  // 2. Dynamic Garden Stats
  const gardenStats = useMemo(() => {
    const totalOxygen = habits.reduce((acc, h) => acc + h.totalDays, 0);
    const healthyPlants = habits.filter(h => h.streak > 0).length;
    return { totalOxygen, healthyPlants };
  }, [habits]);

  // 3. Logic for Evolution Stages (Scaled to Month Length)
  const getPlantStage = (streak) => {
    const quarter = Math.floor(daysInMonth / 4);
    
    if (streak === 0) return { 
      icon: <Circle size={16} className="text-amber-900/40" />, 
      label: 'Dry Soil', color: 'bg-zinc-100 dark:bg-zinc-900',
      desc: 'Needs water (Check habit today!)' 
    };
    if (streak < quarter) return { 
      icon: <Circle size={24} className="text-amber-600 animate-pulse" fill="currentColor" />, 
      label: 'Seedling', color: 'bg-amber-500/10',
      desc: `${quarter - streak} days to sprout` 
    };
    if (streak < quarter * 2) return { 
      icon: <Sprout size={40} className="text-emerald-500" />, 
      label: 'Sprout', color: 'bg-emerald-500/10',
      desc: `${(quarter * 2) - streak} days to leaf`
    };
    if (streak < daysInMonth) return { 
      icon: <Leaf size={48} className="text-green-500" fill="currentColor" />, 
      label: 'Young Plant', color: 'bg-green-500/10',
      desc: `${daysInMonth - streak} days to Full Tree`
    };
    return { 
      icon: <TreeDeciduous size={56} className="text-emerald-600" fill="currentColor" />, 
      label: 'Monthly King', color: 'bg-emerald-600/20',
      desc: 'Full Bloom Reached!'
    };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20 px-4">
      
      {/* Header & Garden Health Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/40">
            <TreeDeciduous className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Streak Garden</h1>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Monthly Growth Tracking</p>
          </div>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <div className="flex-1 md:flex-none bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 p-4 rounded-3xl flex items-center gap-4">
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-2xl"><Sparkles size={20}/></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Oxygen Produced</p>
              <p className="text-xl font-black">{gardenStats.totalOxygen}g</p>
            </div>
          </div>
          <div className="flex-1 md:flex-none bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 p-4 rounded-3xl flex items-center gap-4">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-2xl"><Activity size={20}/></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Garden Health</p>
              <p className="text-xl font-black">{habits.length > 0 ? Math.round((gardenStats.healthyPlants / habits.length) * 100) : 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* The Garden Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {habits.map(habit => {
          const stage = getPlantStage(habit.streak);
          
          return (
            <div key={habit.id} className="group relative bg-white dark:bg-zinc-900 border-b-4 border-slate-200 dark:border-zinc-800 rounded-[40px] p-8 transition-all hover:-translate-y-2 hover:shadow-2xl overflow-hidden">
              
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-50 dark:from-blue-950/20 to-transparent opacity-50" />
              
              <div className="absolute top-6 right-6 flex flex-col gap-2">
                {habit.streak > (daysInMonth / 2) ? <Sun size={18} className="text-amber-500 animate-spin-slow" /> : <CloudRain size={18} className="text-blue-400" />}
                <Wind size={18} className="text-slate-300 dark:text-zinc-700 animate-pulse" />
              </div>

              <div className="relative flex flex-col items-center justify-center py-6">
                <div className={`w-40 h-40 rounded-full ${stage.color} flex items-center justify-center transition-all duration-700 group-hover:scale-110 relative z-10`}>
                  <div className={habit.streak > 0 ? 'animate-bounce-slow' : ''}>
                    {stage.icon}
                  </div>
                </div>
                <div className="w-32 h-6 bg-amber-900/20 dark:bg-amber-900/40 blur-xl rounded-full -mt-4" />
                <div className="w-24 h-2 bg-slate-200 dark:bg-zinc-800 rounded-full mt-2" />
              </div>

              <div className="mt-6 text-center">
                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-1">{habit.name}</h3>
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-tighter">
                  {stage.label}
                </span>
                
                <div className="mt-6 space-y-3">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                    <span>Monthly Goal</span>
                    <span>{habit.streak} / {daysInMonth} Days</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      style={{ width: `${Math.min((habit.streak / daysInMonth) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold italic tracking-tight">
                    {stage.desc}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {habits.length === 0 && (
          <div className="col-span-full py-32 flex flex-col items-center justify-center border-4 border-dashed border-slate-200 dark:border-zinc-800 rounded-[60px]">
            <div className="w-24 h-24 bg-slate-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6">
               <Sprout size={40} className="text-slate-300" />
            </div>
            <h2 className="text-2xl font-black text-slate-400 uppercase tracking-tighter">No seeds planted</h2>
            <p className="text-slate-500 text-sm font-bold mt-2">Check your habits to begin your Streak Garden.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default StreakGarden;