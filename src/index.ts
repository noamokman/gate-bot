import 'dotenv/config.js';
import type { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
// eslint-disable-next-line import-x/extensions
import { message } from 'telegraf/filters';
import { botToken, webConfig } from './framework/environment.js';
import { authorizeContext } from './services/authorize.js';
import { allowed, helpAllowed, notAllowed, welcome } from './services/messages.js';
import { openCommand } from './commands/open.js';
import { requestAccessCommand } from './commands/requestAccess.js';
import { checkAuthorizationCommand } from './commands/checkAuthorization.js';
import { allowAction } from './actions/allow.js';
import { denyAction } from './actions/deny.js';
import { versionCommand } from './commands/version.js';
import { userInfoCommand } from './commands/userInfo.js';
import { initMqtt } from './services/mqtt.js';
import { startWebServer } from './web/app.js';

const bot = new Telegraf(botToken);

bot.start((ctx) => ctx.reply(`${welcome}\n${!authorizeContext(ctx) ? notAllowed : `${allowed}\n${helpAllowed}`}`));

const helpHandler = (ctx: Context) => ctx.reply(!authorizeContext(ctx) ? notAllowed : helpAllowed);

checkAuthorizationCommand(bot);
requestAccessCommand(bot);
allowAction(bot);
denyAction(bot);
openCommand(bot);
versionCommand(bot);
userInfoCommand(bot);

bot.help(helpHandler);
bot.on(message(), helpHandler);

await bot.telegram.setMyCommands([
  { command: 'open', description: 'Open the gate' },
  { command: 'check_authorization', description: 'Check if you are allowed to open the gate' },
  { command: 'request_access', description: 'Request access to open the gate' },
  { command: 'info', description: 'View property info (door code, parking, floor, unit)' },
  { command: 'version', description: 'Show the current version' },
]);

process.once('SIGINT', () => {
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
});

await initMqtt();

if (webConfig) {
  startWebServer();
}

await bot.launch();
