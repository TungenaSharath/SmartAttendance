import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { subjectsAPI, analyticsAPI } from '../../api';

export default function TeacherAnalytics() {
    const [subjects, setSubjects] = useState([]);
    const [selSubject, setSelSubject] = useState('');
    const [stats, setStats] = useState(null);

    useEffect(() => {
        subjectsAPI.list().then(r => {
            setSubjects(r.data);
            if (r.data.length > 0) setSelSubject(r.data[0].id);
        }).catch(() => { });
    }, []);

    useEffect(() => {
        if (selSubject) {
            analyticsAPI.subjectAnalytics(selSubject).then(r => setStats(r.data)).catch(() => { });
        }
    }, [selSubject]);

    const sessionData = stats?.sessions?.map(s => ({
        name: s.session_name?.substring(0, 15),
        present: s.present || 0,
        absent: s.absent || 0,
        rate: s.attendance_rate || 0,
    })) || [];

    const confDist = stats?.confidence_distribution || {};
    const confData = Object.entries(confDist).map(([range, count]) => ({
        range, count: count || 0,
    }));

    return (
        <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>Analytics</Typography>

            <FormControl sx={{ mb: 3, minWidth: 250 }}>
                <InputLabel>Subject</InputLabel>
                <Select value={selSubject} label="Subject"
                    onChange={e => setSelSubject(e.target.value)}>
                    {subjects.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </Select>
            </FormControl>

            {stats && (
                <>
                    {/* Session Attendance Chart */}
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #eee', mb: 3 }}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                            Session-wise Attendance
                        </Typography>
                        {sessionData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={sessionData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="name" fontSize={12} />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="present" fill="#4caf50" name="Present" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="absent" fill="#f44336" name="Absent" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                                No session data
                            </Typography>
                        )}
                    </Paper>

                    {/* Confidence Distribution */}
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #eee' }}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                            Confidence Distribution
                        </Typography>
                        {confData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={confData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="range" fontSize={12} />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#2196f3" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                                No confidence data
                            </Typography>
                        )}
                    </Paper>
                </>
            )}
        </Box>
    );
}
