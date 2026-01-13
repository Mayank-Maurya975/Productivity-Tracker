import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext'; 

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

function App() {
  const { user, loading } = useAuth();

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