import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
    Select, MenuItem, Chip, Alert
} from '@mui/material';
import { adminAPI } from '../../api';

const ROLES = ['TEACHER', 'HOD', 'ADMIN'];
const ROLE_COLOR = { ADMIN: 'error', HOD: 'warning', TEACHER: 'success' };

export default function Teachers() {
    const [teachers, setTeachers] = useState([]);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        adminAPI.teachers().then(r => setTeachers(r.data)).catch(() => { });
    }, []);

    const handleRoleChange = async (id, role) => {
        try {
            await adminAPI.updateRole(id, role);
            setTeachers(prev => prev.map(t => t.id === id ? { ...t, role } : t));
            setMsg(`Role updated to ${role}`);
        } catch (e) {
            setMsg(e.response?.data?.detail || 'Error');
        }
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>Manage Teachers</Typography>

            {msg && <Alert severity="info" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #eee', overflow: 'hidden' }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell>Name</TableCell>
                            <TableCell>Login ID</TableCell>
                            <TableCell>Current Role</TableCell>
                            <TableCell>Change Role</TableCell>
                            <TableCell>Joined</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {teachers.map((t) => (
                            <TableRow key={t.id} hover>
                                <TableCell>{t.name}</TableCell>
                                <TableCell>{t.teacher_id}</TableCell>
                                <TableCell>
                                    <Chip label={t.role} size="small" color={ROLE_COLOR[t.role] || 'default'} />
                                </TableCell>
                                <TableCell>
                                    <Select value={t.role} size="small"
                                        onChange={e => handleRoleChange(t.id, e.target.value)}>
                                        {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                                    </Select>
                                </TableCell>
                                <TableCell>{new Date(t.created_at).toLocaleDateString()}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
        </Box>
    );
}
