import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
    Box, Drawer, AppBar, Toolbar, Typography, IconButton, List, ListItem,
    ListItemButton, ListItemIcon, ListItemText, Avatar, Chip, useMediaQuery, useTheme, Divider
} from '@mui/material';
import {
    Menu as MenuIcon, Dashboard, People, EventNote, Assignment,
    BarChart, Business, AdminPanelSettings, Logout,
    FaceRetouchingNatural, HowToReg, CalendarMonth, Group, Settings as SettingsIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const DRAWER_WIDTH = 270;

const NAV_ITEMS = {
    TEACHER: [
        { label: 'Dashboard', icon: <Dashboard />, path: '/teacher' },
        { label: 'Mark Attendance', icon: <FaceRetouchingNatural />, path: '/teacher/attendance' },
        { label: 'Manage Students', icon: <Group />, path: '/teacher/students' },
        { label: 'Staff Check-in', icon: <HowToReg />, path: '/teacher/staff-attendance' },
        { label: 'Apply Leave', icon: <CalendarMonth />, path: '/teacher/leave' },
        { label: 'Leave History', icon: <EventNote />, path: '/teacher/leave-history' },
        { label: 'Analytics', icon: <BarChart />, path: '/teacher/analytics' },
    ],
    HOD: [
        { label: 'Dashboard', icon: <Dashboard />, path: '/hod' },
        { label: 'Leave Approvals', icon: <Assignment />, path: '/hod/leaves' },
        { label: 'Staff Monitor', icon: <Group />, path: '/hod/staff' },
        { label: 'Defaulters', icon: <People />, path: '/hod/defaulters' },
        { label: 'Trends', icon: <BarChart />, path: '/hod/trends' },
    ],
    ADMIN: [
        { label: 'Dashboard', icon: <Dashboard />, path: '/admin' },
        { label: 'Departments', icon: <Business />, path: '/admin/departments' },
        { label: 'Teachers', icon: <People />, path: '/admin/teachers' },
        { label: 'Reports', icon: <BarChart />, path: '/admin/reports' },
        { label: 'System Metrics', icon: <AdminPanelSettings />, path: '/admin/metrics' },
        { label: 'Settings', icon: <SettingsIcon />, path: '/admin/settings' },
    ],
};

const ROLE_COLORS = {
    ADMIN: '#f43f5e',
    HOD: '#f59e0b',
    TEACHER: '#10b981',
};

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);

    const role = user?.role || 'TEACHER';
    const items = NAV_ITEMS[role] || NAV_ITEMS.TEACHER;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const drawerContent = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#0b0f19' }}>
            {/* Header / Brand Logo */}
            <Box sx={{
                p: 3,
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                        width: 38, height: 38, borderRadius: 2.5,
                        background: 'linear-gradient(135deg, #38bdf8 0%, #a855f7 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)'
                    }}>
                        📸
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight={800} sx={{
                            letterSpacing: '-0.5px',
                            background: 'linear-gradient(135deg, #38bdf8 0%, #a855f7 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>
                            SmartAttendance
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, fontWeight: 500 }}>
                            AI Vision Platform v2.0
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* User Profile Card */}
            <Box sx={{ p: 2, m: 1.5, borderRadius: 3, bgcolor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{
                        bgcolor: ROLE_COLORS[role],
                        width: 38, height: 38,
                        fontSize: 15, fontWeight: 700,
                        boxShadow: `0 0 10px ${ROLE_COLORS[role]}80`
                    }}>
                        {user?.name?.[0]?.toUpperCase() || '?'}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} noWrap color="text.primary">
                            {user?.name}
                        </Typography>
                        <Chip
                            label={role}
                            size="small"
                            sx={{
                                height: 20, fontSize: 10, fontWeight: 700,
                                bgcolor: `${ROLE_COLORS[role]}20`,
                                color: ROLE_COLORS[role],
                                border: `1px solid ${ROLE_COLORS[role]}50`
                            }}
                        />
                    </Box>
                </Box>
            </Box>

            {/* Navigation List */}
            <List sx={{ flex: 1, px: 1.5, py: 1 }}>
                {items.map((item) => {
                    const isSelected = location.pathname === item.path;
                    return (
                        <ListItem key={item.path} disablePadding sx={{ mb: 1 }}>
                            <ListItemButton
                                selected={isSelected}
                                onClick={() => { navigate(item.path); isMobile && setMobileOpen(false); }}
                                sx={{
                                    borderRadius: 2.5,
                                    py: 1.2,
                                    px: 2,
                                    transition: 'all 0.2s ease',
                                    '&.Mui-selected': {
                                        background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
                                        color: '#38bdf8',
                                        border: '1px solid rgba(56, 189, 248, 0.4)',
                                        '& .MuiListItemIcon-root': { color: '#38bdf8' },
                                        '&:hover': {
                                            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.3) 0%, rgba(168, 85, 247, 0.3) 100%)',
                                        },
                                    },
                                    '&:hover': {
                                        bgcolor: 'rgba(255, 255, 255, 0.04)',
                                    }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 38, color: isSelected ? '#38bdf8' : '#94a3b8' }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.label}
                                    primaryTypographyProps={{ fontSize: 14, fontWeight: isSelected ? 700 : 500 }}
                                />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>

            {/* Logout */}
            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.06)' }} />
            <Box sx={{ p: 1.5 }}>
                <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2.5, color: '#f43f5e', '&:hover': { bgcolor: 'rgba(244, 63, 94, 0.1)' } }}>
                    <ListItemIcon sx={{ minWidth: 38, color: '#f43f5e' }}><Logout /></ListItemIcon>
                    <ListItemText primary="Sign Out" primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }} />
                </ListItemButton>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#090d16' }}>
            {/* Sidebar */}
            {isMobile ? (
                <Drawer
                    variant="temporary" open={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 'none', bgcolor: '#0b0f19' } }}
                >
                    {drawerContent}
                </Drawer>
            ) : (
                <Drawer
                    variant="permanent"
                    sx={{
                        width: DRAWER_WIDTH, flexShrink: 0,
                        '& .MuiDrawer-paper': {
                            width: DRAWER_WIDTH, borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                            bgcolor: '#0b0f19',
                        },
                    }}
                >
                    {drawerContent}
                </Drawer>
            )}

            {/* Main Content Area */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {isMobile && (
                    <AppBar position="sticky" elevation={0}
                        sx={{ bgcolor: 'rgba(11, 15, 25, 0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <Toolbar>
                            <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ color: '#38bdf8' }}>
                                <MenuIcon />
                            </IconButton>
                            <Typography variant="h6" fontWeight={700} sx={{ flex: 1, color: '#f8fafc' }}>
                                SmartAttendance
                            </Typography>
                            <Chip label={role} size="small"
                                sx={{ bgcolor: ROLE_COLORS[role], color: 'white', fontWeight: 700 }} />
                        </Toolbar>
                    </AppBar>
                )}
                <Box sx={{ flex: 1, p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto', width: '100%' }}>
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
}
