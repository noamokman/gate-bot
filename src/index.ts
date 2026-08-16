import 'dotenv/config.js';
import { startTelegramBot } from './bot/app.js';
import { initMqtt } from './services/mqtt.js';
import { startWebServer } from './web/app.js';

startWebServer();
await Promise.allSettled([startTelegramBot(), initMqtt()]);
