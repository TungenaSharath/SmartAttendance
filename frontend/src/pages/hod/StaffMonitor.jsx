import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';
import { hodAPI } from '../../api';

export default function StaffMonitor() {
    const [staff, setStaff] = useState([]);
    const [attendance, setAttendance] = useState([]);

    useEffect(() => {
        hodAPI.staff().then(r => setStaff(r.data)).catch(() => { });
        hodAPI.staffAttendance().then(r => setAttendance(r.data)).catch(() => { });
    }, []);

    return (
        <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>Staff Monitor</Typography>

            {/* Today's Attendance */}
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #eee', mb: 3, overflow: 'hidden' }}>
                <Box sx={{ p: 2, bgcolor: '#e3f2fd' }}>
                    <Typography variant="h6" fontWeight={600}>Today's Attendance</Typography>
                </Box>
                {attendance.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography color="text.secondary">No attendance data for today</Typography>
                    </Box>
                ) : (
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Employee Code</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Check-in</TableCell>
                                <TableCell>Confidence</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {attendance.map((a) => (
                                <TableRow key={a.id} hover>
                                    <TableCell>{a.teacher_name}</TableCell>
                                    <TableCell>{a.employee_code}</TableCell>
                                    <TableCell>
                                        <Chip label={a.status} size="small"
                                            color={a.status === 'Present' ? 'success' : 'default'} />
                                    </TableCell>
                                    <TableCell>{a.check_in || '—'}</TableCell>
                                    <TableCell>{a.confidence ? `${(a.confidence * 100).toFixed(1)}%` : '—'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Paper>

            {/* Staff List */}
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #eee', overflow: 'hidden' }}>
                <Box sx={{ p: 2 }}>
                    <Typography variant="h6" fontWeight={600}>All Staff ({staff.length})</Typography>
                </Box>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell>Name</TableCell>
                            <TableCell>Employee Code</TableCell>
                            <TableCell>Designation</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {staff.map((s) => (
                            <TableRow key={s.id} hover>
                                <TableCell>{s.teacher_name}</TableCell>
                                <TableCell>{s.employee_code}</TableCell>
                                <TableCell>{s.designation || '—'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
        </Box>
    );
}
