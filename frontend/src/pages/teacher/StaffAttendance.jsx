import { useState } from 'react';
import { Box, Typography, Paper, Button, Alert, CircularProgress } from '@mui/material';
import { CameraAlt, CheckCircle } from '@mui/icons-material';
import { staffAttendanceAPI } from '../../api';

export default function StaffAttendance() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleCapture = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(true);
        setError('');
        try {
            const res = await staffAttendanceAPI.mark(file);
            setResult(res.data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to mark attendance');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>Staff Check-in</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Mark your attendance using face recognition
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            <Paper elevation={0} sx={{
                p: 4, borderRadius: 3, border: '1px solid #eee',
                textAlign: 'center', maxWidth: 500, mx: 'auto',
            }}>
                {result?.success ? (
                    <Box>
                        <CheckCircle sx={{ fontSize: 64, color: '#4caf50', mb: 2 }} />
                        <Typography variant="h5" fontWeight={600} color="success.main">
                            {result.newly_marked ? 'Checked In!' : 'Already Checked In'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Date: {result.date} | Confidence: {(result.confidence * 100).toFixed(1)}%
                        </Typography>
                        <Button variant="outlined" sx={{ mt: 3 }} onClick={() => setResult(null)}>
                            Check Again
                        </Button>
                    </Box>
                ) : (
                    <Box>
                        <CameraAlt sx={{ fontSize: 64, color: '#9e9e9e', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>Take a selfie to check in</Typography>
                        <Button variant="contained" component="label" size="large"
                            disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : <CameraAlt />}
                            sx={{ mt: 2, borderRadius: 2 }}>
                            {loading ? 'Processing...' : 'Capture Photo'}
                            <input type="file" hidden accept="image/*" capture="user" onChange={handleCapture} />
                        </Button>
                    </Box>
                )}
            </Paper>
        </Box>
    );
}
