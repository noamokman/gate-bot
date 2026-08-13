import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { webConfig as rawWebConfig, basicAuthUsers } from '../../framework/environment.js';
import { getOAuthClient } from '../oauth.js';
import { updateUser } from '../../services/db.js';

const safeEqual = (a: string, b: string): boolean => {
  const aDigest = crypto.createHash('sha256').update(a).digest();
  const bDigest = crypto.createHash('sha256').update(b).digest();

  return crypto.timingSafeEqual(aDigest, bDigest);
};

interface RawGoogleIdTokenClaims {
  iss: string;
  aud: string;
  sub: string;
  email: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  email_verified: boolean;
  name: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  given_name: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  family_name: string;
  picture: string;
  iat: number;
  exp: number;
}

export const googleStart = (req: Request, res: Response): void => {
  if (!rawWebConfig) {
    res.status(500).send('Web not configured');
    return;
  }

  const { googleClientId, webBaseUrl } = rawWebConfig;
  const state = crypto.randomUUID();

  req.session.oauthState = state;

  const params = new URLSearchParams({
    // eslint-disable-next-line @typescript-eslint/naming-convention
    client_id: googleClientId,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    redirect_uri: `${webBaseUrl}/auth/google/callback`,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    response_type: 'code',
    scope: 'openid email profile',
    state,
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};

export const googleCallback = async (req: Request, res: Response): Promise<void> => {
  if (!rawWebConfig) {
    res.status(500).send('Web not configured');
    return;
  }

  const { googleClientId, googleClientSecret, webBaseUrl, googleAdminEmails } = rawWebConfig;
  const { code, state } = req.query;

  if (typeof code !== 'string' || typeof state !== 'string' || state !== req.session.oauthState) {
    res.status(400).send('Invalid request');
    return;
  }

  delete req.session.oauthState;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      client_id: googleClientId,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      client_secret: googleClientSecret,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      redirect_uri: `${webBaseUrl}/auth/google/callback`,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    res.status(500).send('Failed to exchange authorization code');
    return;
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const tokens = (await tokenResponse.json()) as { id_token?: unknown };

  if (typeof tokens.id_token !== 'string') {
    res.status(401).send('Missing id_token');
    return;
  }

  let claims: RawGoogleIdTokenClaims;

  try {
    const oauthClient = getOAuthClient()!;
    const ticket = await oauthClient.verifyIdToken({ idToken: tokens.id_token, audience: googleClientId });
    claims = ticket.getPayload() as RawGoogleIdTokenClaims;

    if (!claims.email_verified) {
      throw new Error('Email is not verified');
    }
  } catch (error) {
    console.error('Google id_token verification failed:', error);
    res.status(401).send('Invalid id_token');
    return;
  }

  const user = {
    provider: 'google' as const,
    id: claims.sub,
    email: claims.email,
    name: claims.name,
    firstName: claims.given_name,
    lastName: claims.family_name,
    picture: claims.picture,
    isAdmin: googleAdminEmails.has(claims.email),
  };

  await updateUser({
    sourceType: 'web',
    id: user.id,
    name: user.name,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    picture: user.picture,
  });

  req.session.regenerate((error) => {
    if (error) {
      console.error('Session regeneration failed:', error);
      res.status(500).send('Failed to start session');
      return;
    }

    req.session.user = user;

    res.redirect('/');
  });
};

export const passwordLogin = (req: Request, res: Response): void => {
  if (basicAuthUsers.length === 0) {
    res.status(404).json({ ok: false, error: 'not_available' });
    return;
  }

  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ ok: false, error: 'missing' });
    return;
  }

  const match = basicAuthUsers.find((u) => u.username === username && safeEqual(u.password, password));

  if (!match) {
    res.status(401).json({ ok: false, error: 'invalid' });
    return;
  }

  req.session.regenerate((error) => {
    if (error) {
      res.status(500).json({ ok: false, error: 'session_error' });
      return;
    }

    req.session.user = {
      provider: 'password',
      id: username,
      email: '',
      name: username,
      isAdmin: match.isAdmin,
    };

    res.json({ ok: true, user: { name: username, isAdmin: match.isAdmin } });
  });
};

export const logout = (req: Request, res: Response): void => {
  const { path: cookiePath, domain } = req.session.cookie;

  req.session.destroy((error) => {
    if (error) {
      console.error('Session destroy failed:', error);
      res.status(500).json({ ok: false, error: 'logout_failed' });
      return;
    }

    res.clearCookie('connect.sid', { path: cookiePath, domain });

    res.json({ ok: true });
  });
};
