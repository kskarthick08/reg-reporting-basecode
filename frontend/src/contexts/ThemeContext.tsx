import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  actualTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  // Load theme from localStorage immediately to avoid flash
  const [mode, setMode] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem('theme') as ThemeMode;
    return savedTheme || 'light';
  });
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    // Detect system theme on initial load
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Detect system theme preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Save theme preference to localStorage
  const handleSetMode = (newMode: ThemeMode) => {
    setMode(newMode);
    localStorage.setItem('theme', newMode);
  };

  // Determine actual theme to use
  const actualTheme: 'light' | 'dark' = mode === 'auto' ? systemTheme : mode;

  // Create Material-UI theme
  const muiTheme = createTheme({
    palette: {
      mode: actualTheme,
      ...(actualTheme === 'light'
        ? {
            // Light theme colors
            primary: {
              main: '#2563eb',
              light: '#3b82f6',
              dark: '#1e40af',
            },
            secondary: {
              main: '#8b5cf6',
              light: '#a78bfa',
              dark: '#7c3aed',
            },
            background: {
              default: '#f8f9fa',
              paper: '#ffffff',
            },
            text: {
              primary: '#0f172a',
              secondary: '#64748b',
            },
          }
        : {
            // Dark theme colors
            primary: {
              main: '#3b82f6',
              light: '#60a5fa',
              dark: '#2563eb',
            },
            secondary: {
              main: '#a78bfa',
              light: '#c4b5fd',
              dark: '#8b5cf6',
            },
            background: {
              default: '#0f172a',
              paper: '#1e293b',
            },
            text: {
              primary: '#f1f5f9',
              secondary: '#cbd5e1',
            },
          }),
    },
    typography: {
      fontFamily: '"Inter", "Segoe UI", "Roboto", "Arial", sans-serif',
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarWidth: 'thin',
            scrollbarColor: actualTheme === 'dark' ? '#475569 #1e293b' : '#cbd5e1 #f1f5f9',
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: actualTheme === 'dark' ? '#1e293b' : '#f1f5f9',
            },
            '&::-webkit-scrollbar-thumb': {
              background: actualTheme === 'dark' ? '#475569' : '#cbd5e1',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: actualTheme === 'dark' ? '#64748b' : '#94a3b8',
            },
          },
        },
      },
    },
  });

  return (
    <ThemeContext.Provider value={{ mode, setMode: handleSetMode, actualTheme }}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
