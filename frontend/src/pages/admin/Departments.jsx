import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
    Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Alert, Chip, Grid
} from '@mui/material';
import { Add } from '@mui/icons-material';
import StatsCard from '../../components/StatsCard';
import { adminAPI } from '../../api';

export default function Departments() {
    const [depts, setDepts] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ name: '', code: '' });
    const [msg, setMsg] = useState('');

    const load = () => adminAPI.departments().then(r => setDepts(r.data)).catch(() => { });
    useEffect(load, []);

    const handleCreate = async () => {
        try {
            await adminAPI.createDepartment(form);
            setOpen(false);
            setForm({ name: '', code: '' });
            setMsg('Department created');
            load();
        } catch (e) {
            setMsg(e.response?.data?.detail || 'Error');
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" fontWeight={700}>Departments</Typography>
                <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
                    Add Department
                </Button>
            </Box>

            {msg && <Alert severity="info" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                {depts.map(d => (
                    <Grid item xs={12} sm={6} md={4} key={d.id}>
                        <Paper elevation={0} sx={{
                            p: 2.5, borderRadius: 3, border: '1px solid #eee',
                            '&:hover': { borderColor: 'primary.main', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }
                        }}>
                            <Typography variant="h6" fontWeight={600}>{d.name}</Typography>
                            <Chip label={d.code} size="small" sx={{ mb: 1.5 }} />
                            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                                <Typography variant="body2">👨‍🏫 {d.total_teachers || 0} Teachers</Typography>
                                <Typography variant="body2">🎓 {d.total_students || 0} Students</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                HOD: {d.hod_name || 'Not assigned'}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, color: '#4caf50', fontWeight: 600 }}>
                                Today: {d.today_attendance_rate || 0}% attendance
                            </Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Create Dialog */}
            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle>Create Department</DialogTitle>
                <DialogContent>
                    <TextField fullWidth label="Department Name" sx={{ mt: 1, mb: 2 }}
                        value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    <TextField fullWidth label="Department Code" placeholder="e.g. CSE, ECE"
                        value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreate}>Create</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
