import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
    Box, Drawer, AppBar, Toolbar, Typography, IconButton, List, ListItem,
    ListItemButton, ListItemIcon, ListItemText, Avatar, Menu, MenuItem,
    Divider, Chip, useMediaQuery, useTheme
} from '@mui/material';
import {
    Menu as MenuIcon, Dashboard, People, EventNote, Assignment,
    BarChart, Business, AdminPanelSettings, Logout, Person,
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
    ADMIN: '#f44336',
    HOD: '#ff9800',
    TEACHER: '#4caf50',
};

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);

    const role = user?.role || 'TEACHER';
    const items = NAV_ITEMS[role] || NAV_ITEMS.TEACHER;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const drawerContent = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box sx={{
                p: 2.5, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                color: 'white',
            }}>
                <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.5px' }}>
                    📸 SmartAttendance
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    AI Face Recognition Platform
                </Typography>
            </Box>

            {/* User Info */}
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ bgcolor: ROLE_COLORS[role], width: 36, height: 36, fontSize: 14 }}>
                    {user?.name?.[0]?.toUpperCase() || '?'}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{user?.name}</Typography>
                    <Chip label={role} size="small"
                        sx={{ height: 20, fontSize: 10, bgcolor: ROLE_COLORS[role], color: 'white' }} />
                </Box>
            </Box>

            <Divider />

            {/* Navigation */}
            <List sx={{ flex: 1, px: 1 }}>
                {items.map((item) => (
                    <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                        <ListItemButton
                            selected={location.pathname === item.path}
                            onClick={() => { navigate(item.path); isMobile && setMobileOpen(false); }}
                            sx={{
                                borderRadius: 2,
                                '&.Mui-selected': {
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    '& .MuiListItemIcon-root': { color: 'white' },
                                    '&:hover': { bgcolor: 'primary.dark' },
                                },
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14 }} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>

            {/* Logout */}
            <Divider />
            <List sx={{ px: 1 }}>
                <ListItem disablePadding>
                    <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2 }}>
                        <ListItemIcon sx={{ minWidth: 40 }}><Logout /></ListItemIcon>
                        <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: 14 }} />
                    </ListItemButton>
                </ListItem>
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
            {/* Sidebar */}
            {isMobile ? (
                <Drawer
                    variant="temporary" open={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
                >
                    {drawerContent}
                </Drawer>
            ) : (
                <Drawer
                    variant="permanent"
                    sx={{
                        width: DRAWER_WIDTH, flexShrink: 0,
                        '& .MuiDrawer-paper': {
                            width: DRAWER_WIDTH, borderRight: 'none',
                            boxShadow: '2px 0 8px rgba(0,0,0,0.05)',
                        },
                    }}
                >
                    {drawerContent}
                </Drawer>
            )}

            {/* Main Content */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {isMobile && (
                    <AppBar position="sticky" elevation={0}
                        sx={{ bgcolor: 'white', color: 'text.primary', borderBottom: '1px solid #eee' }}>
                        <Toolbar>
                            <IconButton edge="start" onClick={() => setMobileOpen(true)}>
                                <MenuIcon />
                            </IconButton>
                            <Typography variant="h6" sx={{ flex: 1 }}>SmartAttendance</Typography>
                            <Chip label={role} size="small"
                                sx={{ bgcolor: ROLE_COLORS[role], color: 'white' }} />
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
