import 'dotenv/config.js';
import { request } from 'node:http';
import { healthCheckConfig, healthCheckPath } from './framework/health.js';

const { host, port, timeoutMs } = healthCheckConfig;

const probe = request({ host, port, path: healthCheckPath, timeout: timeoutMs }, (response) => {
  response.resume();

  process.exit(response.statusCode === 200 ? 0 : 1);
});

probe.on('timeout', () => probe.destroy(new Error(`Health check timed out after ${timeoutMs}ms`)));

probe.on('error', () => process.exit(1));

probe.end();
