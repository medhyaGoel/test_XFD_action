import { Organization } from './organization';

export interface Project {
    id: string;
    url: string; 
    name: string;
    createdAt: Date;
    updatedAt: Date;
    hipcheck: string; // This should be an object. 
    organizations: Organization[];
  }