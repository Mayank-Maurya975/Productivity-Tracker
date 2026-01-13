import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  // 1. Core State
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : true;
  });

  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('focusflow-accent') || 'indigo';
  });

  // New: Manage Background Theme (OLED, Midnight, Slate, Modern)
  const [bgType, setBgType] = useState(() => {
    return localStorage.getItem('focusflow-bg-type') || 'midnight';
  });

  // 2. Define Background Themes
  const bgThemes = {
    // Pure OLED Black
    oled: {
      name: 'OLED',
      body: 'bg-black',
      card: 'bg-zinc-900/50',
      border: 'border-zinc-800',
      nav: 'bg-black/80'
    },
    // Deep Blue-Grey
    midnight: {
      name: 'Midnight',
      body: 'bg-[#0B1120]',
      card: 'bg-[#1E293B]/50',
      border: 'border-slate-800',
      nav: 'bg-[#0B1120]/80'
    },
    // Forest Green-Black
    forest: {
      name: 'Forest',
      body: 'bg-[#060D0D]',
      card: 'bg-[#0D1A1A]/50',
      border: 'border-emerald-900/30',
      nav: 'bg-[#060D0D]/80'
    },
    // Soft Light Grey (for Light Mode)
    light: {
      name: 'Modern Light',
      body: 'bg-slate-50',
      card: 'bg-white',
      border: 'border-slate-200',
      nav: 'bg-white/80'
    }
  };

  // 3. Apply Theme Classes to Document
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    localStorage.setItem('focusflow-bg-type', bgType);

    const root = document.documentElement;
    const bodyClass = darkMode ? bgThemes[bgType].body : bgThemes.light.body;
    
    // Set Dark Mode Class
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');

    // Clean up old classes and apply new background
    root.className = darkMode ? `dark ${bodyClass}` : bgThemes.light.body;
  }, [darkMode, bgType]);

  // 4. Accent Color Map
  const themeClasses = {
    indigo: {
      name: 'Indigo', bg: 'bg-indigo-600', text: 'text-indigo-500', border: 'border-indigo-500',
      bgLight: 'bg-indigo-500/10', shadow: 'shadow-indigo-500/20'
    },
    blue: {
      name: 'Blue', bg: 'bg-blue-600', text: 'text-blue-500', border: 'border-blue-500',
      bgLight: 'bg-blue-500/10', shadow: 'shadow-blue-500/20'
    },
    emerald: {
      name: 'Emerald', bg: 'bg-emerald-600', text: 'text-emerald-500', border: 'border-emerald-500',
      bgLight: 'bg-emerald-500/10', shadow: 'shadow-emerald-500/20'
    },
    rose: {
      name: 'Rose', bg: 'bg-rose-600', text: 'text-rose-500', border: 'border-rose-500',
      bgLight: 'bg-rose-500/10', shadow: 'shadow-rose-500/20'
    },
    amber: {
      name: 'Amber', bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500',
      bgLight: 'bg-amber-500/10', shadow: 'shadow-amber-500/20'
    },
    violet: {
      name: 'Violet', bg: 'bg-violet-600', text: 'text-violet-500', border: 'border-violet-500',
      bgLight: 'bg-violet-500/10', shadow: 'shadow-violet-500/20'
    },
  };

  const theme = themeClasses[accentColor];
  const activeBg = darkMode ? bgThemes[bgType] : bgThemes.light;

  return (
    <ThemeContext.Provider value={{ 
      darkMode, setDarkMode, 
      accentColor, setAccentColor, 
      bgType, setBgType,
      theme, 
      activeBg // Use this for card backgrounds and borders
    }}>
      {children}
    </ThemeContext.Provider>
  );
};