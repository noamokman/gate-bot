import type { Server } from 'node:http';
import { createTerminus } from '@godaddy/terminus';
import { buildVersion } from '../framework/environment.js';
import type { WebConfig } from '../framework/environment.js';

export const registerHealthCheck = (server: Server, { healthCheckPath }: WebConfig) => {
  createTerminus(server, {
    healthChecks: {
      verbatim: true,
      [healthCheckPath]: () => Promise.resolve({ version: buildVersion }),
    },
  });
};
