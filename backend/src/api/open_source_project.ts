import {
  IsString,
  isUUID,
  IsArray,
  IsBoolean,
  IsUUID,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsEnum
} from 'class-validator';
import {
  Organization,
  OpenSourceProject,
  connectToDatabase,
  Role,
  ScanTask,
  Scan,
  User,
  OrganizationTag,
  PendingDomain
} from '../models';
import {
  validateBody,
  wrapHandler,
  NotFound,
  REGION_STATE_MAP,
  Unauthorized
} from './helpers';
import {
  isOrgAdmin,
  isGlobalWriteAdmin,
  isRegionalAdmin,
  isRegionalAdminForOrganization,
  getOrgMemberships,
  isGlobalViewAdmin
} from './auth';
import { In } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { randomBytes } from 'crypto';
import { promises } from 'dns';

/**
 * @swagger
 *
 * /project/del/{projectId}/{orgId}:
 *  delete:
 *    description: Disconnect a particular open source project from a given organization.
 *    parameters:
 *      - in: path
 *        name: id
 *        description: Organization id
 *    tags:
 *    - Organizations
 */
export const del = wrapHandler(async (event) => {
  const id = event.pathParameters?.organizationId;
  const projectId = event.pathParameters?.projectId;

  if (!id || !isUUID(id) || !projectId || !isUUID(projectId)) {
    return NotFound;
  }

  if (!isGlobalWriteAdmin(event) && !getOrgMemberships(event).includes(id)) return Unauthorized;

  await connectToDatabase();

  try {
    const organization = await Organization.findOne(id, { relations: ['openSourceProjects'] });
    if (!organization) {
      return NotFound;
    }

    const openSourceProject = organization.openSourceProjects.find(proj => proj.id === projectId);
    if (!openSourceProject) {
      return NotFound;
    }
    const orgIds = openSourceProject.organizations.map(org => org.id);

    if (orgIds.length > 1) {
      // Disconnect the open source project from the organization
      organization.openSourceProjects = organization.openSourceProjects.filter(proj => proj.id !== projectId);
      await organization.save();

      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Project disconnected successfully' }),
      };
    } else {
      // delete the project
      await openSourceProject.remove();

      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Project deleted successfully' }),
      };
    }

  } catch (error) {
    return {
      statusCode: 404,
      body: JSON.stringify(error)
    };
  }
});




/**
 * @swagger
 *
 * /project/grabInfo/{projectId}:
 *  get:
 *    description: Get information about a particular open source project.
 *    parameters:
 *      - in: path
 *        name: projectId
 *        description: Open Source Project ID
 *    tags:
 *    - OpenSourceProjects
 */
export const getById = wrapHandler(async (event) => {
  const id = event.pathParameters?.projectId;
  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Project ID is required' }),
    };
  }
 
  await connectToDatabase();

  const project = await OpenSourceProject.findOne(id, {
    relations: ['organizations'],
  });

  if (!project) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Project not found' }),
    };
  }
 
  // retrieve associated orgid(s)
  const orgIds = project.organizations.map(org => org.id);
  const userOrgs = getOrgMemberships(event);
  
  if (!isGlobalViewAdmin(event) && !isGlobalWriteAdmin(event) && !userOrgs.some(userId => orgIds.includes(userId))) return Unauthorized;
  
  return {
    
    statusCode: 200,
    body: JSON.stringify(project),
  };
});


/**
 * @swagger
 *
 * /project/listOrgs/{orgId}:
 *  list:
 *    description: List open source projects for given organization.
 *    parameters:
 *      - in: path
 *        name: orgId
 *        required: true
 *        description: Organization ID
 *    tags:
 *    - Organizations
 */
export const listByOrg = wrapHandler(async (event) => {
  const orgId = event.pathParameters?.orgId;
  // check permissions
  if (!orgId || (!isGlobalViewAdmin(event) && !isGlobalWriteAdmin(event) && !getOrgMemberships(event).includes(orgId))) return Unauthorized;
  await connectToDatabase();
  const organization = await Organization.findOne({
    where: { id: orgId },
    relations: ['openSourceProjects']
  });

  if (organization) {
    return {
      statusCode: 200,
      body: JSON.stringify(organization.openSourceProjects)
    };
  }
  return NotFound;
});



/**
 * @swagger
 *
 * /project_upsert/org/{orgId}:
 *  create:
 *    description: Create a new open source project without an organization if it doesn't already exist and add it to a given organization.
 *    tags:
 *    - Organizations
 */
export const create_proj = wrapHandler(async (event) => {
  const orgId = event.pathParameters?.orgId;
  const parsedBody = JSON.parse(event.body ?? '{}');
  const { url, hipcheckResults, organizations } = parsedBody;

  // check permissions
  if (!orgId || (!isGlobalWriteAdmin(event) && !getOrgMemberships(event).includes(orgId))) return Unauthorized;
  
  // const body = await validateBody(OpenSourceProject, event.body);
  await connectToDatabase();

  let openSourceProject: OpenSourceProject | undefined;

  // Check if there's an existing open source project without an organization
  const existingProjects = await OpenSourceProject.createQueryBuilder('osp')
    .leftJoinAndSelect('osp.organizations', 'organizations')
    .where('organizations.id IS NULL')
    .getMany();

  if (existingProjects.length > 0) {
    // Use the first found project without organization
    openSourceProject = existingProjects[0];
  } else {
    // Create a new open source project
    openSourceProject = await OpenSourceProject.create({
      // Set other properties as needed
      url: url,
      hipcheckResults: hipcheckResults    
    });
    await openSourceProject.save();
  }

  if (!openSourceProject.organizations) {
    openSourceProject.organizations = [];
  }

  // Associate the open source project with the specified organization
  const organization = await Organization.findOneOrFail(orgId);
  if (!openSourceProject.organizations.find(org => org.id === organization.id)) {
    openSourceProject.organizations.push(organization);
    await openSourceProject.save();
  }

  return {
    statusCode: 201,
    body: JSON.stringify(openSourceProject),
  };
});
