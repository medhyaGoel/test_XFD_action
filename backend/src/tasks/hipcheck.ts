import { OpenSourceProject } from '../models';
import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { CommandOptions } from './ecs-client';
import getProjects from './helpers/getProjects';
import { getRepository } from 'typeorm';
import * as path from 'path';

const OUT_PATH = path.join(__dirname, 'out-' + Math.random() + '.json');

export const handler = async (commandOptions: CommandOptions) => {
  const { organizationId, organizationName, scanId } = commandOptions;

  console.log('Running Hipcheck scan on hardcoded URL');

  const projects = await getProjects();
  for (const project of projects) {
    try {
      const args = [
        'check',
        '--target',
        'repo',
        '--format',
        'json',
        '-v',
        'quiet',
        project.url
      ];
      console.log('Running Hipcheck scan with args', args);

      const hcPath = path.resolve(process.env.HOME || '', '.cargo/bin/hc');

      const output = spawnSync(hcPath, args, { stdio: 'pipe' });

      if (output.error) {
        throw output.error;
      }

      console.log('JSON String:', output.stdout.toString());
      let parsedData;
      try {
        parsedData = JSON.parse(output.stdout.toString());
      } catch (error) {
        console.error('Failed to parse JSON:', error);
        parsedData = {};
      }

      project.hipcheckResults = parsedData;

      await project.save();

      console.log(`Hipcheck completed for project: ${project.name}`);
    } catch (e) {
      console.error('Error running Hipcheck:', e);
      continue;
    }
  }
};
