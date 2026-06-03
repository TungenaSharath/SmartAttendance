import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, TextField, Button, Alert, CircularProgress } from '@mui/material';
import { Save, LocationOn } from '@mui/icons-material';
import { adminAPI } from '../../api';

export default function SystemSettings() {
    const [settings, setSettings] = useState({
        campus_lat: '17.3916',
        campus_lng: '78.3190',
        campus_radius: '500'
    });
    const [loading, setLoading] = useState(false);
    const [fetchingLocation, setFetchingLocation] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        adminAPI.systemMetrics() // Need a specific settings api call, actually wait we built it!
            .catch(() => {});
        adminAPI.getSettings().then(res => {
            if(res.data) setSettings(res.data);
        }).catch(() => {});
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');
        try {
            await adminAPI.updateSettings(settings);
            setMessage('Settings updated successfully!');
        } catch (err) {
            setError('Failed to update settings');
        } finally {
            setLoading(false);
        }
    };

    const handleGetCurrentLocation = () => {
        setFetchingLocation(true);
        setError('');
        setMessage('');
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            setFetchingLocation(false);
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setSettings({
                    ...settings,
                    campus_lat: pos.coords.latitude.toString(),
                    campus_lng: pos.coords.longitude.toString()
                });
                setFetchingLocation(false);
                setMessage('Successfully fetched current location.');
            },
            (err) => {
                setError('Could not get current location: ' + err.message);
                setFetchingLocation(false);
            },
            { enableHighAccuracy: true }
        );
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>System Settings</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Configure global system parameters including Geofencing.
            </Typography>

            {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #eee', maxWidth: 800 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                    Campus Geofence Configuration
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Staff checking in must fall within the specified radius (in meters) of this Campus coordinate.
                </Typography>
                <form onSubmit={handleSave}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth label="Campus Latitude" variant="outlined"
                                value={settings.campus_lat}
                                onChange={e => setSettings({ ...settings, campus_lat: e.target.value })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth label="Campus Longitude" variant="outlined"
                                value={settings.campus_lng}
                                onChange={e => setSettings({ ...settings, campus_lng: e.target.value })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Button 
                                variant="outlined" 
                                onClick={handleGetCurrentLocation}
                                disabled={fetchingLocation}
                                startIcon={fetchingLocation ? <CircularProgress size={20} /> : <LocationOn />}
                            >
                                {fetchingLocation ? 'Fetching Location...' : 'Use My Current Location'}
                            </Button>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth label="Allowed Radius (Meters)" variant="outlined" type="number"
                                value={settings.campus_radius}
                                onChange={e => setSettings({ ...settings, campus_radius: e.target.value })}
                                required
                                inputProps={{ min: "10" }}
                            />
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 4, textAlign: 'right' }}>
                        <Button 
                            type="submit" 
                            variant="contained" 
                            disabled={loading} 
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />}
                            sx={{ px: 4, py: 1 }}
                        >
                            {loading ? 'Saving...' : 'Save Settings'}
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Box>
    );
}
