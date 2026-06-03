import { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, Paper, Button, Select, MenuItem, FormControl,
    InputLabel, Alert, Table, TableHead, TableRow, TableCell, TableBody,
    Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    CircularProgress, IconButton
} from '@mui/material';
import { CameraAlt, Upload, Add, PhotoCamera } from '@mui/icons-material';
import { subjectsAPI, sessionsAPI, attendanceAPI, studentsAPI } from '../../api';

export default function MarkAttendance() {
    const [subjects, setSubjects] = useState([]);
    const [selSubject, setSelSubject] = useState('');
    const [sessions, setSessions] = useState([]);
    const [selSession, setSelSession] = useState('');
    const [attendance, setAttendance] = useState([]);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [newSession, setNewSession] = useState('');
    const [showNewSession, setShowNewSession] = useState(false);
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);

    useEffect(() => {
        subjectsAPI.list().then(r => setSubjects(r.data)).catch(() => { });
    }, []);

    useEffect(() => {
        if (selSubject) {
            sessionsAPI.list(selSubject).then(r => setSessions(r.data)).catch(() => { });
        }
    }, [selSubject]);

    useEffect(() => {
        if (selSession) {
            attendanceAPI.get(selSession).then(r => setAttendance(r.data)).catch(() => { });
        }
    }, [selSession]);

    const startCamera = async () => {
        setError('');
        try {
            const s = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 } }
            });
            setStream(s);
            setCameraActive(true);
        } catch (e) {
            setError('Camera access denied');
        }
    };

    useEffect(() => {
        if (cameraActive && stream && videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.error(e));
        }
    }, [cameraActive, stream]);

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
        }
        setStream(null);
        setCameraActive(false);
    };

    const captureAndMark = async () => {
        if (!selSession) return setError('Select a session first');
        setLoading(true);
        setError('');
        try {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
            const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.92));
            const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
            const res = await attendanceAPI.mark(selSession, file);
            setResult(res.data);
            attendanceAPI.get(selSession).then(r => setAttendance(r.data));
        } catch (e) {
            setError(e.response?.data?.detail || 'Failed to process');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !selSession) return;
        setLoading(true);
        setError('');
        try {
            const res = await attendanceAPI.mark(selSession, file);
            setResult(res.data);
            attendanceAPI.get(selSession).then(r => setAttendance(r.data));
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed');
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
        } catch (e) {
            setError(e.response?.data?.detail || 'Failed');
        }
    };

    const handleManualMark = async (studentId, currentStatus) => {
        if (!selSession) return;
        const newStatus = currentStatus === 'Present' ? 'Absent' : 'Present';
        try {
            await attendanceAPI.update(selSession, studentId, newStatus);
            // Refresh to update local state
            const r = await attendanceAPI.get(selSession);
            setAttendance(r.data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to update attendance');
        }
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>Mark Attendance</Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            {/* Controls */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #eee', mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <FormControl sx={{ minWidth: 200 }}>
                        <InputLabel>Subject</InputLabel>
                        <Select value={selSubject} label="Subject"
                            onChange={e => { setSelSubject(e.target.value); setSelSession(''); }}>
                            {subjects.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                        </Select>
                    </FormControl>

                    <FormControl sx={{ minWidth: 200 }}>
                        <InputLabel>Session</InputLabel>
                        <Select value={selSession} label="Session"
                            onChange={e => setSelSession(e.target.value)} disabled={!selSubject}>
                            {sessions.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                        </Select>
                    </FormControl>

                    <Button variant="outlined" startIcon={<Add />}
                        onClick={() => setShowNewSession(true)} disabled={!selSubject}>
                        New Session
                    </Button>
                </Box>
            </Paper>

            {/* Camera / Upload */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #eee', mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Button variant="contained" startIcon={<CameraAlt />}
                        onClick={cameraActive ? stopCamera : startCamera}>
                        {cameraActive ? 'Stop Camera' : 'Start Camera'}
                    </Button>
                    {cameraActive && (
                        <Button variant="contained" color="success" startIcon={<PhotoCamera />}
                            onClick={captureAndMark} disabled={loading || !selSession}>
                            {loading ? <CircularProgress size={20} color="inherit" /> : 'Capture & Mark'}
                        </Button>
                    )}
                    <Button variant="outlined" component="label" startIcon={<Upload />} disabled={!selSession || loading}>
                        Upload Image
                        <input type="file" hidden accept="image/*" capture="environment"
                            onChange={handleFileUpload} />
                    </Button>
                </Box>

                {cameraActive && (
                    <Box sx={{ borderRadius: 2, overflow: 'hidden', maxWidth: 640, border: '2px solid #1976d2' }}>
                        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', display: 'block' }} />
                    </Box>
                )}

                {result?.annotated_image && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Result: {result.marked?.length || 0} marked, {result.unknown_count} unknown
                        </Typography>
                        <img src={`data:image/jpeg;base64,${result.annotated_image}`}
                            alt="Result" style={{ maxWidth: '100%', borderRadius: 8 }} />
                    </Box>
                )}
            </Paper>

            {/* Attendance Table */}
            {attendance.length > 0 && (
                <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #eee', overflow: 'hidden' }}>
                    <Box sx={{ p: 2 }}>
                        <Typography variant="h6" fontWeight={600}>Attendance List</Typography>
                    </Box>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                <TableCell>Name</TableCell>
                                <TableCell>Roll No</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Confidence</TableCell>
                                <TableCell>Method</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {attendance.map((a) => (
                                <TableRow key={a.id} hover>
                                    <TableCell>{a.name}</TableCell>
                                    <TableCell>{a.student_code}</TableCell>
                                    <TableCell>
                                        <Chip label={a.status} size="small"
                                            color={a.status === 'Present' ? 'success' : 'default'} />
                                    </TableCell>
                                    <TableCell>{(a.confidence * 100).toFixed(1)}%</TableCell>
                                    <TableCell><Chip label={a.method} size="small" variant="outlined" /></TableCell>
                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            variant={a.status === 'Present' ? "outlined" : "contained"}
                                            color={a.status === 'Present' ? "warning" : "success"}
                                            onClick={() => handleManualMark(a.student_id, a.status)}
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
            <Dialog open={showNewSession} onClose={() => setShowNewSession(false)}>
                <DialogTitle>Create New Session</DialogTitle>
                <DialogContent>
                    <TextField fullWidth label="Session Name" value={newSession}
                        onChange={e => setNewSession(e.target.value)} sx={{ mt: 1 }} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowNewSession(false)}>Cancel</Button>
                    <Button variant="contained" onClick={createSession}>Create</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
