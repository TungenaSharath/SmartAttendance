import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';

export default function SplashLoader({ onComplete }) {
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        const timer1 = setTimeout(() => {
            setExiting(true);
        }, 1400);

        const timer2 = setTimeout(() => {
            if (onComplete) onComplete();
        }, 2000);

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
            bgcolor: '#090d16',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            transition: 'transform 0.8s cubic-bezier(0.77, 0, 0.175, 1), opacity 0.6s ease',
            transform: exiting ? 'translateY(-100%)' : 'translateY(0%)',
            opacity: exiting ? 0 : 1,
            pointerEvents: exiting ? 'none' : 'auto',
            overflow: 'hidden'
        }}>
            {/* Tubik Ambient Radial Light */}
            <Box sx={{
                position: 'absolute',
                width: 500,
                height: 500,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, rgba(168, 85, 247, 0.05) 50%, transparent 70%)',
                filter: 'blur(60px)',
                animation: 'pulse 3s infinite ease-in-out'
            }} />

            {/* Tubik Minimalist Animated Logo Ring */}
            <Box sx={{
                position: 'relative',
                width: 72,
                height: 72,
                mb: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Box sx={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: '2px solid rgba(56, 189, 248, 0.2)',
                    borderTopColor: '#38bdf8',
                    borderRightColor: '#a855f7',
                    animation: 'spin 1.2s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite'
                }} />
                <Box sx={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    bgcolor: '#0071e3',
                    boxShadow: '0 0 15px #0071e3'
                }} />
            </Box>

            {/* Typography Reveal */}
            <Typography variant="h5" fontWeight={800} sx={{
                letterSpacing: '-0.03em',
                color: '#ffffff',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                mb: 1
            }}>
                SmartAttendance
            </Typography>

            <Typography variant="caption" sx={{
                color: '#86868b',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                fontSize: 11,
                fontWeight: 600
            }}>
                AI Vision Platform
            </Typography>

            {/* Progress Line */}
            <Box sx={{
                width: 140,
                height: 2,
                bgcolor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: 1,
                mt: 4,
                overflow: 'hidden',
                position: 'relative'
            }}>
                <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: '100%',
                    background: 'linear-gradient(90deg, #38bdf8 0%, #a855f7 100%)',
                    animation: 'loadProgress 1.4s ease-in-out forwards'
                }} />
            </Box>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes loadProgress {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(0%); }
                }
            `}</style>
        </Box>
    );
}
