import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

interface Theme {
  isDark: boolean;
  colors: {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    primary: string;
    error: string;
    success: string;
    header: string;
    headerText: string;
  };
  toggleTheme: () => void;
}

const lightTheme = {
  isDark: false,
  colors: {
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#333333',
    textSecondary: '#666666',
    border: '#e0e0e0',
    primary: '#007AFF',
    error: '#FF3B30',
    success: '#34C759',
    header: '#007AFF',
    headerText: '#ffffff',
  },
};

const darkTheme = {
  isDark: true,
  colors: {
    background: '#121212',
    surface: '#1e1e1e',
    text: '#ffffff',
    textSecondary: '#b0b0b0',
    border: '#333333',
    primary: '#0A84FF',
    error: '#FF453A',
    success: '#32D74B',
    header: '#1e1e1e',
    headerText: '#ffffff',
  },
};

const ThemeContext = createContext<Theme | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(() => {
    // Try to load from storage, fallback to system preference
    try {
      if (typeof window !== 'undefined' && (window as any).localStorage) {
        const saved = (window as any).localStorage.getItem('darkMode');
        if (saved !== null) {
          return saved === 'true';
        }
      }
    } catch (e) {
      // localStorage might not be available
    }
    return systemColorScheme === 'dark';
  });

  useEffect(() => {
    // Save preference to localStorage
    try {
      if (typeof window !== 'undefined' && (window as any).localStorage) {
        (window as any).localStorage.setItem('darkMode', String(isDark));
      }
    } catch (e) {
      // localStorage might not be available
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  const theme: Theme = {
    isDark,
    colors: isDark ? darkTheme.colors : lightTheme.colors,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
