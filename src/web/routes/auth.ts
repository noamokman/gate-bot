import crypto from 'node:crypto';
import { Router } from 'express';
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

interface GoogleJwk {
  kty: string;
  n: string;
  e: string;
  kid?: string;
}

interface GoogleCerts {
  keys: GoogleJwk[];
}

const GOOGLE_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);
const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const CERTS_CACHE_TTL = 60 * 60 * 1000;

let certsCache: { certs: GoogleCerts; fetchedAt: number } | undefined;

const fetchGoogleCerts = async (): Promise<GoogleCerts> => {
  if (certsCache && Date.now() - certsCache.fetchedAt < CERTS_CACHE_TTL) {
    return certsCache.certs;
  }

  const response = await fetch(GOOGLE_CERTS_URL);

  if (!response.ok) {
    throw new Error('Failed to fetch Google signing certificates');
  }

  const certs = (await response.json()) as GoogleCerts;

  // eslint-disable-next-line require-atomic-updates
  certsCache = { certs, fetchedAt: Date.now() };

  return certs;
};

const verifyGoogleIdToken = async (idToken: string, clientId: string): Promise<RawGoogleIdTokenClaims> => {
  const [headerPart, payloadPart, signaturePart] = idToken.split('.');

  if (!headerPart || !payloadPart || !signaturePart) {
    throw new Error('Malformed id_token');
  }

  const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString()) as { alg?: string; kid?: string };

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported id_token header');
  }

  const certs = await fetchGoogleCerts();
  const signingKey = certs.keys.find((key) => key.kid === header.kid);

  if (!signingKey) {
    throw new Error('Unknown id_token signing key');
  }

  const publicKey = crypto.createPublicKey({ key: { kty: signingKey.kty, n: signingKey.n, e: signingKey.e }, format: 'jwk' });
  const signedData = Buffer.from(`${headerPart}.${payloadPart}`);
  const signature = Buffer.from(signaturePart, 'base64url');

  if (!crypto.verify('RSA-SHA256', signedData, publicKey, signature)) {
    throw new Error('Invalid id_token signature');
  }

  const claims = JSON.parse(Buffer.from(payloadPart, 'base64url').toString()) as RawGoogleIdTokenClaims;

  if (!GOOGLE_ISSUERS.has(claims.iss)) {
    throw new Error('Invalid id_token issuer');
  }

  if (claims.aud !== clientId) {
    throw new Error('Invalid id_token audience');
  }

  if (typeof claims.exp !== 'number' || Date.now() / 1000 >= claims.exp) {
    throw new Error('Expired id_token');
  }

  if (!claims.email_verified) {
    throw new Error('Unverified email');
  }

  return claims;
};

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
  const tokens: { id_token: string } = (await tokenResponse.json()) as { id_token: string };

  let claims: RawGoogleIdTokenClaims;

  try {
    claims = await verifyGoogleIdToken(tokens.id_token, googleClientId);
  } catch {
    res.status(500).send('Invalid id_token');
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
