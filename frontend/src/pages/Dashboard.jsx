import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, Circle, ArrowRight, Zap, Clock, TrendingUp, 
  Bell, Calendar, Target, Flame, Activity, Award, Star, 
  ChevronRight, Battery, Trophy, Target as TargetIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { 
  collection, query, onSnapshot, orderBy, where,
  Timestamp, doc, updateDoc, arrayUnion 
} from 'firebase/firestore';

const Dashboard = () => {
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

  useEffect(() => {
    if (!user) return;

    // 1. Subscribe to Tasks (Real-time)
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
      
      // Calculate overdue tasks
      const overdue = tasks.filter(task => 
        task.dueDate && 
        !task.completed && 
        new Date(task.dueDate.seconds * 1000) < now
      ).length;
      
      // Calculate tasks due today/tomorrow
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

    // 2. Subscribe to Habits with Streaks
    const habitsQuery = query(collection(db, 'users', user.uid, 'habits'));
    
    const unsubscribeHabits = onSnapshot(habitsQuery, (snapshot) => {
      const habits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const totalChecks = habits.reduce((acc, curr) => acc + (curr.checks?.length || 0), 0);
      
      // Calculate streaks
      const streaks = habits.map(habit => {
        const checks = habit.checks || [];
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;
        
        // Sort checks by date
        const sortedChecks = checks.sort((a, b) => a.seconds - b.seconds);
        
        sortedChecks.forEach((check, index) => {
          const checkDate = new Date(check.seconds * 1000);
          const prevDate = index > 0 ? new Date(sortedChecks[index - 1].seconds * 1000) : null;
          
          // Check if consecutive days
          if (prevDate && 
              Math.abs((checkDate - prevDate) / (1000 * 60 * 60 * 24)) <= 1) {
            tempStreak++;
          } else {
            tempStreak = 1;
          }
          
          longestStreak = Math.max(longestStreak, tempStreak);
          
          // Check if last check was today or yesterday
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

    // 3. Subscribe to Notifications (Live)
    const notificationsQuery = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('timestamp', 'desc'),
      where('read', '==', false)
    );
    
    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(notifs.slice(0, 5));
    });

    // 4. Subscribe to Activity Log (Live Feed)
    const activityQuery = query(
      collection(db, 'users', user.uid, 'activity'),
      orderBy('timestamp', 'desc')
    );
    
    const unsubscribeActivity = onSnapshot(activityQuery, (snapshot) => {
      const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLiveActivity(activities.slice(0, 8));
    });

    // 5. Simulate live productivity score updates
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        productivity: prev.productivity > 95 ? 95 : prev.productivity + 0.5
      }));
    }, 30000);

    return () => {
      unsubscribeTasks();
      unsubscribeHabits();
      unsubscribeNotifications();
      unsubscribeActivity();
      clearInterval(interval);
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
              Overview <span className="animate-pulse inline-block ml-2">🚀</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
              Welcome back, <span className="text-slate-900 dark:text-white font-bold">{user?.displayName?.split(' ')[0] || 'User'}</span>. Here's your daily brief.
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

      {/* Stats Grid - Enhanced */}
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

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Focus Progress & Upcoming */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Focus Progress with Animated Progress Bars */}
          <div className={`p-8 ${cardClass} relative overflow-hidden group`}>
            <div className="flex justify-between items-center mb-8 relative z-10">
              <div>
                <h3 className="font-bold text-xl text-slate-900 dark:text-white">Focus Progress</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Real-time completion tracking</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-white/5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live
                </span>
                {stats.overdueTasks > 0 && (
                  <span className="text-xs font-bold px-3 py-1 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full border border-red-500/20 flex items-center gap-1">
                    <Clock size={10} /> {stats.overdueTasks} overdue
                  </span>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              <div>
                <div className="flex justify-between text-sm font-bold mb-3 text-slate-700 dark:text-slate-200">
                  <span>Task Completion Rate</span>
                  <span className="flex items-center gap-1">
                    {stats.productivity}% 
                    {stats.productivity > 70 && <TrendingUp size={12} className="text-emerald-500" />}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-5 overflow-hidden border border-slate-200 dark:border-white/5">
                  <div 
                    className="bg-gradient-to-r from-indigo-600 to-blue-500 h-full rounded-full transition-all duration-1000 ease-out relative" 
                    style={{ width: `${stats.productivity}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm font-bold mb-3 text-slate-700 dark:text-slate-200">
                  <span>Daily Goal Progress</span>
                  <span>{stats.dailyGoalProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-5 overflow-hidden border border-slate-200 dark:border-white/5">
                  <div 
                    className="bg-gradient-to-r from-purple-600 to-pink-500 h-full rounded-full transition-all duration-1000 ease-out relative" 
                    style={{ width: `${stats.dailyGoalProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mt-8">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-center">
                <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.completedTasks}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Completed</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-center">
                <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalTasks - stats.completedTasks}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Pending</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-center">
                <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.overdueTasks}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Overdue</div>
              </div>
            </div>
          </div>

          {/* Habit Streaks */}
          <div className={`p-6 ${cardClass}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Habit Streaks</h3>
              <Link 
                to="/habits" 
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                Manage <ChevronRight size={14} />
              </Link>
            </div>
            
            <div className="space-y-4">
              {habitStreaks.slice(0, 3).map((habit, index) => (
                <div 
                  key={habit.id} 
                  className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-slate-50 to-white dark:from-white/5 dark:to-white/2 border border-slate-100 dark:border-white/5 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      habit.currentStreak > 0 
                        ? 'bg-emerald-500/10 text-emerald-500' 
                        : 'bg-slate-100 dark:bg-white/5 text-slate-400'
                    }`}>
                      <Flame size={18} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {habit.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{habit.frequency}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-black text-slate-900 dark:text-white">{habit.currentStreak}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">days streak</div>
                    </div>
                    <div className="w-12 h-12 rounded-full border-4 border-slate-200 dark:border-white/10 relative">
                      <div 
                        className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent border-r-transparent"
                        style={{ transform: `rotate(${(habit.currentStreak / 30) * 360}deg)` }}
                      ></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Award size={14} className="text-emerald-500" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {habitStreaks.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Flame size={24} className="text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">No active habits. Start building streaks!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Tasks, Deadlines & Activity */}
        <div className="space-y-6">
          
          {/* Recent Tasks with Quick Actions */}
          <div className={`p-6 ${cardClass}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Recent Tasks</h3>
              <Link 
                to="/tasks" 
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                View All <ArrowRight size={14} />
              </Link>
            </div>
            
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <div 
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all group border border-transparent hover:border-slate-100 dark:hover:border-white/5"
                >
                  <button 
                    onClick={() => !task.completed && handleCompleteTask(task.id)}
                    className={`shrink-0 transition-all group-hover:scale-110 ${
                      task.completed 
                        ? 'text-emerald-500' 
                        : 'text-slate-300 dark:text-slate-600 hover:text-emerald-500 dark:hover:text-emerald-400'
                    }`}
                  >
                    {task.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${
                      task.completed 
                        ? 'text-slate-400 line-through' 
                        : 'text-slate-700 dark:text-slate-200'
                    }`}>
                      {task.text}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {task.dueDate && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(task.dueDate.seconds * 1000).toLocaleDateString()}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        task.priority === 'High' ? 'bg-red-500/10 text-red-500' :
                        task.priority === 'Med' ? 'bg-orange-500/10 text-orange-500' :
                        'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className={`p-6 ${cardClass}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar size={18} />
                Upcoming Deadlines
              </h3>
              <span className="text-xs font-bold px-2 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full">
                {upcomingDeadlines.length} pending
              </span>
            </div>
            
            <div className="space-y-3">
              {upcomingDeadlines.map((task) => (
                <div 
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-500/5 border border-amber-100 dark:border-amber-500/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                      <Clock size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{task.text}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Due {new Date(task.dueDate.seconds * 1000).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleCompleteTask(task.id)}
                    className="text-xs font-bold px-3 py-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    Done
                  </button>
                </div>
              ))}
              
              {upcomingDeadlines.length === 0 && (
                <div className="text-center py-4">
                  <Calendar size={24} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No upcoming deadlines</p>
                </div>
              )}
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className={`p-6 ${cardClass}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Activity size={18} />
                Live Activity
              </h3>
              <span className="text-xs font-bold px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Live
              </span>
            </div>
            
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {liveActivity.map((activity, index) => (
                <div 
                  key={activity.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    {activity.icon || '📝'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-900 dark:text-white">{activity.message}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(activity.timestamp?.seconds * 1000).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
              
              {liveActivity.length === 0 && (
                <div className="text-center py-4">
                  <Activity size={24} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Panel (Floating) */}
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

// Enhanced Stat Card Component
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