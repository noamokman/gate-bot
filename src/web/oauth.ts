import { OAuth2Client } from 'google-auth-library';
import { webConfig } from '../framework/environment.js';

let cachedOAuthClient: OAuth2Client | undefined;

export const getOAuthClient = (): OAuth2Client | undefined => {
  if (!webConfig) {
    return undefined;
  }

  cachedOAuthClient ??= new OAuth2Client(webConfig.googleClientId, webConfig.googleClientSecret);

  return cachedOAuthClient;
};
