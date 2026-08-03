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
            bgcolor: '#090d16',
            backgroundImage: `
                radial-gradient(at 20% 20%, rgba(56, 189, 248, 0.15) 0px, transparent 50%),
                radial-gradient(at 80% 80%, rgba(168, 85, 247, 0.15) 0px, transparent 50%)
            `,
            p: 2,
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Ambient Background Light Orbs */}
            <Box sx={{
                position: 'absolute', top: '-10%', left: '-10%',
                width: 400, height: 400, borderRadius: '50%',
                background: 'rgba(56, 189, 248, 0.12)', filter: 'blur(90px)', pointerEvents: 'none'
            }} />
            <Box sx={{
                position: 'absolute', bottom: '-10%', right: '-10%',
                width: 400, height: 400, borderRadius: '50%',
                background: 'rgba(168, 85, 247, 0.12)', filter: 'blur(90px)', pointerEvents: 'none'
            }} />

            <Paper elevation={0} sx={{
                p: { xs: 3, sm: 4 }, width: '100%', maxWidth: 450, borderRadius: 4,
                background: 'rgba(19, 27, 46, 0.75)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
                zIndex: 1
            }}>
                {/* Brand Logo Header */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Box sx={{
                        width: 56, height: 56, borderRadius: 3, mx: 'auto', mb: 1.5,
                        background: 'linear-gradient(135deg, #38bdf8 0%, #a855f7 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 28, boxShadow: '0 0 25px rgba(56, 189, 248, 0.4)'
                    }}>
                        📸
                    </Box>
                    <Typography variant="h4" fontWeight={800} sx={{
                        background: 'linear-gradient(135deg, #38bdf8 0%, #a855f7 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.5px'
                    }}>
                        SmartAttendance
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
                        Next-Gen AI Facial Recognition Platform
                    </Typography>
                </Box>

                {/* Mode Toggle */}
                <ToggleButtonGroup
                    value={mode} exclusive
                    onChange={(_, v) => v && setMode(v)}
                    fullWidth size="small" sx={{
                        mb: 3, bgcolor: 'rgba(255, 255, 255, 0.04)', p: 0.5, borderRadius: 2.5,
                        '& .MuiToggleButton-root': {
                            border: 'none', borderRadius: 2, textTransform: 'none', fontWeight: 600, color: '#94a3b8',
                            '&.Mui-selected': { bgcolor: '#38bdf8', color: '#090d16', '&:hover': { bgcolor: '#7dd3fc' } }
                        }
                    }}
                >
                    <ToggleButton value="login"><LoginIcon sx={{ mr: 1, fontSize: 18 }} /> Sign In</ToggleButton>
                    <ToggleButton value="register"><PersonAdd sx={{ mr: 1, fontSize: 18 }} /> Register</ToggleButton>
                </ToggleButtonGroup>

                {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2.5, bgcolor: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.3)' }}>{error}</Alert>}

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
                        fullWidth label="Teacher ID / Username" variant="outlined" sx={{ mb: 2 }}
                        value={form.teacher_id}
                        onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
                        required autoFocus
                    />

                    <TextField
                        fullWidth label="Password" variant="outlined" sx={{ mb: 2.5 }}
                        type={showPw ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowPw(!showPw)} edge="end" sx={{ color: '#94a3b8' }}>
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
                                mb: 2.5, bgcolor: 'rgba(255, 255, 255, 0.04)', p: 0.5, borderRadius: 2.5,
                                '& .MuiToggleButton-root': {
                                    border: 'none', borderRadius: 2, textTransform: 'none', fontWeight: 600, color: '#94a3b8',
                                    '&.Mui-selected': { bgcolor: '#a855f7', color: '#fff' }
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
                            py: 1.5, borderRadius: 2.5, fontWeight: 700, textTransform: 'none', fontSize: 16,
                            background: 'linear-gradient(135deg, #38bdf8 0%, #a855f7 100%)',
                            boxShadow: '0 4px 20px rgba(56, 189, 248, 0.3)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #0284c7 0%, #7e22ce 100%)',
                                boxShadow: '0 6px 25px rgba(56, 189, 248, 0.5)',
                            },
                        }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> :
                            mode === 'login' ? 'Sign In to Portal' : 'Create Account'}
                    </Button>
                </form>
            </Paper>
        </Box>
    );
}
