import { useState, useEffect } from 'react';
import { Grid, Typography, Box, Paper, Button, Chip } from '@mui/material';
import { Business, People, School, BarChart, EventNote, Warning, TrendingUp } from '@mui/icons-material';
import { BarChart as ReBarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import StatsCard from '../../components/StatsCard';
import { adminAPI, analyticsAPI } from '../../api';

export default function AdminDashboard() {
    const [data, setData] = useState(null);
    const [depts, setDepts] = useState([]);
    const [trends, setTrends] = useState([]);

    useEffect(() => {
        adminAPI.dashboard().then(r => setData(r.data)).catch(() => { });
        adminAPI.departments().then(r => setDepts(r.data)).catch(() => { });
        analyticsAPI.dailyTrends(14).then(r => setTrends(r.data)).catch(() => {});
    }, []);

    const chartData = depts.map(d => ({
        name: d.code || d.name?.substring(0, 10),
        students: d.total_students || 0,
        teachers: d.total_teachers || 0,
        rate: d.today_attendance_rate || 0,
    }));

    return (
        <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>Admin Dashboard</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Institution-wide overview
            </Typography>

            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="Departments" value={data?.total_departments || 0}
                        icon={<Business />} color="#2196f3" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="Teachers" value={data?.total_teachers || 0}
                        icon={<People />} color="#9c27b0" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="Students" value={data?.total_students || 0}
                        icon={<School />} color="#4caf50" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="Attendance Rate"
                        value={`${data?.overall_attendance_rate || 0}%`}
                        icon={<BarChart />} color="#ff9800" />
                </Grid>
            </Grid>

            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={4}>
                    <StatsCard title="Total Sessions" value={data?.total_sessions || 0}
                        icon={<EventNote />} color="#00bcd4" />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatsCard title="Leave Requests" value={data?.total_leave_requests || 0}
                        icon={<People />} color="#795548" />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatsCard title="Pending Leaves" value={data?.pending_leaves || 0}
                        icon={<Warning />} color="#f44336" />
                </Grid>
            </Grid>

            {/* Department Comparison */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #eee' }}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>Department Comparison</Typography>
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <ReBarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="name" fontSize={12} />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="students" fill="#4caf50" name="Students" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="teachers" fill="#2196f3" name="Teachers" radius={[4, 4, 0, 0]} />
                                </ReBarChart>
                            </ResponsiveContainer>
                        ) : (
                            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                                No department data. Create departments to see comparisons.
                            </Typography>
                        )}
                    </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #eee' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <TrendingUp sx={{ mr: 1, color: 'primary.main' }} />
                            <Typography variant="h6" fontWeight={600}>System Daily Trend</Typography>
                        </Box>
                        {trends.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={trends}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="day" fontSize={12} />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="attendance_pct" stroke="#2196f3" strokeWidth={3} name="Attendance %" activeDot={{ r: 8 }} />
                                    <Line type="monotone" dataKey="present" stroke="#4caf50" strokeWidth={2} name="Present" />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                                No trend data available for the last 14 days.
                            </Typography>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
