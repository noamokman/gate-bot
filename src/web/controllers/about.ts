import type { Request, Response } from 'express';
import { readPackageUp } from 'read-package-up';
import { buildVersion } from '../../framework/environment.js';

export const aboutPage = async (req: Request, res: Response): Promise<void> => {
  const result = await readPackageUp();

  res.render('about', {
    user: req.session.user,
    packageVersion: result?.packageJson.version ?? 'unknown',
    buildVersion,
  });
};
