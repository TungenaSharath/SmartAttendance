import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
    TableBody, Chip
} from '@mui/material';
import { leaveAPI } from '../../api';

const STATUS_COLORS = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'error' };

export default function LeaveHistory() {
    const [leaves, setLeaves] = useState([]);

    useEffect(() => {
        leaveAPI.my().then(r => setLeaves(r.data)).catch(() => { });
    }, []);

    return (
        <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>Leave History</Typography>

            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #eee', overflow: 'hidden' }}>
                {leaves.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Typography color="text.secondary">No leave requests yet</Typography>
                    </Box>
                ) : (
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                <TableCell>Type</TableCell>
                                <TableCell>From</TableCell>
                                <TableCell>To</TableCell>
                                <TableCell>Reason</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Reviewer</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {leaves.map((l) => (
                                <TableRow key={l.id} hover>
                                    <TableCell>
                                        <Chip label={l.leave_type} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell>{l.start_date}</TableCell>
                                    <TableCell>{l.end_date}</TableCell>
                                    <TableCell>{l.reason || '—'}</TableCell>
                                    <TableCell>
                                        <Chip label={l.status} size="small" color={STATUS_COLORS[l.status] || 'default'} />
                                    </TableCell>
                                    <TableCell>{l.reviewer_name || '—'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Paper>
        </Box>
    );
}
