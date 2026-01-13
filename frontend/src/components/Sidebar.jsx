import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  LayoutDashboard, CheckSquare, Activity, Calendar, BarChart2, Settings, 
  LogOut, Sun, Moon, Layers, Target, Repeat, GripVertical, Sprout, Wind, X, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// --- DRAGGABLE ITEM COMPONENT ---
const SortableNavItem = ({ id, item, isActive, theme, toggleSidebar }) => {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.6 : 1,
    scale: isDragging ? '1.02' : '1',
  };

  const handleNav = (e) => {
    if (!isDragging) {
      if (window.innerWidth < 768) toggleSidebar();
      navigate(item.path);
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="mb-1.5 group/item outline-none"
    >
      <div
        onClick={handleNav}
        /* Fixed: Use cursor-default for the row, navigation handled by onClick */
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group text-sm font-bold relative cursor-pointer
          ${isActive 
            ? `${theme.bg} text-white shadow-lg ${theme.shadow} scale-[1.02]` 
            : 'text-slate-500 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-900/50 hover:text-slate-900 dark:hover:text-zinc-100'
          }`}
      >
        {/* DRAG HANDLE - This is the ONLY place the hand cursor should appear */}
        <button 
          {...attributes} 
          {...listeners}
          /* Fixed: Added touch-none here instead of parent, and forced grab/grabbing cursor */
          className={`absolute left-1.5 p-1 rounded-md transition-opacity z-20 touch-none
            cursor-grab active:cursor-grabbing text-slate-300 dark:text-zinc-700 hover:text-white
            ${isDragging ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`}
          onClick={(e) => e.stopPropagation()} 
        >
          <GripVertical size={14} />
        </button>

        <span className={`pl-6 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white' : `${theme.text}`}`}>
          {item.icon}
        </span>
        <span className="tracking-tight select-none">{item.text}</span>
        
        {isActive && (
          <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        )}
      </div>
    </div>
  );
};

// --- MAIN SIDEBAR COMPONENT ---
const Sidebar = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { theme, darkMode, setDarkMode, activeBg } = useTheme();

  const defaultItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={18} />, text: 'Dashboard', path: '/dashboard' },
    { id: 'garden', icon: <Sprout size={18} />, text: 'Streak Garden', path: '/garden' },
    { id: 'relax', icon: <Wind size={18} />, text: 'Relax Zone', path: '/relax' },
    { id: 'goals', icon: <Target size={18} />, text: 'Goals', path: '/goals' },
    { id: 'routines', icon: <Repeat size={18} />, text: 'Routines', path: '/routines' },
    { id: 'tasks', icon: <CheckSquare size={18} />, text: 'Tasks', path: '/tasks' },
    { id: 'habits', icon: <Activity size={18} />, text: 'Habits', path: '/habits' },
    { id: 'calendar', icon: <Calendar size={18} />, text: 'Calendar', path: '/calendar' },
    { id: 'reports', icon: <BarChart2 size={18} />, text: 'Reports', path: '/reports' },
  ];

  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('sidebar_order');
    if (saved) {
      const savedOrder = JSON.parse(saved);
      const reordered = savedOrder.map(id => defaultItems.find(item => item.id === id)).filter(Boolean);
      const missing = defaultItems.filter(item => !savedOrder.includes(item.id));
      return [...reordered, ...missing];
    }
    return defaultItems;
  });

  useEffect(() => {
    localStorage.setItem('sidebar_order', JSON.stringify(items.map(i => i.id)));
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[45] md:hidden transition-opacity duration-300"
          onClick={toggleSidebar}
        />
      )}

      <aside className={`
        w-68 fixed left-0 top-0 h-full flex flex-col z-50 
        transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)
        ${darkMode ? 'bg-black' : 'bg-white'} border-r ${activeBg.border}
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0
      `}>
        
        {/* Logo/Heading Area - Standard Pointer Cursor */}
        <div className={`h-20 flex items-center justify-between px-6 shrink-0 relative overflow-hidden border-b ${activeBg.border} cursor-default`}>
          <div className="flex items-center gap-3 z-10">
            <div className={`w-9 h-9 rounded-2xl ${theme.bg} flex items-center justify-center shadow-xl ${theme.shadow} rotate-3`}>
              <Layers size={20} className="text-white" />
            </div>
            <div className="flex flex-col select-none">
              <span className="text-xl font-black tracking-tighter dark:text-white">FocusFlow</span>
              <span className={`text-[9px] font-bold uppercase tracking-[0.2em] ${theme.text}`}>OS v2.0</span>
            </div>
          </div>
          
          <button onClick={toggleSidebar} className="p-2 md:hidden text-zinc-500 hover:text-white transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar scroll-smooth cursor-default">
          <div className="flex items-center justify-between px-2 mb-4 select-none">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">Workspace</p>
             <Sparkles size={12} className={`${theme.text} opacity-50`} />
          </div>
          
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              {items.map((item) => (
                <SortableNavItem 
                  key={item.id} 
                  id={item.id} 
                  item={item} 
                  isActive={location.pathname === item.path} 
                  theme={theme}
                  toggleSidebar={toggleSidebar}
                />
              ))}
            </SortableContext>
          </DndContext>

          <div className={`pt-4 mt-6 border-t ${activeBg.border}`}>
            <div
              onClick={() => { if (window.innerWidth < 768) toggleSidebar(); navigate('/settings'); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group text-sm font-bold pl-10 cursor-pointer
                ${location.pathname === '/settings'
                  ? `${theme.bg} text-white shadow-lg ${theme.shadow}`
                  : 'text-zinc-500 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
            >
              <Settings size={18} className={location.pathname === '/settings' ? 'text-white' : `${theme.text}`} />
              <span>Settings</span>
            </div>
          </div>
        </nav>

        <div className={`p-5 border-t ${activeBg.border} ${darkMode ? 'bg-black' : 'bg-zinc-50'} shrink-0 cursor-default`}>
          <div className="flex items-center gap-3 mb-5 group/profile cursor-pointer">
            <div className="relative">
              <img 
                src={user?.photoURL || 'https://via.placeholder.com/150'} 
                alt="Profile" 
                className={`h-10 w-10 rounded-2xl ring-2 ${darkMode ? 'ring-zinc-900' : 'ring-white'} object-cover group-hover:scale-110 transition-transform duration-300`} 
              />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-black rounded-full shadow-sm"></div>
            </div>
            <div className="flex-1 min-w-0 select-none">
              <p className="text-sm font-black truncate text-zinc-900 dark:text-white uppercase tracking-tight">{user?.displayName || 'User'}</p>
              <p className={`text-[9px] ${theme.text} font-black truncate uppercase tracking-widest`}>Premium Plan</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} border hover:scale-[1.05] active:scale-95 text-zinc-600 dark:text-zinc-400 transition-all shadow-sm cursor-pointer`}>
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              <span className="text-[10px] font-black uppercase tracking-widest">Mode</span>
            </button>
            <button onClick={logout} className="w-12 flex items-center justify-center h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm cursor-pointer">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;