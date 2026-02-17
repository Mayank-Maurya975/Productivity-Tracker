import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, Circle, ArrowRight, Zap, Clock, TrendingUp, 
  Bell, Calendar, Target, Flame, Activity, Award, Star, 
  ChevronRight, Battery, Trophy, Target as TargetIcon,
  BookOpen, Leaf, Coffee, ListTodo, CalendarDays, Goal,
  Users, Layout, Settings, Flower2, Moon, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { 
  collection, query, onSnapshot, orderBy, where,
  Timestamp, doc, updateDoc, arrayUnion 
} from 'firebase/firestore';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    completedTasks: 0,
    totalTasks: 0,
    productivity: 0,
    activeHabits: 0,
    habitCompletions: 0,
    currentStreak: 0,
    longestStreak: 0,
    dailyGoalProgress: 0,
    weeklyTasks: 0,
    overdueTasks: 0
  });

  const [recentTasks, setRecentTasks] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [habitStreaks, setHabitStreaks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dailyGoal, setDailyGoal] = useState(5);
  const [liveActivity, setLiveActivity] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [goals, setGoals] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [gardenProgress, setGardenProgress] = useState([]);

  // Tab configuration with colors and icons
  const tabs = [
    {
      id: 'tasks',
      name: 'Tasks',
      path: '/tasks',
      icon: <ListTodo size={24} />,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-500/20',
      description: 'Manage your daily tasks and to-dos'
    },
    {
      id: 'calendar',
      name: 'Calendar',
      path: '/calendar',
      icon: <CalendarDays size={24} />,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10',
      textColor: 'text-purple-600 dark:text-purple-400',
      borderColor: 'border-purple-500/20',
      description: 'Schedule and plan your events'
    },
    {
      id: 'habits',
      name: 'Habits',
      path: '/habits',
      icon: <Activity size={24} />,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      borderColor: 'border-emerald-500/20',
      description: 'Build and track daily habits'
    },
    {
      id: 'goals',
      name: 'Goals',
      path: '/goals',
      icon: <Target size={24} />,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-500/10',
      textColor: 'text-orange-600 dark:text-orange-400',
      borderColor: 'border-orange-500/20',
      description: 'Set and achieve your long-term goals'
    },
    {
      id: 'routines',
      name: 'Routines',
      path: '/routines',
      icon: <Clock size={24} />,
      color: 'from-indigo-500 to-purple-500',
      bgColor: 'bg-indigo-500/10',
      textColor: 'text-indigo-600 dark:text-indigo-400',
      borderColor: 'border-indigo-500/20',
      description: 'Create and manage your daily routines'
    },
    {
      id: 'streakgarden',
      name: 'Streak Garden',
      path: '/streakgarden',
      icon: <Flower2 size={24} />,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-500/10',
      textColor: 'text-green-600 dark:text-green-400',
      borderColor: 'border-green-500/20',
      description: 'Watch your progress grow'
    },
    {
      id: 'relaxzone',
      name: 'Relax Zone',
      path: '/relaxzone',
      icon: <Moon size={24} />,
      color: 'from-violet-500 to-purple-500',
      bgColor: 'bg-violet-500/10',
      textColor: 'text-violet-600 dark:text-violet-400',
      borderColor: 'border-violet-500/20',
      description: 'Take a break and recharge'
    },
    {
      id: 'reports',
      name: 'Reports',
      path: '/reports',
      icon: <TrendingUp size={24} />,
      color: 'from-rose-500 to-pink-500',
      bgColor: 'bg-rose-500/10',
      textColor: 'text-rose-600 dark:text-rose-400',
      borderColor: 'border-rose-500/20',
      description: 'Analyze your productivity'
    },
    {
      id: 'settings',
      name: 'Settings',
      path: '/settings',
      icon: <Settings size={24} />,
      color: 'from-slate-500 to-gray-500',
      bgColor: 'bg-slate-500/10',
      textColor: 'text-slate-600 dark:text-slate-400',
      borderColor: 'border-slate-500/20',
      description: 'Customize your experience'
    }
  ];

  useEffect(() => {
    if (!user) return;

    // Tasks subscription
    const tasksQuery = query(
      collection(db, 'users', user.uid, 'tasks'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const now = new Date();
      
      const completed = tasks.filter(t => t.completed).length;
      const total = tasks.length;
      const productivityScore = total === 0 ? 0 : Math.round((completed / total) * 100);
      
      const overdue = tasks.filter(task => 
        task.dueDate && 
        !task.completed && 
        new Date(task.dueDate.seconds * 1000) < now
      ).length;
      
      const upcoming = tasks
        .filter(task => 
          task.dueDate && 
          !task.completed &&
          new Date(task.dueDate.seconds * 1000) > now
        )
        .sort((a, b) => a.dueDate - b.dueDate)
        .slice(0, 3);

      setUpcomingDeadlines(upcoming);

      setStats(prev => ({
        ...prev,
        completedTasks: completed,
        totalTasks: total,
        productivity: productivityScore,
        overdueTasks: overdue,
        dailyGoalProgress: Math.min(Math.round((completed / dailyGoal) * 100), 100)
      }));

      setRecentTasks(tasks.slice(0, 5));
    });

    // Habits subscription
    const habitsQuery = query(collection(db, 'users', user.uid, 'habits'));
    
    const unsubscribeHabits = onSnapshot(habitsQuery, (snapshot) => {
      const habits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const totalChecks = habits.reduce((acc, curr) => acc + (curr.checks?.length || 0), 0);
      
      const streaks = habits.map(habit => {
        const checks = habit.checks || [];
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;
        
        const sortedChecks = checks.sort((a, b) => a.seconds - b.seconds);
        
        sortedChecks.forEach((check, index) => {
          const checkDate = new Date(check.seconds * 1000);
          const prevDate = index > 0 ? new Date(sortedChecks[index - 1].seconds * 1000) : null;
          
          if (prevDate && 
              Math.abs((checkDate - prevDate) / (1000 * 60 * 60 * 24)) <= 1) {
            tempStreak++;
          } else {
            tempStreak = 1;
          }
          
          longestStreak = Math.max(longestStreak, tempStreak);
          
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          if (checkDate.toDateString() === today.toDateString() ||
              checkDate.toDateString() === yesterday.toDateString()) {
            currentStreak = tempStreak;
          }
        });
        
        return { ...habit, currentStreak, longestStreak };
      });

      setHabitStreaks(streaks);
      
      const totalCurrentStreak = Math.round(
        streaks.reduce((acc, habit) => acc + habit.currentStreak, 0) / (streaks.length || 1)
      );
      
      const maxStreak = Math.max(...streaks.map(h => h.longestStreak), 0);

      setStats(prev => ({
        ...prev,
        activeHabits: habits.length,
        habitCompletions: totalChecks,
        currentStreak: totalCurrentStreak,
        longestStreak: maxStreak
      }));
    });

    // Calendar events subscription
    const calendarQuery = query(
      collection(db, 'users', user.uid, 'events'),
      orderBy('startTime', 'asc'),
      where('startTime', '>=', new Date())
    );
    
    const unsubscribeCalendar = onSnapshot(calendarQuery, (snapshot) => {
      const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCalendarEvents(events.slice(0, 3));
    });

    // Goals subscription
    const goalsQuery = query(collection(db, 'users', user.uid, 'goals'));
    
    const unsubscribeGoals = onSnapshot(goalsQuery, (snapshot) => {
      const goalsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGoals(goalsData.slice(0, 3));
    });

    // Routines subscription
    const routinesQuery = query(collection(db, 'users', user.uid, 'routines'));
    
    const unsubscribeRoutines = onSnapshot(routinesQuery, (snapshot) => {
      const routinesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRoutines(routinesData.slice(0, 3));
    });

    // Notifications subscription
    const notificationsQuery = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('timestamp', 'desc'),
      where('read', '==', false)
    );
    
    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(notifs.slice(0, 5));
    });

    // Activity subscription
    const activityQuery = query(
      collection(db, 'users', user.uid, 'activity'),
      orderBy('timestamp', 'desc')
    );
    
    const unsubscribeActivity = onSnapshot(activityQuery, (snapshot) => {
      const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLiveActivity(activities.slice(0, 8));
    });

    return () => {
      unsubscribeTasks();
      unsubscribeHabits();
      unsubscribeCalendar();
      unsubscribeGoals();
      unsubscribeRoutines();
      unsubscribeNotifications();
      unsubscribeActivity();
    };
  }, [user, dailyGoal]);

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      const notificationRef = doc(db, 'users', user.uid, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      const taskRef = doc(db, 'users', user.uid, 'tasks', taskId);
      await updateDoc(taskRef, { 
        completed: true,
        completedAt: Timestamp.now()
      });
      
      // Add to activity log
      const activityRef = collection(db, 'users', user.uid, 'activity');
      await updateDoc(activityRef, {
        message: 'Completed a task',
        type: 'task_complete',
        timestamp: Timestamp.now(),
        icon: '✅'
      });
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const cardClass = "bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-[24px] shadow-sm transition-all duration-300";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Header Section with Notifications */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Dashboard <span className="animate-pulse inline-block ml-2">✨</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
              Welcome back, <span className="text-slate-900 dark:text-white font-bold">{user?.displayName?.split(' ')[0] || 'User'}</span>. Here's your productivity hub.
            </p>
          </div>
          
          {/* Notifications Bell */}
          <div className="relative">
            <button className="p-3 rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors group">
              <Bell size={20} className="text-slate-600 dark:text-slate-300 group-hover:text-indigo-500" />
              {notifications.length > 0 && (
                <>
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <span className="text-[10px] font-bold text-white">{notifications.length}</span>
                  </span>
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-ping opacity-75"></span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <StatCard 
          title="Tasks Completed" 
          value={`${stats.completedTasks}/${stats.totalTasks}`} 
          icon={<Target size={20} />}
          color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
          border="border-emerald-500/20"
          trend={stats.totalTasks > 0 ? `↑ ${stats.completedTasks} today` : "No tasks yet"}
          progress={stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}
        />
        <StatCard 
          title="Current Streak" 
          value={`${stats.currentStreak} days`} 
          icon={<Flame size={20} />}
          color="bg-orange-500/10 text-orange-600 dark:text-orange-400" 
          border="border-orange-500/20"
          trend={`Longest: ${stats.longestStreak} days`}
          progress={stats.currentStreak > 0 ? Math.min((stats.currentStreak / 30) * 100, 100) : 0}
        />
        <StatCard 
          title="Productivity" 
          value={`${stats.productivity}%`} 
          icon={<TrendingUp size={20} />}
          color="bg-blue-500/10 text-blue-600 dark:text-blue-400" 
          border="border-blue-500/20"
          trend="Live updating"
          progress={stats.productivity}
        />
        <StatCard 
          title="Daily Goal" 
          value={`${stats.completedTasks}/${dailyGoal}`} 
          icon={<TargetIcon size={20} />}
          color="bg-purple-500/10 text-purple-600 dark:text-purple-400" 
          border="border-purple-500/20"
          trend={`${stats.dailyGoalProgress}% complete`}
          progress={stats.dailyGoalProgress}
        />
        <StatCard 
          title="Active Habits" 
          value={stats.activeHabits} 
          icon={<Activity size={20} />}
          color="bg-rose-500/10 text-rose-600 dark:text-rose-400" 
          border="border-rose-500/20"
          trend={`${stats.habitCompletions} check-ins`}
          progress={stats.activeHabits > 0 ? Math.min((stats.habitCompletions / (stats.activeHabits * 7)) * 100, 100) : 0}
        />
      </div>

      {/* Quick Access Tabs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tabs.map((tab) => (
          <QuickAccessCard 
            key={tab.id}
            tab={tab}
            onClick={() => navigate(tab.path)}
            data={{
              tasks: recentTasks,
              habits: habitStreaks,
              events: calendarEvents,
              goals: goals,
              routines: routines
            }}
          />
        ))}
      </div>

      {/* Notifications Panel */}
      {notifications.length > 0 && (
        <div className="fixed bottom-6 right-6 w-80 bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 animate-slide-up">
          <div className="p-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell size={16} />
              Notifications
            </h4>
            <span className="text-xs font-bold px-2 py-1 bg-red-500/10 text-red-500 rounded-full">
              {notifications.length} new
            </span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <div 
                key={notification.id}
                className="p-4 border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5"
              >
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-semibold text-slate-900 dark:text-white">{notification.title}</h5>
                  <button 
                    onClick={() => handleMarkNotificationRead(notification.id)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Dismiss
                  </button>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{notification.message}</p>
                <p className="text-xs text-slate-400 mt-2">
                  {new Date(notification.timestamp?.seconds * 1000).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Quick Access Card Component
const QuickAccessCard = ({ tab, onClick, data }) => {
  const getPreviewContent = () => {
    switch(tab.id) {
      case 'tasks':
        return (
          <div className="space-y-2">
            {data.tasks.slice(0, 2).map(task => (
              <div key={task.id} className="flex items-center gap-2 text-xs">
                {task.completed ? 
                  <CheckCircle2 size={12} className="text-emerald-500" /> : 
                  <Circle size={12} className="text-slate-300" />
                }
                <span className="truncate flex-1 text-slate-600 dark:text-slate-400">{task.text}</span>
                {task.priority && (
                  <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${
                    task.priority === 'High' ? 'bg-red-500/10 text-red-500' :
                    task.priority === 'Med' ? 'bg-orange-500/10 text-orange-500' :
                    'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {task.priority}
                  </span>
                )}
              </div>
            ))}
            {data.tasks.length === 0 && (
              <p className="text-xs text-slate-400">No tasks yet</p>
            )}
          </div>
        );
      
      case 'habits':
        return (
          <div className="space-y-2">
            {data.habits.slice(0, 2).map(habit => (
              <div key={habit.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">{habit.name}</span>
                <div className="flex items-center gap-1">
                  <Flame size={10} className="text-orange-500" />
                  <span className="font-bold">{habit.currentStreak || 0}</span>
                </div>
              </div>
            ))}
            {data.habits.length === 0 && (
              <p className="text-xs text-slate-400">No active habits</p>
            )}
          </div>
        );
      
      case 'calendar':
        return (
          <div className="space-y-2">
            {data.events.slice(0, 2).map(event => (
              <div key={event.id} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="truncate flex-1 text-slate-600 dark:text-slate-400">{event.title}</span>
                <span className="text-slate-400">
                  {new Date(event.startTime?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {data.events.length === 0 && (
              <p className="text-xs text-slate-400">No upcoming events</p>
            )}
          </div>
        );
      
      case 'goals':
        return (
          <div className="space-y-2">
            {data.goals.slice(0, 2).map(goal => (
              <div key={goal.id} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">{goal.title}</span>
                  <span className="text-slate-400">{goal.progress || 0}%</span>
                </div>
                <div className="w-full h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                    style={{ width: `${goal.progress || 0}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {data.goals.length === 0 && (
              <p className="text-xs text-slate-400">No goals set</p>
            )}
          </div>
        );
      
      case 'routines':
        return (
          <div className="space-y-2">
            {data.routines.slice(0, 2).map(routine => (
              <div key={routine.id} className="flex items-center gap-2 text-xs">
                <Clock size={10} className="text-indigo-500" />
                <span className="truncate flex-1 text-slate-600 dark:text-slate-400">{routine.name}</span>
                <span className="text-slate-400">{routine.time || 'Anytime'}</span>
              </div>
            ))}
            {data.routines.length === 0 && (
              <p className="text-xs text-slate-400">No routines created</p>
            )}
          </div>
        );
      
      case 'streakgarden':
        return (
          <div className="flex items-center justify-around py-2">
            {[1,2,3].map((i) => (
              <div key={i} className="flex flex-col items-center">
                <Flower2 size={20} className="text-green-500" />
                <div className="w-1 h-6 bg-gradient-to-t from-green-500 to-emerald-300 rounded-full mt-1"></div>
                <span className="text-[8px] text-slate-400 mt-1">Day {i}</span>
              </div>
            ))}
          </div>
        );
      
      case 'relaxzone':
        return (
          <div className="flex items-center justify-center gap-4 py-2">
            <Moon size={20} className="text-violet-500 animate-pulse" />
            <Sparkles size={20} className="text-purple-500" />
            <Coffee size={20} className="text-amber-500" />
          </div>
        );
      
      case 'reports':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">This week</span>
              <span className="font-bold text-green-500">+12%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Last week</span>
              <span className="font-bold text-slate-600">85%</span>
            </div>
            <div className="flex gap-1 pt-1">
              {[40, 60, 45, 70, 85, 65, 90].map((height, i) => (
                <div key={i} className="flex-1 h-12 bg-slate-100 dark:bg-white/5 rounded-sm relative">
                  <div 
                    className="absolute bottom-0 w-full bg-gradient-to-t from-rose-500 to-pink-500 rounded-sm"
                    style={{ height: `${height}%` }}
                  ></div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'settings':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Theme</span>
              <span className="text-slate-400">Dark/Light</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Notifications</span>
              <span className="text-slate-400">On</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Language</span>
              <span className="text-slate-400">English</span>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`
        relative overflow-hidden p-6 rounded-2xl 
        bg-white dark:bg-black 
        border border-slate-200 dark:border-white/10 
        hover:border-slate-300 dark:hover:border-white/20
        shadow-sm hover:shadow-xl hover:-translate-y-1 
        transition-all duration-300 cursor-pointer group
      `}
    >
      {/* Gradient Background on Hover */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 bg-gradient-to-br ${tab.color}`}></div>
      
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tab.bgColor} border ${tab.borderColor} transition-transform group-hover:scale-110 group-hover:rotate-3`}>
          <div className={tab.textColor}>{tab.icon}</div>
        </div>
        <ArrowRight size={18} className="text-slate-400 group-hover:text-indigo-500 transition-all group-hover:translate-x-1" />
      </div>
      
      {/* Title & Description */}
      <div className="mb-4">
        <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {tab.name}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tab.description}</p>
      </div>
      
      {/* Preview Content */}
      <div className="border-t border-slate-100 dark:border-white/5 pt-4 mt-2">
        {getPreviewContent()}
      </div>
      
      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-slate-400">Click to open</span>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${tab.bgColor} ${tab.textColor}`}>
          View all
        </span>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon, color, border, trend, progress }) => (
  <div className={`
    relative overflow-hidden p-5 rounded-2xl 
    bg-white dark:bg-black 
    border border-slate-200 dark:border-white/10 
    hover:border-slate-300 dark:hover:border-white/20
    shadow-sm hover:shadow-xl hover:-translate-y-1 
    transition-all duration-300 group
  `}>
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 tracking-wide uppercase">
          {title}
        </p>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {value}
        </h3>
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} border ${border} transition-transform group-hover:scale-110 group-hover:rotate-3`}>
        {icon}
      </div>
    </div>
    
    {/* Progress Bar */}
    <div className="mb-3">
      <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-1.5 overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${progress}%`,
            background: progress > 70 ? 'linear-gradient(90deg, #10b981, #34d399)' :
                       progress > 40 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' :
                       'linear-gradient(90deg, #ef4444, #f87171)'
          }}
        ></div>
      </div>
    </div>
    
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
        {trend}
      </span>
      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
        {progress}%
      </span>
    </div>
  </div>
);

export default Dashboard;