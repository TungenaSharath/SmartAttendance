import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Paper, Typography, TextField, Button, Alert, ToggleButtonGroup,
    ToggleButton, InputAdornment, IconButton, CircularProgress
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
    const { login, register } = useAuth();
    const navigate = useNavigate();
    const [mode, setMode] = useState('login');
    const [form, setForm] = useState({ name: '', teacher_id: '', password: '', role: 'TEACHER' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPw, setShowPw] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            let userData;
            if (mode === 'login') {
                userData = await login({ teacher_id: form.teacher_id, password: form.password });
            } else {
                userData = await register(form);
            }
            const role = userData.role || 'TEACHER';
            navigate(role === 'ADMIN' ? '/admin' : role === 'HOD' ? '/hod' : '/teacher');
        } catch (err) {
            setError(err.response?.data?.detail || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: '#f5f5f7',
            p: 2,
        }}>
            <Paper elevation={0} sx={{
                p: { xs: 3, sm: 5 },
                width: '100%',
                maxWidth: 420,
                borderRadius: '24px',
                bgcolor: '#ffffff',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.35s cubic-bezier(0.25, 0.1, 0.25, 1.0)'
            }}>
                {/* Apple Minimalist Header */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Typography variant="h4" fontWeight={700} color="#1d1d1f" sx={{ letterSpacing: '-0.03em' }}>
                        SmartAttendance
                    </Typography>
                    <Typography variant="body2" color="#86868b" sx={{ mt: 0.5, fontWeight: 400 }}>
                        Sign in to your campus portal
                    </Typography>
                </Box>

                {/* Apple Segmented Switcher */}
                <ToggleButtonGroup
                    value={mode} exclusive
                    onChange={(_, v) => v && setMode(v)}
                    fullWidth size="small"
                    sx={{
                        mb: 3,
                        bgcolor: '#f5f5f7',
                        p: 0.5,
                        borderRadius: '980px',
                        border: 'none',
                        '& .MuiToggleButton-root': {
                            border: 'none',
                            borderRadius: '980px',
                            textTransform: 'none',
                            fontWeight: 600,
                            color: '#86868b',
                            fontSize: 14,
                            py: 0.8,
                            transition: 'all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1.0)',
                            '&.Mui-selected': {
                                bgcolor: '#ffffff',
                                color: '#1d1d1f',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                                '&:hover': { bgcolor: '#ffffff' }
                            }
                        }
                    }}
                >
                    <ToggleButton value="login">Sign In</ToggleButton>
                    <ToggleButton value="register">Register</ToggleButton>
                </ToggleButtonGroup>

                {error && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: '14px', bgcolor: 'rgba(255, 59, 48, 0.08)', color: '#ff3b30', border: 'none' }}>
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    {mode === 'register' && (
                        <TextField
                            fullWidth label="Full Name" variant="outlined" sx={{ mb: 2 }}
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                            InputProps={{ sx: { borderRadius: '12px' } }}
                        />
                    )}

                    <TextField
                        fullWidth label="Teacher ID" variant="outlined" sx={{ mb: 2 }}
                        value={form.teacher_id}
                        onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
                        required autoFocus
                        InputProps={{ sx: { borderRadius: '12px' } }}
                    />

                    <TextField
                        fullWidth label="Password" variant="outlined" sx={{ mb: 3 }}
                        type={showPw ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                        InputProps={{
                            sx: { borderRadius: '12px' },
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowPw(!showPw)} edge="end" sx={{ color: '#86868b' }}>
                                        {showPw ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    {mode === 'register' && (
                        <ToggleButtonGroup
                            value={form.role} exclusive
                            onChange={(_, v) => v && setForm({ ...form, role: v })}
                            fullWidth size="small" sx={{
                                mb: 3, bgcolor: '#f5f5f7', p: 0.5, borderRadius: '980px',
                                '& .MuiToggleButton-root': {
                                    border: 'none', borderRadius: '980px', textTransform: 'none', fontWeight: 600, color: '#86868b',
                                    '&.Mui-selected': { bgcolor: '#0071e3', color: '#ffffff' }
                                }
                            }}
                        >
                            <ToggleButton value="TEACHER">Teacher</ToggleButton>
                            <ToggleButton value="HOD">HOD</ToggleButton>
                            <ToggleButton value="ADMIN">Admin</ToggleButton>
                        </ToggleButtonGroup>
                    )}

                    <Button
                        type="submit" variant="contained" fullWidth size="large"
                        disabled={loading}
                        sx={{
                            py: 1.4,
                            borderRadius: '980px',
                            fontWeight: 600,
                            textTransform: 'none',
                            fontSize: 16,
                            bgcolor: '#0071e3',
                            color: '#ffffff',
                            boxShadow: 'none',
                            transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1.0)',
                            '&:hover': {
                                bgcolor: '#0077ed',
                                transform: 'scale(1.01)',
                                boxShadow: '0 4px 15px rgba(0, 113, 227, 0.3)',
                            },
                            '&:active': { transform: 'scale(0.98)' }
                        }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> :
                            mode === 'login' ? 'Continue' : 'Create Account'}
                    </Button>
                </form>
            </Paper>
        </Box>
    );
}
