import { Box } from '@mui/material';

export default function PageTransition({ children }) {
    return (
        <Box sx={{
            animation: 'tubikFadeIn 0.45s cubic-bezier(0.25, 0.1, 0.25, 1.0) forwards',
            '@keyframes tubikFadeIn': {
                '0%': {
                    opacity: 0,
                    transform: 'translateY(12px) scale(0.995)'
                },
                '100%': {
                    opacity: 1,
                    transform: 'translateY(0) scale(1)'
                }
            }
        }}>
            {children}
        </Box>
    );
}
