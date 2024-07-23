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
 * /projects/{projectId}:
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
  // parse inputs
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'orgId in request body is required' })
    };
  }
  const { id } = JSON.parse(event.body);
  const projectId = event.pathParameters?.projectId;

  // validate permissions
  if (!id || !projectId) {
    return NotFound;
  }
  if (!isGlobalWriteAdmin(event) && !getOrgMemberships(event).includes(id))
    return Unauthorized;

  await connectToDatabase();

  try {
    // find org and load its openSourceProjects
    const organization = await Organization.findOne(id, {
      relations: ['openSourceProjects']
    });
    if (!organization) {
      return NotFound;
    }

    // find project and load its organizations
    const openSourceProjectWithOrganizations = await OpenSourceProject.findOne({
      where: { id: projectId },
      relations: ['organizations']
    });
    if (!openSourceProjectWithOrganizations) {
      return NotFound;
    }

  // If project is associated with multiple organizations...
    if (openSourceProjectWithOrganizations.organizations.length > 1) {
      // remove project from organization's projects
      organization.openSourceProjects = organization.openSourceProjects.filter(
        (proj) => proj.id !== projectId
      );
      await organization.save();
      // remove organization from project's organizations
      openSourceProjectWithOrganizations.organizations = openSourceProjectWithOrganizations.organizations.filter(
        (org) => org.id !== id
      );
      await openSourceProjectWithOrganizations.save();
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Project disconnected successfully' })
      };
    } else {
    // Delete the project if no other organization memberships
      await openSourceProjectWithOrganizations.remove();
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Project deleted successfully' })
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
 * /projects/{projectId}:
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
      body: JSON.stringify({ error: 'Project ID is required' })
    };
  }

  await connectToDatabase();

  const project = await OpenSourceProject.findOne(id, {
    relations: ['organizations']
  });

  if (!project) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Project not found' })
    };
  }

  // retrieve associated orgid(s)
  const orgIds = project.organizations.map((org) => org.id);
  const userOrgs = getOrgMemberships(event);
  
  if (!isGlobalViewAdmin(event) && !isGlobalWriteAdmin(event) && (new Set(userOrgs)).intersection(new Set(orgIds)).size == 0) return Unauthorized;
  
  return {
    statusCode: 200,
    body: JSON.stringify(project)
  };
});

/**
 * @swagger
 *
 * /projects:
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
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'orgId in request body is required' })
    };
  }
  const { orgId } = JSON.parse(event.body);
  // check permissions
  if (
    !orgId ||
    (!isGlobalViewAdmin(event) &&
      !isGlobalWriteAdmin(event) &&
      !getOrgMemberships(event).includes(orgId))
  )
    return Unauthorized;
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
  const parsedBody = JSON.parse(event.body ?? '{}');
  const { url, hipcheckResults, orgId } = parsedBody;

  // check permissions
  if (
    !orgId ||
    (!isGlobalWriteAdmin(event) && !getOrgMemberships(event).includes(orgId))
  )
    return Unauthorized;

  // const body = await validateBody(OpenSourceProject, event.body);
  await connectToDatabase();

  let openSourceProject: OpenSourceProject | undefined;

  // Check if there's an existing open source project without an organization
  const existingProjects = await OpenSourceProject.createQueryBuilder('osp')
    .leftJoinAndSelect('osp.organizations', 'organizations')
    .where('osp.url = :url', { url })
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
  try {
    const organization = await Organization.findOneOrFail({ id: orgId });
    openSourceProject.organizations.push(organization);
    await openSourceProject.save();
  } catch (error) {
    return {
      statusCode: 404,
      body: JSON.stringify(error)
    };
  }
  return {
    statusCode: 201,
    body: JSON.stringify(openSourceProject)
  };
});
