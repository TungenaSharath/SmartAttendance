import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';

export default function SplashLoader({ onComplete }) {
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        const timer1 = setTimeout(() => {
            setExiting(true);
        }, 700);

        const timer2 = setTimeout(() => {
            if (onComplete) onComplete();
        }, 1100);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [onComplete]);

    return (
        <Box sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            bgcolor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'opacity 0.4s cubic-bezier(0.25, 0.1, 0.25, 1.0)',
            opacity: exiting ? 0 : 1,
            pointerEvents: exiting ? 'none' : 'auto',
        }}>
            <Typography variant="h5" fontWeight={700} sx={{
                letterSpacing: '-0.03em',
                color: '#1d1d1f',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                animation: 'applePulse 0.9s cubic-bezier(0.25, 0.1, 0.25, 1.0) infinite alternate',
                '@keyframes applePulse': {
                    '0%': { opacity: 0.4 },
                    '100%': { opacity: 1 }
                }
            }}>
                SmartAttendance
            </Typography>
        </Box>
    );
}
