import env from 'env-var';

export const healthCheckPath = '/healthz';

export const healthCheckConfig = {
  host: env.get('HEALTHCHECK_HOST').default('127.0.0.1').asString(),
  port: env.get('WEB_PORT').default('3000').asPortNumber(),
  timeoutMs: env.get('HEALTHCHECK_TIMEOUT_MS').default('2000').asIntPositive(),
};
