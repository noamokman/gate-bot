import 'dotenv/config.js';
import { request } from 'node:http';
import { webConfig } from './framework/environment.js';

if (!webConfig) {
  console.log('Web server disabled, nothing to probe');

  process.exit(0);
}

const {
  webPort: port,
  healthCheckPath,
  healthCheckHost: host,
  healthCheckTimeoutMs: timeoutMs,
} = webConfig;

const probe = request({ host, port, path: healthCheckPath, timeout: timeoutMs }, (response) => {
  response.resume();

  process.exit(response.statusCode === 200 ? 0 : 1);
});

probe.on('timeout', () => probe.destroy(new Error(`Health check timed out after ${timeoutMs}ms`)));

probe.on('error', () => process.exit(1));

probe.end();
