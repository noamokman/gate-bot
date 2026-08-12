import type { Request, Response, NextFunction } from 'express';
import type { WebSessionUser } from '../types.js';

declare module 'express-session' {
  interface SessionData {
    user?: WebSessionUser;
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

export const ensureApiAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.session.user) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
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

export const ensureApiAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.session.user?.isAdmin) {
    res.status(403).json({ ok: false, error: 'forbidden' });
    return;
  }

  next();
};
