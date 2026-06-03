import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Button, FormControl, InputLabel, Select, MenuItem,
    TextField, Alert, CircularProgress, Grid, Table, TableHead, TableRow, TableCell, TableBody,
    IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { People, PersonAdd, Delete, Edit } from '@mui/icons-material';
import { subjectsAPI, studentsAPI } from '../../api';

export default function Students() {
    const [subjects, setSubjects] = useState([]);
    const [selSubject, setSelSubject] = useState('');
    const [students, setStudents] = useState([]);
    
    // UI states
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showAdd, setShowAdd] = useState(false);

    // Form states
    const [formData, setFormData] = useState({ name: '', roll_number: '' });
    const [files, setFiles] = useState([]);
    const [editMode, setEditMode] = useState(null);
    const [editData, setEditData] = useState({ name: '', roll_number: '' });

    useEffect(() => {
        subjectsAPI.list()
            .then(r => setSubjects(r.data))
            .catch(() => setError('Failed to load subjects'))
            .finally(() => setPageLoading(false));
    }, []);

    useEffect(() => {
        if (selSubject) {
            setPageLoading(true);
            studentsAPI.list(selSubject)
                .then(r => setStudents(r.data))
                .catch(() => setError('Failed to load students'))
                .finally(() => setPageLoading(false));
        } else {
            setStudents([]);
        }
    }, [selSubject]);

    const handleFileChange = (e) => {
        const selected = Array.from(e.target.files);
        if (selected.length < 5 || selected.length > 15) {
            setError('Please select between 5 and 15 face images.');
            setFiles([]);
        } else {
            setError('');
            setFiles(selected);
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        if (!selSubject) return setError('Please select a subject first.');
        if (files.length < 5 || files.length > 15) return setError('Please select between 5 and 15 images.');

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('roll_number', formData.roll_number);
            files.forEach(f => data.append('images', f));

            await studentsAPI.add(selSubject, data);
            
            setSuccess('Student added and face embeddings generated successfully!');
            setShowAdd(false);
            setFormData({ name: '', roll_number: '' });
            setFiles([]);
            
            // Refresh list
            const r = await studentsAPI.list(selSubject);
            setStudents(r.data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to add student');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (studentId) => {
        if (!window.confirm('Delete this student? This will remove their attendance records.')) return;
        try {
            await studentsAPI.delete(selSubject, studentId);
            setStudents(prev => prev.filter(s => s.id !== studentId));
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to delete student');
        }
    };

    const handleEditStudent = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await studentsAPI.edit(selSubject, editMode.id, editData);
            setSuccess('Student updated successfully!');
            setStudents(prev => prev.map(s => s.id === editMode.id ? { ...s, name: editData.name, roll_number: editData.roll_number } : s));
            setEditMode(null);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to update student');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" fontWeight={700}>Manage Students</Typography>
                <Button 
                    variant="contained" 
                    startIcon={<PersonAdd />} 
                    disabled={!selSubject}
                    onClick={() => setShowAdd(true)}
                >
                    Register Student
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #eee', mb: 3 }}>
                <FormControl sx={{ minWidth: 250 }}>
                    <InputLabel>Select Subject</InputLabel>
                    <Select 
                        value={selSubject} 
                        label="Select Subject"
                        onChange={e => setSelSubject(e.target.value)}
                    >
                        {subjects.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                    </Select>
                </FormControl>
            </Paper>

            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #eee', overflow: 'hidden' }}>
                {pageLoading ? (
                    <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
                        <CircularProgress />
                    </Box>
                ) : !selSubject ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Typography color="text.secondary">Select a subject to view enrolled students.</Typography>
                    </Box>
                ) : students.length === 0 ? (
                    <Box sx={{ p: 5, textAlign: 'center' }}>
                        <People sx={{ fontSize: 60, color: '#e0e0e0', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">No students enrolled</Typography>
                        <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setShowAdd(true)}>
                            Register First Student
                        </Button>
                    </Box>
                ) : (
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                <TableCell>Name</TableCell>
                                <TableCell>Roll Number</TableCell>
                                <TableCell>Enrolled Date</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {students.map((student) => (
                                <TableRow key={student.id} hover>
                                    <TableCell fontWeight={500}>{student.name}</TableCell>
                                    <TableCell><Chip label={student.roll_number} size="small" variant="outlined" /></TableCell>
                                    <TableCell>{new Date(student.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell align="right">
                                        <IconButton color="primary" onClick={() => {
                                            setEditMode(student);
                                            setEditData({ name: student.name, roll_number: student.roll_number });
                                        }} size="small">
                                            <Edit />
                                        </IconButton>
                                        <IconButton color="error" onClick={() => handleDelete(student.id)} size="small">
                                            <Delete />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Paper>

            <Dialog open={showAdd} onClose={() => !loading && setShowAdd(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Register New Student</DialogTitle>
                <form onSubmit={handleAddStudent}>
                    <DialogContent dividers>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Enter student details and upload 5 to 15 clear pictures of their face for the AI recognition model to train on.
                        </Typography>
                        
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField 
                                    fullWidth label="Full Name" required 
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField 
                                    fullWidth label="Roll Number" required 
                                    value={formData.roll_number}
                                    onChange={e => setFormData({ ...formData, roll_number: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Button 
                                    variant="outlined" 
                                    component="label" 
                                    fullWidth 
                                    sx={{ py: 1.5, borderStyle: 'dashed', borderWidth: 2 }}
                                >
                                    {files.length > 0 ? `${files.length} Face Images Selected` : 'Select 5-15 Face Images (Required)'}
                                    <input 
                                        type="file" 
                                        hidden 
                                        multiple 
                                        accept="image/*" 
                                        onChange={handleFileChange} 
                                    />
                                </Button>
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setShowAdd(false)} disabled={loading}>Cancel</Button>
                        <Button 
                            type="submit" 
                            variant="contained" 
                            disabled={loading || files.length < 5 || files.length > 15}
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PersonAdd />}
                        >
                            {loading ? 'Processing Faces...' : 'Register Student'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            <Dialog open={!!editMode} onClose={() => !loading && setEditMode(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Student</DialogTitle>
                <form onSubmit={handleEditStudent}>
                    <DialogContent dividers>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField 
                                    fullWidth label="Full Name" required 
                                    value={editData.name}
                                    onChange={e => setEditData({ ...editData, name: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField 
                                    fullWidth label="Roll Number" required 
                                    value={editData.roll_number}
                                    onChange={e => setEditData({ ...editData, roll_number: e.target.value })}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setEditMode(null)} disabled={loading}>Cancel</Button>
                        <Button 
                            type="submit" 
                            variant="contained" 
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
}
