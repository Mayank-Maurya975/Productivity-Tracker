import React, { useState, useEffect, useRef } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from '../firebase';
import { 
  Layers, ArrowRight, ShieldCheck, Sun, Moon, 
  Wind, Sprout, Target, ListTodo, Droplets, Music, 
  Calendar as CalendarIcon, Clock, Zap, Users, Folder, 
  StickyNote, TrendingUp, Maximize2, Gamepad2, MousePointer2 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// --- WIDGET CONTENT COMPONENTS ---
const WidgetContent = ({ type }) => {
  // Enforce white text for better contrast on both Sky Blue and Black backgrounds
  const textPrimary = "text-white"; 
  const textSecondary = "text-white/60";
  
  switch (type) {
    case 'tasks':
      return (
        <>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl text-white bg-blue-600 shadow-lg shadow-blue-500/30">
              <ListTodo size={18} />
            </div>
            <span className={`text-xs font-bold ${textPrimary} uppercase tracking-wider`}>Tasks</span>
          </div>
          <div className="space-y-2">
             <div className="h-2 w-3/4 bg-white/20 rounded-full"></div>
             <div className="h-2 w-1/2 bg-white/10 rounded-full"></div>
          </div>
        </>
      );
    case 'garden':
      return (
        <>
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-xl text-white bg-emerald-500 shadow-lg shadow-emerald-500/30">
              <Sprout size={18} fill="currentColor" />
            </div>
            <span className={`text-[10px] font-bold ${textPrimary} uppercase`}>Lvl 5</span>
          </div>
          <div className="text-center mt-1">
            <span className={`text-xl font-black ${textPrimary}`}>Garden</span>
          </div>
        </>
      );
    case 'timer':
      return (
        <div className="flex flex-col items-center justify-center h-full">
           <Clock size={20} className="text-indigo-200 mb-2" />
           <span className={`text-2xl font-mono font-black ${textPrimary} tracking-widest`}>25:00</span>
           <span className={`text-[9px] ${textSecondary} uppercase tracking-widest mt-1`}>Focus</span>
        </div>
      );
    case 'calendar':
      return (
        <>
           <div className="flex items-center gap-2 mb-2 border-b border-white/20 pb-2">
              <CalendarIcon size={14} className="text-violet-300" />
              <span className={`text-[10px] font-bold ${textPrimary}`}>Today</span>
           </div>
           <div className="space-y-2">
              <div className="w-full h-1.5 bg-violet-400/40 rounded-full"></div>
              <div className="w-2/3 h-1.5 bg-violet-400/20 rounded-full"></div>
           </div>
        </>
      );
    case 'relax':
      return (
        <>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl text-white bg-sky-500 shadow-lg shadow-sky-500/30">
              <Wind size={18} />
            </div>
            <span className={`text-xs font-bold ${textPrimary} uppercase tracking-wider`}>Inhale</span>
          </div>
          <div className="flex justify-center">
             <div className="w-8 h-8 rounded-full bg-sky-400/80 animate-pulse shadow-[0_0_15px_rgba(56,189,248,0.5)]"></div>
          </div>
        </>
      );
    case 'goals':
      return (
        <>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl text-white bg-pink-500 shadow-lg shadow-pink-500/30">
              <Target size={16} />
            </div>
            <span className={`text-xs font-bold ${textPrimary} uppercase tracking-wider`}>Goal</span>
          </div>
          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
             <div className="w-[75%] h-full bg-pink-500 rounded-full shadow-[0_0_10px_rgba(236,72,153,0.5)]"></div>
          </div>
        </>
      );
    case 'hydration':
      return (
        <>
           <div className="flex items-center gap-2 mb-2">
              <Droplets size={14} className="text-blue-300" fill="currentColor" />
              <span className={`text-[10px] font-bold ${textPrimary}`}>Hydration</span>
           </div>
           <div className="flex gap-1 justify-center">
              {[1,2,3,4,5].map(i => <div key={i} className={`h-4 w-2 rounded-full ${i<=3 ? 'bg-blue-400' : 'bg-white/10'}`}></div>)}
           </div>
        </>
      );
    case 'music':
      return (
        <div className="flex items-center gap-3 h-full">
           <div className="p-2 bg-orange-500 rounded-lg text-white shadow-lg shadow-orange-500/20">
              <Music size={16} />
           </div>
           <div>
              <p className={`text-[10px] font-bold ${textPrimary}`}>Rain Sounds</p>
              <p className={`text-[8px] ${textSecondary}`}>Playing</p>
           </div>
           <div className="flex gap-0.5 items-end h-4 ml-auto pb-1">
              <div className="w-0.5 bg-orange-300 h-2 animate-pulse"></div>
              <div className="w-0.5 bg-orange-300 h-4 animate-pulse delay-75"></div>
              <div className="w-0.5 bg-orange-300 h-3 animate-pulse delay-150"></div>
           </div>
        </div>
      );
    case 'analytics':
      return (
        <>
           <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-purple-300" />
              <span className={`text-[10px] font-bold ${textPrimary} uppercase`}>Growth</span>
           </div>
           <div className="flex items-end gap-2 h-10 justify-between px-1">
              {[40, 70, 50, 90, 60].map((h, i) => (
                 <div key={i} className="w-2 rounded-sm bg-purple-400/50" style={{ height: `${h}%` }}></div>
              ))}
           </div>
        </>
      );
    case 'project':
      return (
        <>
           <div className="flex items-center justify-between mb-3">
              <Folder size={18} className="text-yellow-400" fill="currentColor" />
              <div className="flex -space-x-2">
                 <div className="w-5 h-5 rounded-full bg-white/20 border border-white/10"></div>
                 <div className="w-5 h-5 rounded-full bg-white/30 border border-white/10"></div>
              </div>
           </div>
           <p className={`text-xs font-bold ${textPrimary} mb-2`}>Q3 Roadmap</p>
           <div className="w-full h-1.5 bg-white/10 rounded-full">
              <div className="w-1/2 h-full bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.5)]"></div>
           </div>
        </>
      );
    case 'sticky':
      return (
        <div className="flex items-start gap-2 h-full">
           <StickyNote size={14} className="text-yellow-200 shrink-0" />
           <p className="text-[10px] font-handwriting text-yellow-100 leading-tight">
              Don't forget to hydrate today!
           </p>
        </div>
      );
    case 'energy':
      return (
        <div className="flex items-center justify-center gap-2 h-full">
           <Zap size={16} className="text-yellow-400" fill="currentColor" />
           <span className={`text-[10px] font-bold ${textPrimary}`}>High Energy</span>
        </div>
      );
    case 'team':
      return (
        <div className="flex items-center gap-2 h-full justify-center">
           <Users size={14} className="text-teal-300" />
           <span className={`text-[10px] font-bold ${textPrimary}`}>Team Sync: 2pm</span>
        </div>
      );
    
    // --- GAME WIDGET ---
    case 'game':
      return (
        <div className="flex flex-col items-center justify-center h-full gap-2">
           <div className="flex items-center gap-2">
             <Gamepad2 size={16} className="text-rose-400" />
             <span className={`text-[10px] font-bold ${textPrimary} uppercase`}>Stress Pop</span>
           </div>
           <button 
             className="w-full py-1.5 bg-rose-500 hover:bg-rose-400 text-white rounded-lg text-[10px] font-bold shadow-lg shadow-rose-500/30 active:scale-95 transition-all"
             onClick={(e) => {
               e.stopPropagation(); 
             }}
           >
             <MousePointer2 size={10} className="inline mr-1" /> POP!
           </button>
        </div>
      );

    default:
      return null;
  }
};

// --- INTERACTIVE WIDGET COMPONENT ---
const InteractiveWidget = ({ id, type, initialX, initialY, initialW, initialH, rot, zIndex, onMouseDown, onResizeStart }) => {
  const style = {
    top: initialY,
    left: initialX,
    width: initialW,
    height: initialH,
    zIndex: zIndex,
    transform: `rotate(${rot}deg)`,
  };

  return (
    <div 
      className="absolute group select-none transition-transform duration-75 ease-out" 
      style={style}
      onMouseDown={(e) => onMouseDown(e, id)}
    >
      <div className="
        w-full h-full p-4 rounded-2xl animate-float relative overflow-hidden cursor-move transition-all duration-300
        bg-white/20 dark:bg-indigo-950/40 
        backdrop-blur-xl 
        border border-white/30 dark:border-white/10
        shadow-lg
        hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] dark:hover:shadow-[0_0_25px_rgba(99,102,241,0.2)]
        hover:scale-105
        hover:border-white/60
      ">
        {/* Shine Effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

        <WidgetContent type={type} />

        <div 
          className="absolute bottom-1 right-1 p-1 opacity-0 group-hover:opacity-100 cursor-nwse-resize text-white/50 hover:text-white transition-opacity"
          onMouseDown={(e) => {
            e.stopPropagation();
            onResizeStart(e, id);
          }}
        >
          <Maximize2 size={12} />
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { darkMode, setDarkMode } = useTheme();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // --- INITIAL POSITIONS (Match Screenshot) ---
  const [widgets, setWidgets] = useState([
    { id: 1, type: 'tasks', x: '3%', y: '5%', w: 180, h: 90, rot: -4, z: 1 },
    { id: 11, type: 'energy', x: '25%', y: '10%', w: 130, h: 50, rot: -8, z: 1 },
    { id: 12, type: 'sticky', x: '45%', y: '4%', w: 160, h: 60, rot: 2, z: 1 },
    { id: 10, type: 'project', x: '78%', y: '5%', w: 170, h: 90, rot: -5, z: 1 },
    { id: 3, type: 'timer', x: '18%', y: '28%', w: 120, h: 100, rot: 4, z: 1 },
    { id: 9, type: 'analytics', x: '4%', y: '45%', w: 200, h: 110, rot: 6, z: 1 },
    { id: 2, type: 'garden', x: '72%', y: '25%', w: 150, h: 100, rot: 5, z: 1 },
    { id: 4, type: 'calendar', x: '82%', y: '45%', w: 160, h: 80, rot: -4, z: 1 },
    { id: 5, type: 'relax', x: '5%', y: '75%', w: 160, h: 100, rot: -3, z: 1 },
    { id: 7, type: 'hydration', x: '25%', y: '82%', w: 130, h: 80, rot: 8, z: 1 },
    { id: 13, type: 'team', x: '48%', y: '88%', w: 140, h: 50, rot: 0, z: 1 },
    { id: 8, type: 'music', x: '68%', y: '80%', w: 160, h: 70, rot: -6, z: 1 },
    { id: 6, type: 'goals', x: '86%', y: '75%', w: 160, h: 80, rot: 5, z: 1 },
    { id: 14, type: 'game', x: '90%', y: '20%', w: 120, h: 90, rot: 10, z: 1 },
  ]);

  const [activeDrag, setActiveDrag] = useState(null);
  const containerRef = useRef(null);

  // Parallax
  useEffect(() => {
    const handleWindowMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleWindowMouseMove);
    return () => window.removeEventListener('mousemove', handleWindowMouseMove);
  }, []);

  // Drag Handlers
  const bringToFront = (id) => {
    const maxZ = Math.max(...widgets.map(w => w.z));
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, z: maxZ + 1 } : w));
  };

  const getPixelValue = (valStr, dimension) => {
    if (typeof valStr === 'number') return valStr;
    const pct = parseFloat(valStr);
    return (pct / 100) * dimension;
  };

  const handleMouseDown = (e, id) => {
    e.preventDefault();
    bringToFront(id);
    const widget = widgets.find(w => w.id === id);
    const container = containerRef.current.getBoundingClientRect();
    const currentX = getPixelValue(widget.x, container.width);
    const currentY = getPixelValue(widget.y, container.height);

    setActiveDrag({ id, mode: 'move', startX: e.clientX, startY: e.clientY, initX: currentX, initY: currentY });
  };

  const handleResizeStart = (e, id) => {
    e.preventDefault();
    bringToFront(id);
    const widget = widgets.find(w => w.id === id);
    setActiveDrag({ id, mode: 'resize', startX: e.clientX, startY: e.clientY, initW: widget.w, initH: widget.h });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!activeDrag) return;
      const { id, mode, startX, startY, initX, initY, initW, initH } = activeDrag;
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      setWidgets(prev => prev.map(w => {
        if (w.id !== id) return w;
        if (mode === 'move') {
          return { ...w, x: initX + deltaX, y: initY + deltaY };
        } else {
          return { ...w, w: Math.max(100, initW + deltaX), h: Math.max(50, initH + deltaY) };
        }
      }));
    };

    const handleMouseUp = () => setActiveDrag(null);
    if (activeDrag) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeDrag]);

  const login = async () => {
    setIsLoading(true);
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
      setIsLoading(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen w-full flex items-center justify-center bg-sky-500 dark:bg-black font-sans selection:bg-indigo-500/30 overflow-hidden relative transition-colors duration-500"
    >
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float > * { animation: float 6s ease-in-out infinite; }
        .glass-chromatic {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
        }
      `}</style>

      {/* THEME TOGGLE */}
      <button 
        onClick={() => setDarkMode(!darkMode)}
        className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white hover:bg-white hover:text-sky-600 transition-all duration-300 shadow-xl hover:scale-110"
        title="Toggle Theme"
      >
        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* AMBIENT */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] rounded-full blur-[150px] bg-indigo-300/20 dark:bg-indigo-600/10 transition-transform duration-1000 ease-out"
          style={{ transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -20}px)` }}
        ></div>
        <div 
          className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[150px] bg-blue-200/20 dark:bg-blue-600/10 transition-transform duration-1000 ease-out"
          style={{ transform: `translate(${mousePos.x * -30}px, ${mousePos.y * -30}px)` }}
        ></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 dark:opacity-5 pointer-events-none mix-blend-soft-light"></div>
      </div>

      {/* WIDGET LAYER */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{ transform: `translate(${mousePos.x * 15}px, ${mousePos.y * 15}px)`, transition: 'transform 0.2s ease-out' }}
      >
        <div className="w-full h-full pointer-events-auto">
          {widgets.map(w => (
            <InteractiveWidget 
              key={w.id} 
              {...w} 
              initialX={w.x}
              initialY={w.y}
              initialW={w.w}
              initialH={w.h}
              onMouseDown={handleMouseDown}
              onResizeStart={handleResizeStart}
            />
          ))}
        </div>
      </div>

      {/* LOGIN CARD */}
      <div className="relative z-50 w-full max-w-md p-6">
        <div className="
          w-full p-10 rounded-[48px] shadow-2xl relative overflow-hidden transition-all duration-300
          bg-white/20 dark:bg-[#0a0a0a]/60 
          backdrop-blur-xl 
          border border-white/30 dark:border-white/10
        ">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
                <div className="h-16 w-16 rounded-3xl flex items-center justify-center shadow-2xl bg-indigo-600 text-white shadow-indigo-600/40 transition-all transform hover:scale-105 hover:rotate-3">
                  <Layers size={32} />
                </div>
            </div>
            <h2 className="text-xs font-bold text-white/90 tracking-[0.3em] uppercase mb-3 drop-shadow-sm">FocusFlow</h2>
            <h1 className="text-5xl font-black text-white tracking-tighter mb-3 drop-shadow-lg">Welcome <br></br> </h1>
            <p className="text-white/80 text-lg font-medium">It's Yours<br></br>Your productivity ecosystem awaits.</p>
          </div>

          <div className="space-y-5">
            <button
              onClick={login}
              disabled={isLoading}
              className="group w-full flex items-center justify-between px-6 py-5 rounded-2xl 
                bg-white/90 dark:bg-white/5 
                hover:bg-white dark:hover:bg-white/10 
                border-2 border-transparent dark:border-white/10 
                text-sky-600 dark:text-white 
                hover:scale-[1.02] active:scale-[0.98] 
                font-bold text-lg shadow-xl transition-all duration-300 disabled:opacity-70"
            >
              <div className="flex items-center gap-4">
                {isLoading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-t-transparent border-sky-600 dark:border-white" />
                ) : (
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-6 w-6" alt="Google" />
                )}
                <span>Sign in with Google</span>
              </div>
              <ArrowRight className="w-5 h-5 text-sky-400 dark:text-white/50 group-hover:text-sky-600 dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
            </button>
            <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-white/60 py-2">
              <ShieldCheck size={12} className="text-white" />
              <span>Secure Cloud Sync • No credit card required</span>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/20 text-center">
            <p className="text-[10px] font-medium text-white/60">
              By continuing, you agree to our <a href="#" className="underline hover:text-white mx-1 transition-colors">Terms</a> and <a href="#" className="underline hover:text-white mx-1 transition-colors">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Login;