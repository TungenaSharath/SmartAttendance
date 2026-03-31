import { useState } from 'react';
import {
    Box, Typography, Paper, TextField, Button, Select, MenuItem,
    FormControl, InputLabel, Alert, CircularProgress
} from '@mui/material';
import { Send } from '@mui/icons-material';
import { leaveAPI } from '../../api';

const LEAVE_TYPES = ['CASUAL', 'SICK', 'EARNED', 'DUTY', 'OTHER'];

export default function LeaveApply() {
    const [form, setForm] = useState({
        leave_type: '', start_date: '', end_date: '', reason: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await leaveAPI.apply(form);
            setSuccess('Leave application submitted successfully!');
            setForm({ leave_type: '', start_date: '', end_date: '', reason: '' });
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to submit');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>Apply for Leave</Typography>

            {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #eee', maxWidth: 600 }}>
                <form onSubmit={handleSubmit}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Leave Type</InputLabel>
                        <Select value={form.leave_type} label="Leave Type" required
                            onChange={e => setForm({ ...form, leave_type: e.target.value })}>
                            {LEAVE_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                        </Select>
                    </FormControl>

                    <TextField fullWidth label="Start Date" type="date" required sx={{ mb: 2 }}
                        InputLabelProps={{ shrink: true }}
                        value={form.start_date}
                        onChange={e => setForm({ ...form, start_date: e.target.value })} />

                    <TextField fullWidth label="End Date" type="date" required sx={{ mb: 2 }}
                        InputLabelProps={{ shrink: true }}
                        value={form.end_date}
                        onChange={e => setForm({ ...form, end_date: e.target.value })} />

                    <TextField fullWidth label="Reason" multiline rows={3} sx={{ mb: 2 }}
                        value={form.reason}
                        onChange={e => setForm({ ...form, reason: e.target.value })} />

                    <Button type="submit" variant="contained" size="large"
                        disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : <Send />}
                        sx={{ borderRadius: 2 }}>
                        Submit Application
                    </Button>
                </form>
            </Paper>
        </Box>
    );
}
