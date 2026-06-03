import { useState, useRef, useEffect } from 'react';
import { Box, Typography, Paper, Button, Alert, CircularProgress } from '@mui/material';
import { CameraAlt, CheckCircle, VideocamOff } from '@mui/icons-material';
import { staffAttendanceAPI } from '../../api';

export default function StaffAttendance() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [camActive, setCamActive] = useState(false);
    
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    const startCamera = async () => {
        setError('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            streamRef.current = stream;
            setCamActive(true); // Trigger re-render to display the <video> element
        } catch (err) {
            setError('Could not access the camera. Please allow camera permissions.');
        }
    };

    // Safely attach stream to video element once it is mounted
    useEffect(() => {
        if (camActive && streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(e => console.error("Video play failed:", e));
        }
    }, [camActive]);

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCamActive(false);
    };

    // Make sure we stop camera if component unmounts
    useEffect(() => {
        return () => stopCamera();
    }, []);

    const captureAndCheckIn = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        
        setError('');
        setLoading(true);

        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
            if (!blob) {
                setError('Failed to capture frame.');
                setLoading(false);
                return;
            }

            const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });

            try {
                // Get Gelocation First
                const pos = await new Promise((resolve, reject) => {
                    if (!navigator.geolocation) {
                        reject(new Error("Geolocation is not supported by your browser"));
                    } else {
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                            enableHighAccuracy: true,
                            timeout: 10000,
                            maximumAge: 0
                        });
                    }
                });
                
                const payload = {
                    image: file,
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                };

                const res = await staffAttendanceAPI.mark(payload);
                setResult(res.data);
                stopCamera();
            } catch (err) {
                if (err.code === 1) { // PERMISSION_DENIED
                    setError('Location access denied. Please enable location permissions to check in.');
                } else if (err.code === 2 || err.code === 3) {
                    setError('Failed to retrieve location. Please check your signal and try again.');
                } else {
                    setError(err.response?.data?.detail || err.message || 'Failed to mark attendance');
                }
            } finally {
                setLoading(false);
            }
        }, 'image/jpeg', 0.8);
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>Staff Check-in</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Mark your attendance using live face recognition
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            <Paper elevation={0} sx={{
                p: 4, borderRadius: 3, border: '1px solid #eee',
                textAlign: 'center', maxWidth: 600, mx: 'auto',
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
                        {!camActive ? (
                            <Box sx={{ py: 4 }}>
                                <VideocamOff sx={{ fontSize: 64, color: '#9e9e9e', mb: 2 }} />
                                <Typography variant="h6" gutterBottom>Camera is entirely off</Typography>
                                <Button 
                                    variant="contained" 
                                    size="large"
                                    onClick={startCamera} 
                                    startIcon={<CameraAlt />}
                                    sx={{ mt: 2, borderRadius: 2 }}>
                                    Enable Camera to Check In
                                </Button>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Box sx={{ 
                                    width: '100%', 
                                    maxWidth: 400, 
                                    borderRadius: 3, 
                                    overflow: 'hidden', 
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                    mb: 3,
                                    backgroundColor: '#000'
                                }}>
                                    <video 
                                        ref={videoRef} 
                                        autoPlay 
                                        playsInline 
                                        muted 
                                        style={{ width: '100%', display: 'block', transform: 'scaleX(-1)' }} 
                                    />
                                </Box>
                                <canvas ref={canvasRef} style={{ display: 'none' }} />

                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <Button 
                                        variant="outlined" 
                                        color="error" 
                                        onClick={stopCamera}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </Button>
                                    <Button 
                                        variant="contained" 
                                        size="large"
                                        onClick={captureAndCheckIn}
                                        disabled={loading} 
                                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CameraAlt />}
                                        sx={{ borderRadius: 2, px: 4 }}>
                                        {loading ? 'Processing...' : 'Capture Photo'}
                                    </Button>
                                </Box>
                            </Box>
                        )}
                    </Box>
                )}
            </Paper>
        </Box>
    );
}
