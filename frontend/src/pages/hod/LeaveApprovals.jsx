import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
    Chip, Button, Alert
} from '@mui/material';
import { Check, Close } from '@mui/icons-material';
import { leaveAPI } from '../../api';

export default function LeaveApprovals() {
    const [pending, setPending] = useState([]);
    const [all, setAll] = useState([]);
    const [msg, setMsg] = useState('');

    const load = () => {
        leaveAPI.pending().then(r => setPending(r.data)).catch(() => { });
        leaveAPI.all().then(r => setAll(r.data)).catch(() => { });
    };

    useEffect(load, []);

    const handleReview = async (id, status) => {
        try {
            await leaveAPI.review(id, status);
            setMsg(`Leave ${status.toLowerCase()}`);
            load();
        } catch (e) {
            setMsg(e.response?.data?.detail || 'Error');
        }
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>Leave Approvals</Typography>

            {msg && <Alert severity="info" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

            {/* Pending */}
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #eee', mb: 3, overflow: 'hidden' }}>
                <Box sx={{ p: 2, bgcolor: '#fff3e0' }}>
                    <Typography variant="h6" fontWeight={600}>
                        Pending Requests ({pending.length})
                    </Typography>
                </Box>
                {pending.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography color="text.secondary">No pending requests</Typography>
                    </Box>
                ) : (
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Teacher</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>From</TableCell>
                                <TableCell>To</TableCell>
                                <TableCell>Reason</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {pending.map((l) => (
                                <TableRow key={l.id} hover>
                                    <TableCell>{l.teacher_name}</TableCell>
                                    <TableCell><Chip label={l.leave_type} size="small" /></TableCell>
                                    <TableCell>{l.start_date}</TableCell>
                                    <TableCell>{l.end_date}</TableCell>
                                    <TableCell>{l.reason || '—'}</TableCell>
                                    <TableCell align="right">
                                        <Button size="small" color="success" startIcon={<Check />}
                                            onClick={() => handleReview(l.id, 'APPROVED')} sx={{ mr: 1 }}>
                                            Approve
                                        </Button>
                                        <Button size="small" color="error" startIcon={<Close />}
                                            onClick={() => handleReview(l.id, 'REJECTED')}>
                                            Reject
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Paper>

            {/* All Requests */}
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #eee', overflow: 'hidden' }}>
                <Box sx={{ p: 2 }}>
                    <Typography variant="h6" fontWeight={600}>All Leave Requests</Typography>
                </Box>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell>Teacher</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Period</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Reviewer</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {all.map((l) => (
                            <TableRow key={l.id} hover>
                                <TableCell>{l.teacher_name}</TableCell>
                                <TableCell>{l.leave_type}</TableCell>
                                <TableCell>{l.start_date} → {l.end_date}</TableCell>
                                <TableCell>
                                    <Chip label={l.status} size="small"
                                        color={l.status === 'APPROVED' ? 'success' : l.status === 'REJECTED' ? 'error' : 'warning'} />
                                </TableCell>
                                <TableCell>{l.reviewer_name || '—'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
        </Box>
    );
}
