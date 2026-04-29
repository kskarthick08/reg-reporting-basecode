import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Switch, FormControlLabel, Button, Alert, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Settings, Save, Notifications, Palette, Language } from '@mui/icons-material';
import axios from '@/utils/axios';
import { useTheme } from '@/contexts/ThemeContext';

interface UserSettings {
  email_notifications: boolean;
  theme: string;
  language: string;
  timezone: string;
}

export const SettingsPage = () => {
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [settings, setSettings] = useState<UserSettings>({
    email_notifications: true,
    theme: themeMode,
    language: 'en',
    timezone: 'UTC',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/auth/settings');
      const fetchedSettings = response.data;
      setSettings(fetchedSettings);

      // Apply the theme from server
      if (fetchedSettings.theme) {
        setThemeMode(fetchedSettings.theme as 'light' | 'dark' | 'auto');
      }
    } catch (err: any) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const handleChange = (field: keyof UserSettings) => (
    event: React.ChangeEvent<HTMLInputElement> | any
  ) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setSettings(prev => ({ ...prev, [field]: value }));

    // If theme is changed, apply it immediately
    if (field === 'theme') {
      setThemeMode(value as 'light' | 'dark' | 'auto');
    }

    setError('');
    setSuccess(false);
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await axios.put('/auth/settings', settings);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Settings sx={{ fontSize: 40, color: '#2563eb' }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a' }}>
            Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your preferences and account settings
          </Typography>
        </Box>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(false)}>
          Settings updated successfully!
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Notifications sx={{ color: '#2563eb' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Notifications
          </Typography>
        </Box>
        
        <FormControlLabel
          control={
            <Switch
              checked={settings.email_notifications}
              onChange={handleChange('email_notifications')}
              color="primary"
            />
          }
          label="Email Notifications"
        />
        <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 1 }}>
          Receive email notifications about workflow updates and system alerts
        </Typography>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Palette sx={{ color: '#2563eb' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Appearance
          </Typography>
        </Box>
        
        <FormControl fullWidth>
          <InputLabel>Theme</InputLabel>
          <Select
            value={settings.theme}
            label="Theme"
            onChange={handleChange('theme')}
          >
            <MenuItem value="light">Light</MenuItem>
            <MenuItem value="dark">Dark</MenuItem>
            <MenuItem value="auto">Auto (System)</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Choose your preferred color scheme
        </Typography>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Language sx={{ color: '#2563eb' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Language & Region
          </Typography>
        </Box>
        
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Language</InputLabel>
          <Select
            value={settings.language}
            label="Language"
            onChange={handleChange('language')}
          >
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="es">Spanish</MenuItem>
            <MenuItem value="fr">French</MenuItem>
            <MenuItem value="de">German</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Timezone</InputLabel>
          <Select
            value={settings.timezone}
            label="Timezone"
            onChange={handleChange('timezone')}
          >
            <MenuItem value="UTC">UTC</MenuItem>
            <MenuItem value="America/New_York">Eastern Time (ET)</MenuItem>
            <MenuItem value="America/Chicago">Central Time (CT)</MenuItem>
            <MenuItem value="America/Denver">Mountain Time (MT)</MenuItem>
            <MenuItem value="America/Los_Angeles">Pacific Time (PT)</MenuItem>
            <MenuItem value="Europe/London">London (GMT)</MenuItem>
            <MenuItem value="Europe/Paris">Paris (CET)</MenuItem>
            <MenuItem value="Asia/Tokyo">Tokyo (JST)</MenuItem>
            <MenuItem value="Asia/Kolkata">India (IST)</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSave}
          disabled={loading}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
            },
          }}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>
    </Box>
  );
};
