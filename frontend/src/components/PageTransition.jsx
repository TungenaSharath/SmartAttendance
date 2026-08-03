import { Box } from '@mui/material';

export default function PageTransition({ children }) {
    return (
        <Box sx={{
            animation: 'appleFadeIn 0.25s cubic-bezier(0.25, 0.1, 0.25, 1.0) forwards',
            '@keyframes appleFadeIn': {
                '0%': { opacity: 0 },
                '100%': { opacity: 1 }
            }
        }}>
            {children}
        </Box>
    );
}
