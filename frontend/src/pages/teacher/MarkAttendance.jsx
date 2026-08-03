import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box, Typography, Paper, Button, Select, MenuItem, FormControl,
    InputLabel, Alert, Table, TableHead, TableRow, TableCell, TableBody,
    Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    CircularProgress, Switch, FormControlLabel, Snackbar, Grid, Card, CardContent
} from '@mui/material';
import {
    CameraAlt, Upload, Add, PhotoCamera, Autorenew, CheckCircle,
    HowToReg, Cancel, Group, Speed
} from '@mui/icons-material';
import { subjectsAPI, sessionsAPI, attendanceAPI } from '../../api';

export default function MarkAttendance() {
    const [subjects, setSubjects] = useState([]);
    const [selSubject, setSelSubject] = useState('');
    const [sessions, setSessions] = useState([]);
    const [selSession, setSelSession] = useState('');
    const [attendance, setAttendance] = useState([]);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [scanMs, setScanMs] = useState(null);
    const [error, setError] = useState('');
    const [newSession, setNewSession] = useState('');
    const [showNewSession, setShowNewSession] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [autoScan, setAutoScan] = useState(false);

    // Toast Notifications
    const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

    const isProcessingRef = useRef(false);
    const autoScanTimerRef = useRef(null);

    useEffect(() => {
        subjectsAPI.list().then(r => setSubjects(r.data)).catch(() => { });
    }, []);

    useEffect(() => {
        if (selSubject) {
            sessionsAPI.list(selSubject).then(r => setSessions(r.data)).catch(() => { });
        } else {
            setSessions([]);
            setSelSession('');
        }
    }, [selSubject]);

    const fetchAttendance = useCallback(() => {
        if (selSession) {
            attendanceAPI.get(selSession).then(r => setAttendance(r.data)).catch(() => { });
        } else {
            setAttendance([]);
        }
    }, [selSession]);

    useEffect(() => {
        fetchAttendance();
    }, [fetchAttendance]);

    const startCamera = async () => {
        setError('');
        try {
            const s = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            setStream(s);
            setCameraActive(true);
        } catch (e) {
            setError('Camera access denied or device not found.');
        }
    };

    useEffect(() => {
        if (cameraActive && stream && videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.error(e));
        }
    }, [cameraActive, stream]);

    const stopCamera = () => {
        setAutoScan(false);
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
        }
        setStream(null);
        setCameraActive(false);
    };

    const processSingleFrame = async () => {
        if (!videoRef.current || !selSession || !selSubject) return;
        if (isProcessingRef.current) return;

        isProcessingRef.current = true;
        const t0 = performance.now();

        try {
            const video = videoRef.current;
            if (video.videoWidth === 0 || video.videoHeight === 0) return;

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = video.videoWidth;
            tempCanvas.height = video.videoHeight;
            const ctx = tempCanvas.getContext('2d');
            ctx.drawImage(video, 0, 0);

            const blob = await new Promise(r => tempCanvas.toBlob(r, 'image/jpeg', 0.85));
            const file = new File([blob], 'live_frame.jpg', { type: 'image/jpeg' });

            const res = await attendanceAPI.mark(selSession, file);
            const elapsed = Math.round(performance.now() - t0);
            setScanMs(res.data.scan_time_ms || elapsed);
            setResult(res.data);

            // Check newly marked students
            if (res.data.marked && res.data.marked.length > 0) {
                const newOnes = res.data.marked.filter(m => m.newly_marked);
                if (newOnes.length > 0) {
                    const names = newOnes.map(n => n.name).join(', ');
                    setToast({
                        open: true,
                        message: `🎉 Marked Present: ${names}`,
                        severity: 'success'
                    });
                    fetchAttendance();
                }
            }
        } catch (err) {
            console.error('Frame process error:', err);
        } finally {
            isProcessingRef.current = false;
        }
    };

    // Auto-scan loop effect
    useEffect(() => {
        if (autoScan && cameraActive && selSession) {
            autoScanTimerRef.current = setInterval(() => {
                processSingleFrame();
            }, 400);
        } else {
            if (autoScanTimerRef.current) clearInterval(autoScanTimerRef.current);
        }

        return () => {
            if (autoScanTimerRef.current) clearInterval(autoScanTimerRef.current);
        };
    }, [autoScan, cameraActive, selSession]);

    const captureAndMarkManual = async () => {
        if (!selSession) return setError('Select a session first');
        setLoading(true);
        setError('');
        await processSingleFrame();
        fetchAttendance();
        setLoading(false);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !selSession) return;
        setLoading(true);
        setError('');
        try {
            const t0 = performance.now();
            const res = await attendanceAPI.mark(selSession, file);
            setScanMs(Math.round(performance.now() - t0));
            setResult(res.data);
            fetchAttendance();
            setToast({ open: true, message: 'Image processed successfully!', severity: 'success' });
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to process image');
        } finally {
            setLoading(false);
        }
    };

    const createSession = async () => {
        if (!newSession || !selSubject) return;
        try {
            const res = await sessionsAPI.create(selSubject, newSession);
            setSessions(prev => [res.data, ...prev]);
            setSelSession(res.data.id);
            setNewSession('');
            setShowNewSession(false);
            setToast({ open: true, message: `Session "${newSession}" created!`, severity: 'success' });
        } catch (e) {
            setError(e.response?.data?.detail || 'Failed to create session');
        }
    };

    const handleManualMark = async (studentId, currentStatus) => {
        if (!selSession) return;
        const newStatus = currentStatus === 'Present' ? 'Absent' : 'Present';
        try {
            await attendanceAPI.update(selSession, studentId, newStatus);
            fetchAttendance();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to update attendance');
        }
    };

    const presentCount = attendance.filter(a => a.status === 'Present').length;
    const absentCount = attendance.filter(a => a.status === 'Absent').length;
    const totalCount = attendance.length;
    const presentPercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

    return (
        <Box sx={{ pb: 4 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" fontWeight={700} color="primary.main">
                    Mark Attendance
                </Typography>
                {scanMs && (
                    <Chip
                        icon={<Speed />}
                        label={`Speed: ${scanMs}ms / frame`}
                        color="success"
                        variant="outlined"
                        size="small"
                    />
                )}
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

            {/* Selector Controls */}
            <Paper elevation={0} sx={{
                p: 3,
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                border: '1px solid #e0e6ed',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                mb: 3
            }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <FormControl sx={{ minWidth: 220 }}>
                        <InputLabel>Select Subject</InputLabel>
                        <Select
                            value={selSubject}
                            label="Select Subject"
                            onChange={e => { setSelSubject(e.target.value); setSelSession(''); setAutoScan(false); }}
                        >
                            {subjects.map(s => <MenuItem key={s.id} value={s.id}>{s.name} ({s.code})</MenuItem>)}
                        </Select>
                    </FormControl>

                    <FormControl sx={{ minWidth: 220 }}>
                        <InputLabel>Select Session</InputLabel>
                        <Select
                            value={selSession}
                            label="Select Session"
                            onChange={e => { setSelSession(e.target.value); setAutoScan(false); }}
                            disabled={!selSubject}
                        >
                            {sessions.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                        </Select>
                    </FormControl>

                    <Button
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={() => setShowNewSession(true)}
                        disabled={!selSubject}
                        sx={{ borderRadius: 2, textTransform: 'none', px: 3, py: 1.2 }}
                    >
                        New Session
                    </Button>
                </Box>
            </Paper>

            {/* Attendance Overview Stats */}
            {totalCount > 0 && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={3}>
                        <Card elevation={0} sx={{ border: '1px solid #e0e6ed', borderRadius: 3, bgcolor: '#f8fafc' }}>
                            <CardContent sx={{ p: '16px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Group color="primary" sx={{ fontSize: 32 }} />
                                <Box>
                                    <Typography variant="body2" color="text.secondary">Total Enrolled</Typography>
                                    <Typography variant="h6" fontWeight={700}>{totalCount}</Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <Card elevation={0} sx={{ border: '1px solid #e0e6ed', borderRadius: 3, bgcolor: '#f0fdf4' }}>
                            <CardContent sx={{ p: '16px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
                                <HowToReg color="success" sx={{ fontSize: 32 }} />
                                <Box>
                                    <Typography variant="body2" color="text.secondary">Present</Typography>
                                    <Typography variant="h6" fontWeight={700} color="success.main">
                                        {presentCount} ({presentPercentage}%)
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <Card elevation={0} sx={{ border: '1px solid #e0e6ed', borderRadius: 3, bgcolor: '#fef2f2' }}>
                            <CardContent sx={{ p: '16px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Cancel color="error" sx={{ fontSize: 32 }} />
                                <Box>
                                    <Typography variant="body2" color="text.secondary">Absent</Typography>
                                    <Typography variant="h6" fontWeight={700} color="error.main">{absentCount}</Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <Card elevation={0} sx={{ border: '1px solid #e0e6ed', borderRadius: 3, bgcolor: '#eff6ff' }}>
                            <CardContent sx={{ p: '16px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
                                <CheckCircle color="info" sx={{ fontSize: 32 }} />
                                <Box>
                                    <Typography variant="body2" color="text.secondary">Status</Typography>
                                    <Typography variant="h6" fontWeight={700} color="primary.main">
                                        {autoScan ? '⚡ Live Scanning' : 'Ready'}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Camera & Scanner Card */}
            <Paper elevation={0} sx={{
                p: 3,
                borderRadius: 3,
                border: '1px solid #e0e6ed',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                mb: 3
            }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Button
                        variant="contained"
                        color={cameraActive ? "error" : "primary"}
                        startIcon={<CameraAlt />}
                        onClick={cameraActive ? stopCamera : startCamera}
                        sx={{ borderRadius: 2, textTransform: 'none', px: 3, py: 1 }}
                    >
                        {cameraActive ? 'Stop Camera' : 'Start Camera'}
                    </Button>

                    {cameraActive && (
                        <>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<PhotoCamera />}
                                onClick={captureAndMarkManual}
                                disabled={loading || !selSession}
                                sx={{ borderRadius: 2, textTransform: 'none', px: 3, py: 1 }}
                            >
                                {loading ? <CircularProgress size={20} color="inherit" /> : 'Instant Capture & Mark'}
                            </Button>

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={autoScan}
                                        onChange={e => setAutoScan(e.target.checked)}
                                        color="success"
                                        disabled={!selSession}
                                    />
                                }
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Autorenew sx={{
                                            animation: autoScan ? 'spin 2s linear infinite' : 'none',
                                            '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } }
                                        }} />
                                        <Typography fontWeight={600}>
                                            Auto-Scan Mode {autoScan && '(Active)'}
                                        </Typography>
                                    </Box>
                                }
                                sx={{ ml: 1, p: 1, borderRadius: 2, bgcolor: autoScan ? '#e8f5e9' : '#f5f5f5' }}
                            />
                        </>
                    )}

                    <Button
                        variant="outlined"
                        component="label"
                        startIcon={<Upload />}
                        disabled={!selSession || loading}
                        sx={{ borderRadius: 2, textTransform: 'none', px: 3, py: 1, ml: 'auto' }}
                    >
                        Upload Photo
                        <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                    </Button>
                </Box>

                <Grid container spacing={3}>
                    {/* Live Stream View */}
                    {cameraActive && (
                        <Grid item xs={12} md={result?.annotated_image ? 6 : 12}>
                            <Box sx={{
                                position: 'relative',
                                borderRadius: 3,
                                overflow: 'hidden',
                                border: autoScan ? '3px solid #2e7d32' : '2px solid #1976d2',
                                boxShadow: autoScan ? '0 0 15px rgba(46, 125, 50, 0.4)' : 'none',
                                transition: 'all 0.3s ease'
                            }}>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    style={{ width: '100%', display: 'block' }}
                                />
                                {autoScan && (
                                    <Box sx={{
                                        position: 'absolute', top: 12, left: 12,
                                        bgcolor: 'rgba(46, 125, 50, 0.9)', color: '#fff',
                                        px: 2, py: 0.5, borderRadius: 10,
                                        display: 'flex', alignItems: 'center', gap: 1,
                                        fontSize: '0.85rem', fontWeight: 600
                                    }}>
                                        <Box sx={{
                                            width: 8, height: 8, borderRadius: '50%', bgcolor: '#fff',
                                            animation: 'pulse 1s infinite',
                                            '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.3 } }
                                        }} />
                                        Live AI Scanner Active
                                    </Box>
                                )}
                            </Box>
                        </Grid>
                    )}

                    {/* AI Bounding Box Overlay Output */}
                    {result?.annotated_image && (
                        <Grid item xs={12} md={cameraActive ? 6 : 12}>
                            <Box sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid #e0e6ed' }}>
                                <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e0e6ed', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="subtitle2" fontWeight={600}>
                                        AI Frame Result
                                    </Typography>
                                    <Chip
                                        label={`${result.marked?.length || 0} recognized, ${result.unknown_count} unknown`}
                                        size="small"
                                        color="primary"
                                    />
                                </Box>
                                <img
                                    src={`data:image/jpeg;base64,${result.annotated_image}`}
                                    alt="Result"
                                    style={{ width: '100%', display: 'block' }}
                                />
                            </Box>
                        </Grid>
                    )}
                </Grid>
            </Paper>

            {/* Attendance Table */}
            {attendance.length > 0 && (
                <Paper elevation={0} sx={{
                    borderRadius: 3,
                    border: '1px solid #e0e6ed',
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                }}>
                    <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e0e6ed', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" fontWeight={700} color="text.primary">
                            Session Attendance Sheet
                        </Typography>
                        <Chip label={`${presentCount} / ${totalCount} Present`} color="success" size="small" />
                    </Box>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                                <TableCell sx={{ fontWeight: 700 }}>Student Name</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Roll Number</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>AI Match Confidence</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Toggle Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {attendance.map((a) => (
                                <TableRow key={a.id} hover sx={{ transition: 'background-color 0.2s' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>{a.name}</TableCell>
                                    <TableCell>{a.student_code}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={a.status}
                                            size="small"
                                            color={a.status === 'Present' ? 'success' : 'default'}
                                            sx={{ fontWeight: 600, px: 1 }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {a.confidence > 0 ? (
                                            <Typography variant="body2" fontWeight={600} color="primary.main">
                                                {(a.confidence * 100).toFixed(1)}%
                                            </Typography>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">—</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={a.method.toUpperCase()}
                                            size="small"
                                            variant="outlined"
                                            color={a.method === 'auto' ? 'info' : 'secondary'}
                                            sx={{ fontSize: '0.7rem' }}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            variant={a.status === 'Present' ? "outlined" : "contained"}
                                            color={a.status === 'Present' ? "warning" : "success"}
                                            onClick={() => handleManualMark(a.student_id, a.status)}
                                            sx={{ borderRadius: 2, textTransform: 'none', px: 2 }}
                                        >
                                            {a.status === 'Present' ? 'Mark Absent' : 'Mark Present'}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Paper>
            )}

            {/* New Session Dialog */}
            <Dialog open={showNewSession} onClose={() => setShowNewSession(false)} PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
                <DialogTitle fontWeight={700}>Create New Attendance Session</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Session Name (e.g. Lecture 1 - Oct 24)"
                        value={newSession}
                        onChange={e => setNewSession(e.target.value)}
                        sx={{ mt: 1 }}
                        autoFocus
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setShowNewSession(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
                    <Button variant="contained" onClick={createSession} sx={{ textTransform: 'none', borderRadius: 2 }}>
                        Create Session
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Toast Snackbar */}
            <Snackbar
                open={toast.open}
                autoHideDuration={3000}
                onClose={() => setToast(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setToast(prev => ({ ...prev, open: false }))}
                    severity={toast.severity}
                    variant="filled"
                    sx={{ width: '100%', borderRadius: 2, fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                >
                    {toast.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
