import type { Server } from 'node:http';
import { createTerminus } from '@godaddy/terminus';
import { buildVersion } from '../framework/environment.js';
import { healthCheckPath } from '../framework/health.js';

export const registerHealthCheck = (server: Server) => {
  createTerminus(server, {
    healthChecks: {
      verbatim: true,
      [healthCheckPath]: () => Promise.resolve({ version: buildVersion }),
    },
  });
};
