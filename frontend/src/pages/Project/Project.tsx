import { Box, Paper } from '@mui/material';
import React from 'react';
// import { XpanseSection } from './XpanseSection';

export const Project: React.FC = () => {
  return (
    <Box sx={{ padding: 2 }}>
      <Paper elevation={3} sx={{ padding: 2 }}>
        <h1>Welcome to the project page!</h1>
      </Paper>
    </Box>
  );
};
