import 'dotenv/config.js';
import { startTelegramBot } from './bot/app.js';
import { initMqtt } from './services/mqtt.js';
import { startWebServer } from './web/app.js';

const services: [string, Promise<unknown>][] = [
  ['web', startWebServer()],
  ['telegram', startTelegramBot()],
  ['mqtt', initMqtt()],
];

const results = await Promise.allSettled(services.map(([, promise]) => promise));

let failed = false;

for (const [index, result] of results.entries()) {
  if (result.status === 'rejected') {
    failed = true;
    console.error(`${services[index]?.[0]} failed to start:`, result.reason);
  }
}

if (failed) {
  console.error('One or more services failed to start, exiting');
  process.exit(1);
}
