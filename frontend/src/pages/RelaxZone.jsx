import React, { useState, useEffect, useRef } from 'react';
import { 
  Wind, Play, Pause, RotateCcw, Sparkles, 
  Waves, Moon, Sun, Flower
} from 'lucide-react';

const RelaxZone = () => {
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [breathPhase, setBreathPhase] = useState('Ready?');
  const [progress, setProgress] = useState(100);
  
  // Audio context ref for future ambient sounds
  const timerRef = useRef(null);

  // Technique Config: Inhale (4s) -> Hold (2s) -> Exhale (4s) -> Hold (2s)
  const phases = [
    { name: 'Inhale', duration: 4000, color: 'from-sky-400 to-indigo-500', scale: 'scale-125', icon: <Sun className="animate-spin-slow" /> },
    { name: 'Hold', duration: 2000, color: 'from-indigo-500 to-purple-500', scale: 'scale-125', icon: <Moon /> },
    { name: 'Exhale', duration: 4000, color: 'from-purple-500 to-rose-400', scale: 'scale-100', icon: <Waves className="animate-bounce" /> },
    { name: 'Rest', duration: 2000, color: 'from-rose-400 to-sky-400', scale: 'scale-100', icon: <Flower /> }
  ];

  // 1. Master Timer Logic
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
        setProgress((timeLeft / 60) * 100);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      setBreathPhase('Done');
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, timeLeft]);

  // 2. Breathing Cycle Logic
  useEffect(() => {
    if (!isActive) return;

    let currentPhaseIndex = 0;
    let isMounted = true;

    const runCycle = async () => {
      while (isActive && isMounted && timeLeft > 0) {
        const phase = phases[currentPhaseIndex];
        setBreathPhase(phase.name);
        
        await new Promise(resolve => setTimeout(resolve, phase.duration));
        currentPhaseIndex = (currentPhaseIndex + 1) % phases.length;
      }
    };

    runCycle();
    return () => { isMounted = false; };
  }, [isActive]);

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(60);
    setProgress(100);
    setBreathPhase('Ready?');
  };

  const currentPhaseData = phases.find(p => p.name === breathPhase) || phases[0];

  return (
    <div className="max-w-4xl mx-auto h-[85vh] flex flex-col items-center justify-center p-6 animate-in fade-in duration-1000 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className={`absolute inset-0 bg-gradient-to-br ${currentPhaseData.color} opacity-5 transition-colors duration-1000 -z-10`} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/10 blur-[120px] rounded-full -z-10 animate-pulse" />

      {/* HEADER */}
      <div className="text-center mb-12 z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sky-400 text-xs font-bold uppercase tracking-widest mb-4">
          <Sparkles size={14} /> Mental Reset
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
          Relax Zone
        </h1>
        <p className="text-slate-500 dark:text-zinc-500 font-medium mt-2">Follow the circle to sync your breathing.</p>
      </div>

      {/* BREATHING ENGINE */}
      <div className="relative w-80 h-80 flex items-center justify-center mb-16">
        
        {/* Progress Ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="160" cy="160" r="150"
            fill="none" stroke="currentColor" strokeWidth="4"
            className="text-slate-100 dark:text-zinc-900"
          />
          <circle
            cx="160" cy="160" r="150"
            fill="none" stroke="currentColor" strokeWidth="4"
            strokeDasharray={942}
            strokeDashoffset={942 - (942 * timeLeft) / 60}
            className="text-sky-500 transition-all duration-1000 ease-linear"
          />
        </svg>

        {/* Dynamic Breathing Bubble */}
        <div className={`
          relative z-10 w-56 h-56 rounded-full shadow-2xl flex flex-col items-center justify-center 
          bg-gradient-to-br ${currentPhaseData.color}
          transition-all duration-[4000ms] cubic-bezier(0.4, 0, 0.2, 1)
          ${isActive ? currentPhaseData.scale : 'scale-90'}
        `}>
          <div className="text-white flex flex-col items-center gap-2">
            <div className="text-white/80">{currentPhaseData.icon}</div>
            <p className="text-3xl font-black tracking-tight uppercase drop-shadow-md">
              {breathPhase}
            </p>
          </div>
          
          {/* Subtle Inner Glow */}
          <div className="absolute inset-2 border border-white/20 rounded-full animate-ping opacity-20" />
        </div>

        {/* Outer Pulsing Rings */}
        {isActive && (
          <>
            <div className={`absolute inset-0 border-2 border-sky-400/20 rounded-full animate-ping`} />
            <div className={`absolute inset-8 border-2 border-indigo-400/10 rounded-full animate-ping [animation-delay:1s]`} />
          </>
        )}
      </div>

      {/* CONTROLS */}
      <div className="flex flex-col items-center gap-8 z-10 w-full">
        <div className="flex flex-col items-center">
          <span className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Time Remaining</span>
          <div className="text-6xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={resetTimer}
            className="p-4 bg-slate-100 dark:bg-zinc-900 text-slate-500 rounded-2xl hover:bg-slate-200 dark:hover:bg-zinc-800 transition-all"
            title="Reset Session"
          >
            <RotateCcw size={24} />
          </button>

          <button 
            onClick={toggleTimer}
            className={`
              w-20 h-20 rounded-[32px] flex items-center justify-center transition-all shadow-2xl
              ${isActive 
                ? 'bg-rose-500 hover:bg-rose-600 text-white' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }
            `}
          >
            {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
          </button>

          <div className="w-14 h-14 flex items-center justify-center text-slate-400">
             {/* Placeholder for Mute/Unmute later */}
          </div>
        </div>
      </div>

      {/* INSTRUCTIONAL TIP */}
      <div className="mt-12 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl">
        <p className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest text-center">
          Focus your gaze on the center and let your shoulders drop.
        </p>
      </div>

      <style jsx>{`
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default RelaxZone;