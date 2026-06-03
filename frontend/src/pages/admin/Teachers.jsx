import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
    Select, MenuItem, Chip, Alert, Button, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, Grid, CircularProgress
} from '@mui/material';
import { PersonAdd } from '@mui/icons-material';
import { adminAPI, authAPI } from '../../api';

const ROLES = ['TEACHER', 'HOD', 'ADMIN'];
const ROLE_COLOR = { ADMIN: 'error', HOD: 'warning', TEACHER: 'success' };

export default function Teachers() {
    const [teachers, setTeachers] = useState([]);
    const [msg, setMsg] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ name: '', teacher_id: '', password: '', role: 'TEACHER' });

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

    const handleAddStaff = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMsg('');
        try {
            // Register user (stateless creation since backend doesn't care about auth token here)
            const res = await authAPI.register({
                name: formData.name,
                teacher_id: formData.teacher_id,
                password: formData.password
            });
            // Immediately set their role using Admin permission
            await adminAPI.updateRole(res.data.teacher_id, formData.role);
            
            setMsg('Staff registered successfully!');
            setShowAdd(false);
            setFormData({ name: '', teacher_id: '', password: '', role: 'TEACHER' });
            
            // Refresh list
            const r = await adminAPI.teachers();
            setTeachers(r.data);
        } catch (err) {
            setMsg(err.response?.data?.detail || 'Failed to register staff');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" fontWeight={700}>Manage Teachers</Typography>
                <Button 
                    variant="contained" 
                    startIcon={<PersonAdd />} 
                    onClick={() => setShowAdd(true)}
                >
                    Register Staff
                </Button>
            </Box>

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

            <Dialog open={showAdd} onClose={() => !loading && setShowAdd(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Register New Staff</DialogTitle>
                <form onSubmit={handleAddStaff}>
                    <DialogContent dividers>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField 
                                    fullWidth label="Full Name" required 
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField 
                                    fullWidth label="Login ID" required 
                                    value={formData.teacher_id}
                                    onChange={e => setFormData({ ...formData, teacher_id: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField 
                                    fullWidth label="Password" required type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Select 
                                    fullWidth 
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                                </Select>
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setShowAdd(false)} disabled={loading}>Cancel</Button>
                        <Button 
                            type="submit" 
                            variant="contained" 
                            disabled={loading || formData.password.length < 4}
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PersonAdd />}
                        >
                            {loading ? 'Registering...' : 'Register Staff'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
}
