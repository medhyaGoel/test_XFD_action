
import React from 'react';
import { Box, TextField, Button, Paper } from '@mui/material';

export const Project: React.FC = () => {
  const handleSubmit = () => {
    // form submission logic
  };

  return (
    <Box sx={{ padding: 2 }}>
      <Paper elevation={3} sx={{ padding: 2 }}>
        <h1>Create New OSS Project</h1>
      </Paper>
    </Box>
  );
};
