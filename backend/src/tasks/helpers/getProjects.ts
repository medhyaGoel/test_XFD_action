import { OpenSourceProject, connectToDatabase } from '../../models';

export default async (): Promise<OpenSourceProject[]> => {
  await connectToDatabase();

  const projects = await OpenSourceProject.find();
  return projects;
};
