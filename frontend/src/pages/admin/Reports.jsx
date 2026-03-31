import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Button, Alert } from '@mui/material';
import { Download } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { analyticsAPI, adminAPI } from '../../api';

export default function Reports() {
    const [trends, setTrends] = useState([]);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        analyticsAPI.monthlyTrends(12).then(r => setTrends(r.data)).catch(() => { });
    }, []);

    const handleExport = async () => {
        try {
            const res = await adminAPI.exportCSV();
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance_report_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            setMsg('Report downloaded');
        } catch (e) {
            setMsg('Export failed');
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" fontWeight={700}>Reports & Analytics</Typography>
                <Button variant="contained" startIcon={<Download />} onClick={handleExport}>
                    Export CSV
                </Button>
            </Box>

            {msg && <Alert severity="info" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #eee' }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                    Institution Attendance Trends (12 months)
                </Typography>
                {trends.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={trends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="month" fontSize={12} />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="attendance_pct" stroke="#667eea"
                                strokeWidth={3} name="Attendance %" dot={{ r: 5 }} />
                            <Line type="monotone" dataKey="total" stroke="#ff9800"
                                strokeWidth={2} name="Total Records" dot={{ r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                        No data available
                    </Typography>
                )}
            </Paper>
        </Box>
    );
}
