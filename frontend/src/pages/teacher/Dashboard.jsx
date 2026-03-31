import { useState, useEffect } from 'react';
import { Grid, Typography, Box, Paper, Chip } from '@mui/material';
import { People, EventNote, BarChart, Book } from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import StatsCard from '../../components/StatsCard';
import { subjectsAPI, analyticsAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';

const COLORS = ['#4caf50', '#f44336', '#ff9800', '#2196f3'];

export default function TeacherDashboard() {
    const { user } = useAuth();
    const [subjects, setSubjects] = useState([]);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        subjectsAPI.list().then(r => setSubjects(r.data)).catch(() => { });
    }, []);

    useEffect(() => {
        if (subjects.length > 0) {
            analyticsAPI.subjectAnalytics(subjects[0].id).then(r => setStats(r.data)).catch(() => { });
        }
    }, [subjects]);

    const pieData = stats ? [
        { name: 'Present', value: stats.total_present || 0 },
        { name: 'Absent', value: (stats.total_records - stats.total_present) || 0 },
    ] : [];

    return (
        <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>
                Welcome, {user?.name} 👋
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Here's an overview of your classes and attendance data
            </Typography>

            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="Subjects" value={subjects.length} icon={<Book />} color="#2196f3" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="Total Sessions" value={stats?.total_sessions || 0}
                        icon={<EventNote />} color="#9c27b0" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="Recognition Rate"
                        value={`${stats?.recognition_rate || 0}%`}
                        icon={<BarChart />} color="#4caf50" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="Avg Confidence"
                        value={`${((stats?.avg_confidence || 0) * 100).toFixed(1)}%`}
                        icon={<People />} color="#ff9800" />
                </Grid>
            </Grid>

            <Grid container spacing={2.5}>
                {/* Attendance Pie Chart */}
                <Grid item xs={12} md={5}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #eee' }}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                            Attendance Overview
                        </Typography>
                        {pieData.length > 0 && pieData.some(d => d.value > 0) ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                                        paddingAngle={5} dataKey="value">
                                        {pieData.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <Box sx={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Typography color="text.secondary">No attendance data yet</Typography>
                            </Box>
                        )}
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 1 }}>
                            <Chip label={`Present: ${stats?.total_present || 0}`} size="small"
                                sx={{ bgcolor: '#4caf5020', color: '#4caf50' }} />
                            <Chip label={`Auto: ${stats?.auto_marked || 0}`} size="small"
                                sx={{ bgcolor: '#2196f320', color: '#2196f3' }} />
                            <Chip label={`Manual: ${stats?.manual_marked || 0}`} size="small"
                                sx={{ bgcolor: '#ff980020', color: '#ff9800' }} />
                        </Box>
                    </Paper>
                </Grid>

                {/* Subjects List */}
                <Grid item xs={12} md={7}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #eee' }}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                            Your Subjects
                        </Typography>
                        {subjects.length === 0 ? (
                            <Typography color="text.secondary">No subjects yet. Create one to get started.</Typography>
                        ) : (
                            subjects.map((sub) => (
                                <Paper key={sub.id} variant="outlined"
                                    sx={{ p: 2, mb: 1.5, borderRadius: 2, '&:hover': { borderColor: 'primary.main' } }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Typography fontWeight={600}>{sub.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Created: {new Date(sub.created_at).toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                        <Chip label="Active" size="small" color="success" variant="outlined" />
                                    </Box>
                                </Paper>
                            ))
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
