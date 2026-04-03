import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, Circle, ArrowRight, Zap, Clock, TrendingUp, 
  Bell, Calendar, Target, Flame, Activity, Award, Star, 
  ChevronRight, Battery, Trophy, Target as TargetIcon,
  BookOpen, Leaf, Coffee, ListTodo, CalendarDays, Goal,
  Users, Layout, Settings, Flower2, Moon, Sparkles, Plus,
  RefreshCw, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { 
  collection, query, onSnapshot, orderBy, where,
  Timestamp, doc, updateDoc, addDoc, deleteDoc,
  getDocs, limit
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
    overdueTasks: 0,
    totalGoals: 0,
    goalsCompleted: 0
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
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Tab configuration
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

  // Function to calculate habit streak
  const calculateStreak = useCallback((checks) => {
    if (!checks || checks.length === 0) return 0;
    
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Sort checks in descending order
    const sortedChecks = [...checks].sort((a, b) => {
      const dateA = new Date(a.seconds ? a.seconds * 1000 : a);
      const dateB = new Date(b.seconds ? b.seconds * 1000 : b);
      return dateB - dateA;
    });
    
    let checkDate = new Date(sortedChecks[0].seconds ? sortedChecks[0].seconds * 1000 : sortedChecks[0]);
    checkDate.setHours(0, 0, 0, 0);
    
    // Check if latest check is today or yesterday
    const dayDiff = Math.floor((today - checkDate) / (1000 * 60 * 60 * 24));
    if (dayDiff > 1) return 0;
    
    currentStreak = 1;
    
    // Count consecutive days
    for (let i = 1; i < sortedChecks.length; i++) {
      const prevDate = new Date(sortedChecks[i-1].seconds ? sortedChecks[i-1].seconds * 1000 : sortedChecks[i-1]);
      const currDate = new Date(sortedChecks[i].seconds ? sortedChecks[i].seconds * 1000 : sortedChecks[i]);
      prevDate.setHours(0, 0, 0, 0);
      currDate.setHours(0, 0, 0, 0);
      
      const diff = Math.floor((prevDate - currDate) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    return currentStreak;
  }, []);

  // Fetch tasks with real-time updates
  useEffect(() => {
    if (!user) return;

    // Tasks subscription
    const tasksQuery = query(
      collection(db, 'users', user.uid, 'tasks'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        dueDate: doc.data().dueDate?.seconds ? new Date(doc.data().dueDate.seconds * 1000) : null,
        createdAt: doc.data().createdAt?.seconds ? new Date(doc.data().createdAt.seconds * 1000) : new Date()
      }));
      
      const now = new Date();
      const completed = tasks.filter(t => t.completed).length;
      const total = tasks.length;
      const productivityScore = total === 0 ? 0 : Math.round((completed / total) * 100);
      
      const overdue = tasks.filter(task => 
        task.dueDate && 
        !task.completed && 
        new Date(task.dueDate) < now
      ).length;
      
      const upcoming = tasks
        .filter(task => 
          task.dueDate && 
          !task.completed &&
          new Date(task.dueDate) > now
        )
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 3);

      setUpcomingDeadlines(upcoming);

      setStats(prev => ({
        ...prev,
        completedTasks: completed,
        totalTasks: total,
        productivity: productivityScore,
        overdueTasks: overdue,
        dailyGoalProgress: dailyGoal > 0 ? Math.min(Math.round((completed / dailyGoal) * 100), 100) : 0
      }));

      setRecentTasks(tasks.slice(0, 5));
      setLastUpdated(new Date());
    }, (error) => {
      console.error('Error fetching tasks:', error);
    });

    // Habits subscription with streak calculation
    const habitsQuery = query(collection(db, 'users', user.uid, 'habits'));
    
    const unsubscribeHabits = onSnapshot(habitsQuery, (snapshot) => {
      const habits = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        monthlyData: doc.data().monthlyData || {}
      }));
      
      // Get current month's checks
      const currentDate = new Date();
      const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;
      
      let totalChecks = 0;
      let totalCurrentStreak = 0;
      let maxStreak = 0;
      
      const streaks = habits.map(habit => {
        const monthlyChecks = habit.monthlyData?.[monthKey] || [];
        totalChecks += monthlyChecks.length;
        
        // Calculate streak based on monthly checks (which are day numbers)
        let streak = 0;
        const today = currentDate.getDate();
        
        for (let i = today; i >= 1; i--) {
          if (monthlyChecks.includes(i)) {
            streak++;
          } else {
            break;
          }
        }
        
        totalCurrentStreak += streak;
        if (streak > maxStreak) maxStreak = streak;
        
        return { ...habit, currentStreak: streak, longestStreak: streak };
      });

      setHabitStreaks(streaks);
      
      const avgStreak = habits.length > 0 ? Math.round(totalCurrentStreak / habits.length) : 0;

      setStats(prev => ({
        ...prev,
        activeHabits: habits.length,
        habitCompletions: totalChecks,
        currentStreak: avgStreak,
        longestStreak: maxStreak
      }));
    }, (error) => {
      console.error('Error fetching habits:', error);
    });

    // Calendar events subscription
    const calendarQuery = query(
      collection(db, 'users', user.uid, 'events'),
      orderBy('startTime', 'asc'),
      where('startTime', '>=', new Date())
    );
    
    const unsubscribeCalendar = onSnapshot(calendarQuery, (snapshot) => {
      const events = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        startTime: doc.data().startTime?.seconds ? new Date(doc.data().startTime.seconds * 1000) : null,
        endTime: doc.data().endTime?.seconds ? new Date(doc.data().endTime.seconds * 1000) : null
      }));
      setCalendarEvents(events.slice(0, 3));
    }, (error) => {
      console.error('Error fetching calendar events:', error);
    });

    // Goals subscription
    const goalsQuery = query(collection(db, 'users', user.uid, 'goals'));
    
    const unsubscribeGoals = onSnapshot(goalsQuery, (snapshot) => {
      const goalsData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        progress: doc.data().progress || 0
      }));
      setGoals(goalsData.slice(0, 3));
      
      const completed = goalsData.filter(g => g.progress >= 100).length;
      setStats(prev => ({
        ...prev,
        totalGoals: goalsData.length,
        goalsCompleted: completed
      }));
    }, (error) => {
      console.error('Error fetching goals:', error);
    });

    // Routines subscription
    const routinesQuery = query(collection(db, 'users', user.uid, 'routines'));
    
    const unsubscribeRoutines = onSnapshot(routinesQuery, (snapshot) => {
      const routinesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRoutines(routinesData.slice(0, 3));
    }, (error) => {
      console.error('Error fetching routines:', error);
    });

    // Notifications subscription
    const notificationsQuery = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('timestamp', 'desc'),
      where('read', '==', false)
    );
    
    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        timestamp: doc.data().timestamp?.seconds ? new Date(doc.data().timestamp.seconds * 1000) : new Date()
      }));
      setNotifications(notifs.slice(0, 5));
    }, (error) => {
      console.error('Error fetching notifications:', error);
    });

    // Activity subscription
    const activityQuery = query(
      collection(db, 'users', user.uid, 'activity'),
      orderBy('timestamp', 'desc'),
      limit(8)
    );
    
    const unsubscribeActivity = onSnapshot(activityQuery, (snapshot) => {
      const activities = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        timestamp: doc.data().timestamp?.seconds ? new Date(doc.data().timestamp.seconds * 1000) : new Date()
      }));
      setLiveActivity(activities);
    }, (error) => {
      console.error('Error fetching activity:', error);
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
      await addDoc(collection(db, 'users', user.uid, 'activity'), {
        message: 'Completed a task',
        type: 'task_complete',
        timestamp: Timestamp.now(),
        icon: '✅'
      });
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setLastUpdated(new Date());
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const cardClass = "bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-[24px] shadow-sm transition-all duration-300";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
                <Sparkles size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {getGreeting()}! <span className="animate-pulse inline-block">✨</span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
                  Welcome back, <span className="text-slate-900 dark:text-white font-bold">{user?.displayName?.split(' ')[0] || 'User'}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
              <button 
                onClick={handleRefresh}
                className={`p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all ${isRefreshing ? 'animate-spin' : ''}`}
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
          
          {/* Notifications Bell */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-3 rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors group"
            >
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <StatCard 
          title="Tasks Completed" 
          value={`${stats.completedTasks}/${stats.totalTasks}`} 
          icon={<Target size={20} />}
          color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
          border="border-emerald-500/20"
          trend={stats.totalTasks > 0 ? `↑ ${stats.completedTasks} done` : "No tasks yet"}
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
        <StatCard 
          title="Goals" 
          value={`${stats.goalsCompleted}/${stats.totalGoals}`} 
          icon={<Award size={20} />}
          color="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" 
          border="border-yellow-500/20"
          trend={`${stats.totalGoals - stats.goalsCompleted} remaining`}
          progress={stats.totalGoals > 0 ? Math.round((stats.goalsCompleted / stats.totalGoals) * 100) : 0}
        />
      </div>

      {/* Live Activity Feed */}
      {liveActivity.length > 0 && (
        <div className={`${cardClass} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Zap size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Live Activity</h3>
                <p className="text-xs text-slate-500">Real-time updates from your workflow</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-slate-500">Live</span>
            </div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {liveActivity.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                <div className="text-xl">{activity.icon || '📝'}</div>
                <div className="flex-1">
                  <p className="text-sm text-slate-600 dark:text-slate-300">{activity.message}</p>
                  <p className="text-xs text-slate-400">
                    {activity.timestamp?.toLocaleTimeString() || new Date().toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              routines: routines,
              onCompleteTask: handleCompleteTask
            }}
          />
        ))}
      </div>

      {/* Overdue Tasks Alert */}
      {stats.overdueTasks > 0 && (
        <div className="fixed bottom-6 right-6 w-80 bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-2xl shadow-2xl z-50 animate-slide-up">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle size={20} className="text-red-500" />
              <h4 className="font-bold text-red-600 dark:text-red-400">Overdue Tasks</h4>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              You have {stats.overdueTasks} overdue task{stats.overdueTasks > 1 ? 's' : ''}
            </p>
            <button 
              onClick={() => navigate('/tasks')}
              className="w-full py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors"
            >
              View Tasks
            </button>
          </div>
        </div>
      )}

      {/* Notifications Panel */}
      {showNotifications && notifications.length > 0 && (
        <div className="fixed bottom-6 right-6 w-96 bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 animate-slide-up">
          <div className="p-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell size={16} />
              Notifications
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-1 bg-red-500/10 text-red-500 rounded-full">
                {notifications.length} new
              </span>
              <button 
                onClick={() => setShowNotifications(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <div 
                key={notification.id}
                className="p-4 border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
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
                  {notification.timestamp?.toLocaleTimeString() || new Date().toLocaleTimeString()}
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
            {data.tasks.slice(0, 3).map(task => (
              <div key={task.id} className="flex items-center gap-2 text-xs group/task">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (data.onCompleteTask) data.onCompleteTask(task.id);
                  }}
                  className="hover:scale-110 transition-transform"
                >
                  {task.completed ? 
                    <CheckCircle2 size={14} className="text-emerald-500" /> : 
                    <Circle size={14} className="text-slate-300 hover:text-emerald-500" />
                  }
                </button>
                <span className={`truncate flex-1 ${task.completed ? 'line-through text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
                  {task.text}
                </span>
                {task.priority && !task.completed && (
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                    task.priority === 'High' ? 'bg-red-500/10 text-red-500' :
                    task.priority === 'Medium' ? 'bg-orange-500/10 text-orange-500' :
                    'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {task.priority}
                  </span>
                )}
              </div>
            ))}
            {data.tasks.length === 0 && (
              <div className="text-center py-4">
                <p className="text-xs text-slate-400">No tasks yet</p>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = '/tasks';
                  }}
                  className="mt-2 text-xs text-indigo-500 hover:text-indigo-600 font-bold"
                >
                  + Create Task
                </button>
              </div>
            )}
            {data.tasks.length > 0 && data.tasks.length < 3 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = '/tasks';
                }}
                className="text-xs text-indigo-500 hover:text-indigo-600 font-bold mt-1"
              >
                + Add more
              </button>
            )}
          </div>
        );
      
      case 'habits':
        return (
          <div className="space-y-2">
            {data.habits.slice(0, 3).map(habit => (
              <div key={habit.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400 truncate flex-1">{habit.name}</span>
                <div className="flex items-center gap-1 ml-2">
                  <Flame size={10} className="text-orange-500" />
                  <span className="font-bold text-orange-600 dark:text-orange-400">{habit.currentStreak || 0}</span>
                </div>
              </div>
            ))}
            {data.habits.length === 0 && (
              <div className="text-center py-4">
                <p className="text-xs text-slate-400">No active habits</p>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = '/habits';
                  }}
                  className="mt-2 text-xs text-emerald-500 hover:text-emerald-600 font-bold"
                >
                  + Create Habit
                </button>
              </div>
            )}
          </div>
        );
      
      case 'calendar':
        return (
          <div className="space-y-2">
            {data.events.slice(0, 3).map(event => (
              <div key={event.id} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="truncate flex-1 text-slate-600 dark:text-slate-400">{event.title}</span>
                <span className="text-slate-400 text-[10px]">
                  {event.startTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {data.events.length === 0 && (
              <div className="text-center py-4">
                <p className="text-xs text-slate-400">No upcoming events</p>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = '/calendar';
                  }}
                  className="mt-2 text-xs text-purple-500 hover:text-purple-600 font-bold"
                >
                  + Add Event
                </button>
              </div>
            )}
          </div>
        );
      
      case 'goals':
        return (
          <div className="space-y-3">
            {data.goals.slice(0, 2).map(goal => (
              <div key={goal.id} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 truncate flex-1">{goal.title}</span>
                  <span className="text-slate-400 ml-2">{goal.progress || 0}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500"
                    style={{ width: `${goal.progress || 0}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {data.goals.length === 0 && (
              <div className="text-center py-4">
                <p className="text-xs text-slate-400">No goals set</p>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = '/goals';
                  }}
                  className="mt-2 text-xs text-orange-500 hover:text-orange-600 font-bold"
                >
                  + Set Goal
                </button>
              </div>
            )}
          </div>
        );
      
      case 'routines':
        return (
          <div className="space-y-2">
            {data.routines.slice(0, 3).map(routine => (
              <div key={routine.id} className="flex items-center gap-2 text-xs">
                <Clock size={10} className="text-indigo-500" />
                <span className="truncate flex-1 text-slate-600 dark:text-slate-400">{routine.name}</span>
                <span className="text-slate-400 text-[10px]">{routine.time || 'Anytime'}</span>
              </div>
            ))}
            {data.routines.length === 0 && (
              <div className="text-center py-4">
                <p className="text-xs text-slate-400">No routines created</p>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = '/routines';
                  }}
                  className="mt-2 text-xs text-indigo-500 hover:text-indigo-600 font-bold"
                >
                  + Create Routine
                </button>
              </div>
            )}
          </div>
        );
      
      case 'streakgarden':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-around py-2">
              {[1,2,3,4].map((i) => (
                <div key={i} className="flex flex-col items-center">
                  <Flower2 size={24} className="text-green-500" />
                  <div className="w-1 h-8 bg-gradient-to-t from-green-500 to-emerald-300 rounded-full mt-1"></div>
                  <span className="text-[8px] text-slate-400 mt-1">Day {i}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-slate-500">Keep your streak alive!</p>
          </div>
        );
      
      case 'relaxzone':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-6 py-3">
              <Moon size={24} className="text-violet-500 animate-pulse" />
              <Sparkles size={24} className="text-purple-500" />
              <Coffee size={24} className="text-amber-500" />
              <Leaf size={24} className="text-emerald-500" />
            </div>
            <p className="text-center text-xs text-slate-500">Take a moment to relax</p>
          </div>
        );
      
      case 'reports':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Weekly Progress</span>
              <span className="font-bold text-green-500">+12%</span>
            </div>
            <div className="flex gap-1 pt-1 h-16">
              {[40, 60, 45, 70, 85, 65, 90].map((height, i) => (
                <div key={i} className="flex-1 bg-slate-100 dark:bg-white/5 rounded-sm relative">
                  <div 
                    className="absolute bottom-0 w-full bg-gradient-to-t from-rose-500 to-pink-500 rounded-sm transition-all duration-300"
                    style={{ height: `${height}%` }}
                  ></div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
            </div>
          </div>
        );
      
      case 'settings':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-slate-600 dark:text-slate-400">Theme</span>
              <span className="text-slate-400">Auto</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-slate-600 dark:text-slate-400">Notifications</span>
              <span className="text-slate-400">Enabled</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1">
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
        relative overflow-hidden p-5 rounded-2xl 
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
    relative overflow-hidden p-4 rounded-2xl 
    bg-white dark:bg-black 
    border border-slate-200 dark:border-white/10 
    hover:border-slate-300 dark:hover:border-white/20
    shadow-sm hover:shadow-xl hover:-translate-y-1 
    transition-all duration-300 group
  `}>
    <div className="flex justify-between items-start mb-3">
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 tracking-wide uppercase">
          {title}
        </p>
        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
          {value}
        </h3>
      </div>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color} border ${border} transition-transform group-hover:scale-110 group-hover:rotate-3`}>
        {icon}
      </div>
    </div>
    
    {/* Progress Bar */}
    <div className="mb-2">
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
      <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
        {trend}
      </span>
      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
        {progress}%
      </span>
    </div>
  </div>
);

export default Dashboard;