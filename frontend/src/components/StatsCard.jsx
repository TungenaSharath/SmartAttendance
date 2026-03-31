import { Paper, Typography, Box } from '@mui/material';

export default function StatsCard({ title, value, subtitle, icon, color = '#1976d2', gradient }) {
    return (
        <Paper
            elevation={0}
            sx={{
                p: 2.5,
                borderRadius: 3,
                background: gradient || `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
                border: `1px solid ${color}20`,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 4px 12px ${color}20` },
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        {title}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5, color }}>
                        {value}
                    </Typography>
                    {subtitle && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>
                {icon && (
                    <Box sx={{
                        p: 1.5, borderRadius: 2, bgcolor: `${color}15`,
                        color, display: 'flex', alignItems: 'center',
                    }}>
                        {icon}
                    </Box>
                )}
            </Box>
        </Paper>
    );
}
