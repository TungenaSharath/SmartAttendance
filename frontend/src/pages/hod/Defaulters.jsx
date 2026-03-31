import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
    Chip, Slider
} from '@mui/material';
import { hodAPI } from '../../api';

export default function Defaulters() {
    const [defaulters, setDefaulters] = useState([]);
    const [threshold, setThreshold] = useState(75);

    useEffect(() => {
        hodAPI.defaulters(threshold).then(r => setDefaulters(r.data)).catch(() => { });
    }, [threshold]);

    return (
        <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>Defaulters</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Students with attendance below threshold
            </Typography>

            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #eee', mb: 3 }}>
                <Typography gutterBottom>Attendance Threshold: <strong>{threshold}%</strong></Typography>
                <Slider value={threshold} onChange={(_, v) => setThreshold(v)}
                    min={50} max={100} step={5}
                    marks={[{ value: 50, label: '50%' }, { value: 75, label: '75%' }, { value: 100, label: '100%' }]}
                />
            </Paper>

            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #eee', overflow: 'hidden' }}>
                <Box sx={{ p: 2, bgcolor: '#fce4ec' }}>
                    <Typography variant="h6" fontWeight={600}>
                        Found {defaulters.length} defaulters
                    </Typography>
                </Box>
                {defaulters.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography color="text.secondary">No defaulters found</Typography>
                    </Box>
                ) : (
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Roll No</TableCell>
                                <TableCell>Subject</TableCell>
                                <TableCell>Sessions</TableCell>
                                <TableCell>Present</TableCell>
                                <TableCell>Attendance %</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {defaulters.map((d, i) => (
                                <TableRow key={i} hover>
                                    <TableCell>{d.name}</TableCell>
                                    <TableCell>{d.roll_number}</TableCell>
                                    <TableCell>{d.subject_name}</TableCell>
                                    <TableCell>{d.total_sessions}</TableCell>
                                    <TableCell>{d.present}</TableCell>
                                    <TableCell>
                                        <Chip label={`${d.attendance_pct}%`} size="small"
                                            color={d.attendance_pct < 50 ? 'error' : 'warning'} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Paper>
        </Box>
    );
}
