import React, { useState, ChangeEvent } from 'react';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import {
  Box,
  Paper,
  Alert,
  TextField,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { useAuthContext } from 'context';

export interface ProjectFormData {
  url: string;
  orgNames: string[];
}

interface ProjectCreateProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => void;
}

const ProjectCreate: React.FC<ProjectCreateProps> = ({
  open,
  onClose,
  onSubmit
}) => {
  const { currentOrganization } = useAuthContext();
  const [formData, setFormData] = useState<ProjectFormData>({
    url: '',
    orgNames: currentOrganization ? [currentOrganization.name] : ['']
  });
  const [errorMessage] = useState<string | null>(null);

  // Handle change in user input.
  const handleChange = (e: ChangeEvent<HTMLInputElement>, index?: number) => {
    const { name, value } = e.target;
    if (name === 'orgName' && index !== undefined) {
      // Update the specific index in the orgNames array
      const newOrgNames = [...formData.orgNames];
      newOrgNames[index] = value;
      setFormData((prev) => ({
        ...prev,
        orgNames: newOrgNames
      }));
    } else if (name === 'url') {
      // Handling for URL
      setFormData({
        ...formData,
        url: value
      });
    }
  };

  // Handling for adding organizations.
  const handleAddOrgName = () => {
    setFormData((prev) => ({
      ...prev,
      orgNames: [...prev.orgNames, '']
    }));
  };

  // Handling for removing organizations.
  const handleRemoveOrgName = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      orgNames: prev.orgNames.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Create new modal dialog.
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Create New Project</DialogTitle>
      <DialogContent>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <Box
          component="form"
          sx={{ '& .MuiTextField-root': { m: 1, width: '25ch' } }}
          noValidate
          autoComplete="off"
          onSubmit={handleSubmit}
        >
          <Paper elevation={3} sx={{ padding: 2, margin: 2 }}>
            <TextField
              required
              name="url"
              label="URL"
              value={formData.url}
              onChange={handleChange}
            />
            {formData.orgNames.map((orgName, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                <TextField
                  required
                  name="orgName"
                  label={`Organization ${index + 1}`}
                  value={orgName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleChange(e, index)
                  }
                />
                <IconButton onClick={handleAddOrgName} color="primary">
                  <AddCircleIcon />
                </IconButton>
                {formData.orgNames.length > 1 && (
                  <IconButton
                    onClick={() => handleRemoveOrgName(index)}
                    color="secondary"
                  >
                    <RemoveCircleIcon />
                  </IconButton>
                )}
              </Box>
            ))}
            <Button variant="contained" type="submit" sx={{ mt: 2 }}>
              Submit
            </Button>
          </Paper>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProjectCreate;
