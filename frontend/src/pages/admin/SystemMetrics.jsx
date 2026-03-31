import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';
import { People, School, EventNote, BarChart } from '@mui/icons-material';
import StatsCard from '../../components/StatsCard';
import { adminAPI } from '../../api';

export default function SystemMetrics() {
    const [data, setData] = useState(null);

    useEffect(() => {
        adminAPI.systemMetrics().then(r => setData(r.data)).catch(() => { });
    }, []);

    return (
        <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>System Metrics</Typography>

            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="Total Users" value={data?.total_teachers || 0}
                        icon={<People />} color="#2196f3" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="Students" value={data?.total_students || 0}
                        icon={<School />} color="#4caf50" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="Sessions" value={data?.total_sessions || 0}
                        icon={<EventNote />} color="#9c27b0" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="Records" value={data?.total_records || 0}
                        icon={<BarChart />} color="#ff9800" />
                </Grid>
            </Grid>

            {/* Recent Activity */}
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #eee', overflow: 'hidden' }}>
                <Box sx={{ p: 2 }}>
                    <Typography variant="h6" fontWeight={600}>Recent Activity (Audit Log)</Typography>
                </Box>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell>User</TableCell>
                            <TableCell>Action</TableCell>
                            <TableCell>Target</TableCell>
                            <TableCell>Details</TableCell>
                            <TableCell>Time</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(data?.recent_activity || []).slice(0, 20).map((a) => (
                            <TableRow key={a.id} hover>
                                <TableCell>{a.user_name || 'System'}</TableCell>
                                <TableCell>
                                    <Chip label={a.action} size="small" variant="outlined" />
                                </TableCell>
                                <TableCell>{a.target_type ? `${a.target_type}#${a.target_id}` : '—'}</TableCell>
                                <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {a.details || '—'}
                                </TableCell>
                                <TableCell>{new Date(a.created_at).toLocaleString()}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
        </Box>
    );
}
