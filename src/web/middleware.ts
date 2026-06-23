import type { Request, Response, NextFunction } from 'express';

declare module 'express-session' {
  interface SessionData {
    user?: { googleId: string; email: string; name: string; isAdmin: boolean };
    oauthState?: string;
    locale?: string;
  }
}

export const ensureAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.session.user) {
    res.redirect('/');
    return;
  }

  next();
};

export const ensureAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.session.user?.isAdmin) {
    res.status(403).send('Forbidden');
    return;
  }

  next();
};
