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

const DRAWER_WIDTH = 260;

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
    ADMIN: '#ff3b30',
    HOD: '#ff9500',
    TEACHER: '#34c759',
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
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#ffffff' }}>
            {/* Apple Clean Header Logo */}
            <Box sx={{
                p: 2.5, px: 3,
                borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            }}>
                <Typography variant="h6" fontWeight={700} color="#1d1d1f" sx={{ letterSpacing: '-0.025em', fontSize: 18 }}>
                    SmartAttendance
                </Typography>
            </Box>

            {/* User Profile */}
            <Box sx={{ p: 2, px: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{
                    bgcolor: '#0071e3', color: '#ffffff',
                    width: 36, height: 36, fontSize: 14, fontWeight: 700
                }}>
                    {user?.name?.[0]?.toUpperCase() || '?'}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} color="#1d1d1f" noWrap sx={{ fontSize: 13 }}>
                        {user?.name}
                    </Typography>
                    <Chip
                        label={role}
                        size="small"
                        sx={{
                            height: 18, fontSize: 9, fontWeight: 700,
                            bgcolor: `${ROLE_COLORS[role]}15`,
                            color: ROLE_COLORS[role],
                            border: `1px solid ${ROLE_COLORS[role]}30`
                        }}
                    />
                </Box>
            </Box>

            <Divider sx={{ borderColor: 'rgba(0, 0, 0, 0.06)' }} />

            {/* Navigation Items */}
            <List sx={{ flex: 1, px: 1.5, py: 1.5 }}>
                {items.map((item) => {
                    const isSelected = location.pathname === item.path;
                    return (
                        <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton
                                selected={isSelected}
                                onClick={() => { navigate(item.path); isMobile && setMobileOpen(false); }}
                                sx={{
                                    borderRadius: '12px',
                                    py: 1,
                                    px: 2,
                                    transition: 'all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1.0)',
                                    '&.Mui-selected': {
                                        bgcolor: '#0071e3',
                                        color: '#ffffff',
                                        boxShadow: '0 4px 12px rgba(0, 113, 227, 0.25)',
                                        '& .MuiListItemIcon-root': { color: '#ffffff' },
                                        '&:hover': { bgcolor: '#0077ed' },
                                    },
                                    '&:hover': {
                                        bgcolor: 'rgba(0, 0, 0, 0.03)',
                                    }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 36, color: isSelected ? '#ffffff' : '#6e6e73' }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.label}
                                    primaryTypographyProps={{
                                        fontSize: 13.5,
                                        fontWeight: isSelected ? 600 : 500,
                                        letterSpacing: '-0.01em'
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>

            {/* Sign Out */}
            <Divider sx={{ borderColor: 'rgba(0, 0, 0, 0.06)' }} />
            <Box sx={{ p: 1.5 }}>
                <ListItemButton onClick={handleLogout} sx={{ borderRadius: '12px', color: '#ff3b30', '&:hover': { bgcolor: 'rgba(255, 59, 48, 0.06)' } }}>
                    <ListItemIcon sx={{ minWidth: 36, color: '#ff3b30' }}><Logout /></ListItemIcon>
                    <ListItemText primary="Sign Out" primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }} />
                </ListItemButton>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f5f7' }}>
            {/* Sidebar */}
            {isMobile ? (
                <Drawer
                    variant="temporary" open={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 'none', bgcolor: '#ffffff' } }}
                >
                    {drawerContent}
                </Drawer>
            ) : (
                <Drawer
                    variant="permanent"
                    sx={{
                        width: DRAWER_WIDTH, flexShrink: 0,
                        '& .MuiDrawer-paper': {
                            width: DRAWER_WIDTH, borderRight: '1px solid rgba(0, 0, 0, 0.08)',
                            bgcolor: '#ffffff',
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
                        sx={{ bgcolor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'saturate(180%) blur(20px)', borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
                        <Toolbar>
                            <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ color: '#1d1d1f' }}>
                                <MenuIcon />
                            </IconButton>
                            <Typography variant="h6" fontWeight={700} sx={{ flex: 1, color: '#1d1d1f', letterSpacing: '-0.02em', fontSize: 17 }}>
                                SmartAttendance
                            </Typography>
                            <Chip label={role} size="small"
                                sx={{ bgcolor: `${ROLE_COLORS[role]}15`, color: ROLE_COLORS[role], fontWeight: 700 }} />
                        </Toolbar>
                    </AppBar>
                )}
                <Box sx={{ flex: 1, p: { xs: 2.5, md: 4 }, maxWidth: 1350, mx: 'auto', width: '100%' }}>
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
}
