import type { Server } from 'node:http';
import { createTerminus } from '@godaddy/terminus';
import { buildVersion, healthCheckPath } from '../framework/environment.js';

export const registerHealthCheck = (server: Server) => {
  createTerminus(server, {
    healthChecks: {
      verbatim: true,
      [healthCheckPath]: () => Promise.resolve({ version: buildVersion }),
    },
  });
};
