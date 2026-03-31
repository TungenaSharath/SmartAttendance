import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Paper } from '@mui/material';
import { hodAPI } from '../../api';

export default function HodTrends() {
    const [trends, setTrends] = useState([]);

    useEffect(() => {
        hodAPI.trends(12).then(r => setTrends(r.data)).catch(() => { });
    }, []);

    return (
        <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>Attendance Trends</Typography>

            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #eee' }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>12-Month Trend</Typography>
                {trends.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={trends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="month" fontSize={12} />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Line type="monotone" dataKey="attendance_pct" stroke="#667eea"
                                strokeWidth={3} dot={{ r: 5, fill: '#667eea' }} name="Attendance %" />
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
