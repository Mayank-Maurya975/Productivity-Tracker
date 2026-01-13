import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = ({ darkMode, setDarkMode }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-black dark:via-zinc-950 dark:to-black transition-colors duration-500 font-sans text-slate-900 dark:text-white selection:bg-indigo-100 dark:selection:bg-indigo-900/50 overflow-hidden">
      
      {/* Animated Background Gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-50/20 via-transparent to-purple-50/20 dark:from-indigo-950/10 dark:via-transparent dark:to-purple-950/10 pointer-events-none" />
      
      {/* Animated Grid Pattern */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:20px_20px] pointer-events-none opacity-50" />

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <Sidebar 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        isOpen={isMobileMenuOpen} 
        toggleSidebar={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-64 relative isolate w-full transition-all duration-500 overflow-hidden">
        {/* Floating Particles Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-indigo-400/20 dark:bg-indigo-500/10"
              initial={{
                x: Math.random() * 100 + 'vw',
                y: Math.random() * 100 + 'vh',
              }}
              animate={{
                x: Math.random() * 100 + 'vw',
                y: Math.random() * 100 + 'vh',
              }}
              transition={{
                duration: Math.random() * 30 + 20,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
          ))}
        </div>

        <Navbar 
          toggleSidebar={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          darkMode={darkMode} 
          setDarkMode={setDarkMode} 
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 scroll-smooth bg-gradient-to-b from-transparent to-white/50 dark:to-black/50 relative pb-24 md:pb-6">
          <div className="max-w-7xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                className="w-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Floating Action Button for Mobile */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 shadow-2xl shadow-indigo-500/50 flex items-center justify-center text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </motion.button>
      </div>
    </div>
  );
};

const pageVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  in: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1]
    } 
  },
  out: { 
    opacity: 0, 
    y: -10, 
    scale: 0.98,
    transition: { duration: 0.2 } 
  }
};

export default Layout;