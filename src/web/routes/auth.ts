import crypto from 'node:crypto';
import { Router } from 'express';
import { webConfig as rawWebConfig } from '../../framework/environment.js';

const webConfig = rawWebConfig!;
const { googleClientId, googleClientSecret, webBaseUrl, googleAdminEmails } = webConfig;

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

  const tokens: Record<string, unknown> = await tokenResponse.json();

  const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      Authorization: `Bearer ${tokens.access_token as string}`,
    },
  });

  if (!userResponse.ok) {
    res.status(500).send('Failed to fetch user info');
    return;
  }

  const userInfo = (await userResponse.json()) as { id: string; email: string; name: string };
  const user = {
    googleId: userInfo.id,
    email: userInfo.email,
    name: userInfo.name,
    isAdmin: googleAdminEmails.has(userInfo.email),
  };

  // eslint-disable-next-line require-atomic-updates
  req.session.user = user;

  res.redirect('/dashboard');
});

router.get('/logout', (req, res): void => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

export { router as authRouter };
