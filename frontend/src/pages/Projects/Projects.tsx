import React, { useCallback, useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Subnav } from 'components';
import { useAuthContext } from 'context';
import { project } from 'types/oss';
import { Box, Stack } from '@mui/system';
import { Alert, Button, IconButton, Paper, TextField, MenuItem } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DataGrid, GridColDef, GridRenderCellParams, GridToolbarContainer } from '@mui/x-data-grid';
import CustomToolbar from 'components/DataGrid/CustomToolbar';
import { differenceInCalendarDays, parseISO } from 'date-fns';

const PAGE_SIZE = 15;

const Projects: React.FC = () => {
  const { currentOrganization, apiPost, apiPut, showAllOrganizations } =
  useAuthContext();
  const [projects, setProjects] = useState<project[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const history = useHistory();

  useEffect(() => {
    /*
    const updateProject = useCallback(
      async (index: number, body: { [key: string]: string }) => {
        try {
          const res = await apiPut<project>(
            '/project/' + projects[index].id,
            {
              body: body
            }
          );
          const projCopy = [...projects];
          projCopy[index] = res; // Should we be able to change all features of project from here?
          setProjects(projCopy);
        } catch (e) {
          console.error(e);
        }
      },
      [projects, apiPut, setProjects]
    );
    */

    const fetchProjects = async () => {
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
          hipcheck: '12',
        },
      ];
      setProjects(projects);
      setTotalResults(projects.length); // assuming the API returns an array
    };

    fetchProjects();
  }, [showAllOrganizations]);

  const projectRows = projects.map((project: project) => ({
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
    hipcheck: project.hipcheck,
  }));

  const projectCols: GridColDef[] = [
    { field: 'name', headerName: 'Name', minWidth: 100, flex: 1.5 },
    { field: 'description', headerName: 'Description', minWidth: 150, flex: 3 },
    { field: 'updatedAt', headerName: 'Updated At', minWidth: 100, flex: 1 },
    { field: 'createdAt', headerName: 'Created At', minWidth: 100, flex: 1 },
    { field: 'status', headerName: 'Status', minWidth: 100, flex: 1 },
    { field: 'hipcheck', headerName: 'Hipcheck Score', minWidth: 100, flex: 1},
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
            onClick={() => history.push('/inventory/project/' + cellValues.row.id)}
          >
            <OpenInNewIcon />
          </IconButton>
        );
      },
    },
  ];

  const resetProjects = () => {
    setProjects([]);
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

      <Box mb={3} mt={3} display="flex" justifyContent="center">
        {projectRows.length === 0 ? (
          <Stack direction="row" spacing={2}>
            <Paper elevation={2}>
              <Alert severity="warning"> Unable to load OSS projects.</Alert>
            </Paper>
            <Button
              onClick={resetProjects}
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
              rows={projectRows}
              rowCount={totalResults}
              columns={projectCols}
              slots={{ toolbar: CustomToolbar }}
            />
          </Paper>
        )}
      </Box>

      <Box sx={{width: '95%', display: 'flex', justifyContent: 'flex-end' }}>
        <Button
        aria-label="Create new project"
        color="primary"
        variant="contained"
        onClick={() => history.push('/inventory/create-project')}
        >
        Create new project
        </Button>
      </Box>

    </div>
  );
};

export default Projects;