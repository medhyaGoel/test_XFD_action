import React, { useCallback, useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Subnav } from 'components';
import { useAuthContext } from 'context';
import { OSSProject } from 'types/oss';
import { Box, Stack } from '@mui/system';
import { Alert, Button, IconButton, Paper, TextField, MenuItem } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DataGrid, GridColDef, GridRenderCellParams, GridToolbarContainer } from '@mui/x-data-grid';
import CustomToolbar from 'components/DataGrid/CustomToolbar';
import { differenceInCalendarDays, parseISO } from 'date-fns';

const PAGE_SIZE = 15;

const OSS: React.FC = () => {
  const { showAllOrganizations } = useAuthContext();
  const [ossProjects, setOSSProjects] = useState<OSSProject[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const history = useHistory();

  useEffect(() => {
    const fetchOSSProjects = async () => {
      // Fetch projects from  API and update the state
      // Dummy data for illustration
      const projects = [
        {
          id: '1',
          name: 'Project A',
          description: 'Description A',
          updatedAt: '2022-07-01',
          createdAt: '2021-07-01',
          status: 'Active',
        },
      ];
      setOSSProjects(projects);
      setTotalResults(projects.length); // assuming the API returns an array
    };

    fetchOSSProjects();
  }, [showAllOrganizations]);

  const ossProjectRows = ossProjects.map((project: OSSProject) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    updatedAt: `${differenceInCalendarDays(
      new Date(),
      parseISO(project.updatedAt)
    )} days ago`,
    createdAt: `${differenceInCalendarDays(
      new Date(),
      parseISO(project.createdAt)
    )} days ago`,
    status: project.status,
  }));

  const ossProjectCols: GridColDef[] = [
    { field: 'name', headerName: 'Name', minWidth: 100, flex: 1.5 },
    { field: 'description', headerName: 'Description', minWidth: 150, flex: 3 },
    { field: 'updatedAt', headerName: 'Updated At', minWidth: 100, flex: 1 },
    { field: 'createdAt', headerName: 'Created At', minWidth: 100, flex: 1 },
    { field: 'status', headerName: 'Status', minWidth: 100, flex: 1 },
    {
      field: 'view',
      headerName: 'Details',
      minWidth: 100,
      flex: 0.5,
      renderCell: (cellValues: GridRenderCellParams) => {
        return (
          <IconButton
            aria-label={`View details for ${cellValues.row.name}`}
            tabIndex={cellValues.tabIndex}
            color="primary"
            onClick={() => history.push('/inventory/oss/' + cellValues.row.id)}
          >
            <OpenInNewIcon />
          </IconButton>
        );
      },
    },
  ];

  const resetOSSProjects = () => {
    setOSSProjects([]);
  };

  return (
    <div>
      <Subnav
        items={[
          { title: 'Search Results', path: '/inventory', exact: true },
          { title: 'All Domains', path: '/inventory/domains' },
          { title: 'All Vulnerabilities', path: '/inventory/vulnerabilities' },
          { title: 'All OSS Projects', path: '/inventory/oss-projects' },
        ]}
      ></Subnav>

      <br></br>

      <Box sx={{width: '95%', display: 'flex', justifyContent: 'flex-end' }}>
        <Button
        aria-label="Create new project"
        color="primary"
        variant="contained"
        onClick={() => history.push('/inventory/oss/create-new')}
        >
        Create new project
        </Button>
      </Box>

      <Box mb={3} mt={3} display="flex" justifyContent="center">
        {ossProjectRows.length === 0 ? (
          <Stack direction="row" spacing={2}>
            <Paper elevation={2}>
              <Alert severity="warning"> Unable to load OSS projects.</Alert>
            </Paper>
            <Button
              onClick={resetOSSProjects}
              variant="contained"
              color="primary"
              sx={{ width: 'fit-content' }}
            >
              Retry
            </Button>
          </Stack>
        ) : (
          <Paper elevation={2} sx={{ width: '90%' }}>
            <DataGrid
              rows={ossProjectRows}
              rowCount={totalResults}
              columns={ossProjectCols}
              slots={{ toolbar: CustomToolbar }}
            />
          </Paper>
        )}
      </Box>

    </div>
  );
};

export default OSS;