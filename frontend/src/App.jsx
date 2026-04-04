import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { useEffect } from 'react';

import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import Routines from './pages/Routines';
import Tasks from './pages/Tasks';
import Habits from './pages/Habits';
import Calendar from './pages/Calendar';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import StreakGarden from './pages/StreakGarden';
import RelaxZone from './pages/RelaxZone';
import Productivity from './pages/Productivity';

// Fires a stronger haptic on every route change
function RouteHaptic() {
  const location = useLocation();
  useEffect(() => { if (navigator.vibrate) navigator.vibrate(18); }, [location.pathname]);
  return null;
}

// Request notification permission once, then tell SW to start scheduling
async function requestNotificationPermission() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') return;

  const reg = await navigator.serviceWorker.ready;

  // Tell SW to start interval-based scheduling (while app is open)
  reg.active?.postMessage({ type: 'START_NOTIFICATIONS' });

  // Periodic Background Sync — works even when app is fully closed
  if ('periodicSync' in reg) {
    try {
      await reg.periodicSync.register('focusflow-reminder', {
        minInterval: 3 * 60 * 60 * 1000, // 3 hours
      });
      console.log('[FocusFlow] Periodic Background Sync registered');
    } catch (err) {
      console.warn('[FocusFlow] Periodic Sync not available:', err.message);
    }
  }
}

function App() {
  const { user, loading } = useAuth();

  // Request notification permission once user is logged in
  useEffect(() => {
    if (user) requestNotificationPermission();
  }, [user]);

  // Optimized Loading Screen for OLED
  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-black transition-colors duration-500">
        <div className="relative flex flex-col items-center">
          {/* Logo or Brand Placeholder */}
          <div className="mb-8 animate-pulse">
            <div className="w-16 h-16 bg-indigo-600 rounded-[24px] flex items-center justify-center shadow-2xl shadow-indigo-600/20">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-zinc-600 animate-pulse">
            Initializing FocusFlow
          </h2>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        <RouteHaptic />
        <Routes>
          {/* PUBLIC BOUTIQUE */}
          <Route
            path="/login"
            element={user ? <Navigate to="/dashboard" replace /> : <Login />}
          />

          {/* PROTECTED ECOSYSTEM */}
          <Route
            element={
              <ProtectedRoute>
                <Layout /> 
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/routines" element={<Routines />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/garden" element={<StreakGarden />} />
            <Route path="/relax" element={<RelaxZone />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/productivity" element={<Productivity />} />
          </Route>

          {/* GLOBAL REDIRECT */}
          <Route
            path="*"
            element={<Navigate to={user ? '/dashboard' : '/login'} replace />}
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;