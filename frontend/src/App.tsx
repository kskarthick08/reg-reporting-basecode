import { useEffect } from 'react';
import { AppRoutes } from '@/routes';
import { Toaster } from '@/components/ui/toaster';
import { useAuthStore } from '@/store/authStore';
import { ThemeProvider } from '@/contexts/ThemeContext';
import websocketService from '@/services/websocketService';
import './App.css';
import './components/css/GlobalResponsive.css';
import './components/css/ButtonFixes.css';
import './components/css/ToggleSwitchFixes.css';

function App() {
  const token = useAuthStore((state) => state.token);

  // Initialize WebSocket connection when user is authenticated
  useEffect(() => {
    if (token) {
      console.log('Initializing WebSocket connection...');
      websocketService.connect(token);

      // Cleanup on unmount or when token changes
      return () => {
        console.log('Closing WebSocket connection...');
        websocketService.disconnect();
      };
    }
  }, [token]);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground" style={{ width: '100%', maxWidth: '100vw', overflow: 'hidden' }}>
        <Toaster />
        <AppRoutes />
      </div>
    </ThemeProvider>
  );
}

export default App;
