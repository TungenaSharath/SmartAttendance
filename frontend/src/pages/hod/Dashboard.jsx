import { useState, useEffect } from 'react';
import { Grid, Typography, Box, Paper, Chip } from '@mui/material';
import { People, School, EventNote, TrendingUp } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatsCard from '../../components/StatsCard';
import { hodAPI } from '../../api';

export default function HodDashboard() {
    const [data, setData] = useState(null);
    const [trends, setTrends] = useState([]);

    useEffect(() => {
        hodAPI.dashboard().then(r => setData(r.data)).catch(() => { });
        hodAPI.trends(6).then(r => setTrends(r.data)).catch(() => { });
    }, []);

    return (
        <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>Department Dashboard</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {data?.department?.name ? `${data.department.name} Department` : 'Overview'}
            </Typography>

            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="Students" value={data?.total_students || 0}
                        icon={<School />} color="#2196f3" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="Teachers" value={data?.total_teachers || 0}
                        icon={<People />} color="#9c27b0" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="Sessions" value={data?.total_sessions || 0}
                        icon={<EventNote />} color="#ff9800" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="Today's Rate"
                        value={`${data?.today_attendance_rate || 0}%`}
                        icon={<TrendingUp />} color="#4caf50" />
                </Grid>
            </Grid>

            {/* Trends Chart */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #eee' }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>Monthly Trends</Typography>
                {trends.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={trends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="month" fontSize={12} />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Line type="monotone" dataKey="attendance_pct" stroke="#4caf50"
                                strokeWidth={2} dot={{ r: 4 }} name="Attendance %" />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                        No trend data available
                    </Typography>
                )}
            </Paper>
        </Box>
    );
}
