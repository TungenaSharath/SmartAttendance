import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Paper, Typography, TextField, Button, Alert, ToggleButtonGroup,
    ToggleButton, InputAdornment, IconButton, CircularProgress
} from '@mui/material';
import { Visibility, VisibilityOff, Login as LoginIcon, PersonAdd } from '@mui/icons-material';
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
            background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
            p: 2,
        }}>
            <Paper elevation={8} sx={{
                p: 4, width: '100%', maxWidth: 440, borderRadius: 4,
                backdropFilter: 'blur(10px)',
                background: 'rgba(255,255,255,0.95)',
            }}>
                {/* Logo */}
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Typography variant="h4" fontWeight={800} sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                        📸 SmartAttendance
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        AI Face Recognition Platform
                    </Typography>
                </Box>

                {/* Mode Toggle */}
                <ToggleButtonGroup
                    value={mode} exclusive
                    onChange={(_, v) => v && setMode(v)}
                    fullWidth size="small" sx={{ mb: 3 }}
                >
                    <ToggleButton value="login"><LoginIcon sx={{ mr: 1 }} /> Login</ToggleButton>
                    <ToggleButton value="register"><PersonAdd sx={{ mr: 1 }} /> Register</ToggleButton>
                </ToggleButtonGroup>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <form onSubmit={handleSubmit}>
                    {mode === 'register' && (
                        <TextField
                            fullWidth label="Full Name" variant="outlined" sx={{ mb: 2 }}
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                        />
                    )}

                    <TextField
                        fullWidth label="Teacher ID" variant="outlined" sx={{ mb: 2 }}
                        value={form.teacher_id}
                        onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
                        required autoFocus
                    />

                    <TextField
                        fullWidth label="Password" variant="outlined" sx={{ mb: 2 }}
                        type={showPw ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowPw(!showPw)} edge="end">
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
                            fullWidth size="small" sx={{ mb: 2 }}
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
                            py: 1.5, borderRadius: 2, fontWeight: 600, textTransform: 'none', fontSize: 16,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4298 100%)' },
                        }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> :
                            mode === 'login' ? 'Sign In' : 'Create Account'}
                    </Button>
                </form>
            </Paper>
        </Box>
    );
}
