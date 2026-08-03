import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';

import TeacherDashboard from './pages/teacher/Dashboard';
import MarkAttendance from './pages/teacher/MarkAttendance';
import StaffAttendance from './pages/teacher/StaffAttendance';
import LeaveApply from './pages/teacher/LeaveApply';
import LeaveHistory from './pages/teacher/LeaveHistory';
import TeacherAnalytics from './pages/teacher/Analytics';
import Students from './pages/teacher/Students';

// HOD pages
import HodDashboard from './pages/hod/Dashboard';
import LeaveApprovals from './pages/hod/LeaveApprovals';
import StaffMonitor from './pages/hod/StaffMonitor';
import Defaulters from './pages/hod/Defaulters';
import HodTrends from './pages/hod/Trends';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import Departments from './pages/admin/Departments';
import Teachers from './pages/admin/Teachers';
import Reports from './pages/admin/Reports';
import SystemMetrics from './pages/admin/SystemMetrics';
import Settings from './pages/admin/Settings';

// 🍎 Apple-Inspired Clean Theme
const appleTheme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#f5f5f7', // Signature Apple Light Gray Background
      paper: '#ffffff',
    },
    primary: {
      main: '#0071e3', // Apple System Blue
      light: '#479ffa',
      dark: '#0058b0',
    },
    secondary: {
      main: '#6e6e73', // Apple Neutral Gray
      dark: '#1d1d1f',
    },
    success: {
      main: '#34c759', // Apple System Green
    },
    error: {
      main: '#ff3b30', // Apple System Red
    },
    warning: {
      main: '#ff9500', // Apple System Orange
    },
    text: {
      primary: '#1d1d1f', // Apple Dark Charcoal Heading Text
      secondary: '#86868b', // Apple Muted Body Text
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.022em' },
    h5: { fontWeight: 700, letterSpacing: '-0.019em' },
    h6: { fontWeight: 600, letterSpacing: '-0.015em' },
    subtitle1: { letterSpacing: '-0.011em' },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '-0.01em' },
  },
  shape: { borderRadius: 18 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 980, // Apple Pill Shape Button
          padding: '10px 22px',
          boxShadow: 'none',
          transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
          '&:hover': {
            transform: 'scale(1.02)',
            boxShadow: '0 4px 15px rgba(0, 113, 227, 0.2)',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 20,
          border: '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
        },
      },
    },
  },
});

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const home = user.role === 'ADMIN' ? '/admin' : user.role === 'HOD' ? '/hod' : '/teacher';
    return <Navigate to={home} />;
  }
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={
        user.role === 'ADMIN' ? '/admin' : user.role === 'HOD' ? '/hod' : '/teacher'
      } /> : <Login />} />

      {/* Teacher Routes */}
      <Route path="/teacher" element={
        <ProtectedRoute allowedRoles={['TEACHER', 'HOD', 'ADMIN']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<TeacherDashboard />} />
        <Route path="attendance" element={<MarkAttendance />} />
        <Route path="students" element={<Students />} />
        <Route path="staff-attendance" element={<StaffAttendance />} />
        <Route path="leave" element={<LeaveApply />} />
        <Route path="leave-history" element={<LeaveHistory />} />
        <Route path="analytics" element={<TeacherAnalytics />} />
      </Route>

      {/* HOD Routes */}
      <Route path="/hod" element={
        <ProtectedRoute allowedRoles={['HOD', 'ADMIN']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<HodDashboard />} />
        <Route path="leaves" element={<LeaveApprovals />} />
        <Route path="staff" element={<StaffMonitor />} />
        <Route path="defaulters" element={<Defaulters />} />
        <Route path="trends" element={<HodTrends />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="departments" element={<Departments />} />
        <Route path="teachers" element={<Teachers />} />
        <Route path="reports" element={<Reports />} />
        <Route path="metrics" element={<SystemMetrics />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

import { useState } from 'react';
import SplashLoader from './components/SplashLoader';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <ThemeProvider theme={appleTheme}>
      <CssBaseline />
      {showSplash && <SplashLoader onComplete={() => setShowSplash(false)} />}
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
