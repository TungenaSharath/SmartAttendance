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

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#090d16',
      paper: '#131b2e',
    },
    primary: {
      main: '#38bdf8',
      light: '#7dd3fc',
      dark: '#0284c7',
    },
    secondary: {
      main: '#a855f7',
      light: '#c084fc',
      dark: '#7e22ce',
    },
    success: {
      main: '#10b981',
    },
    error: {
      main: '#f43f5e',
    },
    warning: {
      main: '#f59e0b',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
    },
  },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:active': { transform: 'scale(0.97)' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(19, 27, 46, 0.75)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
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

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
