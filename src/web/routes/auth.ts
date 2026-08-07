import crypto from 'node:crypto';
import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { webConfig as rawWebConfig, basicAuthUsers } from '../../framework/environment.js';

const webConfig = rawWebConfig!;
const { googleClientId, googleClientSecret, webBaseUrl, googleAdminEmails } = webConfig;

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

const oauthClient = new OAuth2Client(googleClientId, googleClientSecret);

const router = Router();

router.get('/google', (req, res): void => {
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
});

router.get('/google/callback', async (req, res): Promise<void> => {
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
    res.status(400).send('Missing id_token');
    return;
  }

  let claims: RawGoogleIdTokenClaims;

  try {
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

  // eslint-disable-next-line require-atomic-updates
  req.session.user = user;

  res.redirect('/dashboard');
});

router.post('/password', (req, res): void => {
  if (basicAuthUsers.length === 0) {
    res.status(404).send('Not found');
    return;
  }

  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.redirect('/?error=missing');
    return;
  }

  const match = basicAuthUsers.find((u) => u.username === username && u.password === password);

  if (!match) {
    res.redirect('/?error=invalid');
    return;
  }

  req.session.user = {
    provider: 'password',
    id: username,
    email: '',
    name: username,
    isAdmin: match.isAdmin,
  };

  res.redirect('/dashboard');
});

router.get('/logout', (req, res): void => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

export { router as authRouter };
