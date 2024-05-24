import 'dotenv/config.js';
import type { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
// eslint-disable-next-line import/extensions
import { message } from 'telegraf/filters';
import { botToken, doorCode } from './framework/environment.js';
import { authorizeContext } from './services/authorize.js';
import { allowed, helpAllowed, notAllowed, welcome } from './services/messages.js';
import { openCommand } from './commands/open.js';
import { requestAccessCommand } from './commands/requestAccess.js';
import { doorCodeCommand } from './commands/doorCode.js';
import { checkAuthorizationCommand } from './commands/checkAuthorization.js';
import { allowAction } from './actions/allow.js';
import { denyAction } from './actions/deny.js';
import { versionCommand } from './commands/version.js';

const bot = new Telegraf(botToken);

bot.start((ctx) => ctx.reply(`${welcome}\n${!authorizeContext(ctx) ? notAllowed : `${allowed}\n${helpAllowed}`}`));

const helpHandler = (ctx: Context) => ctx.reply(!authorizeContext(ctx) ? notAllowed : helpAllowed);

checkAuthorizationCommand(bot);
requestAccessCommand(bot);
allowAction(bot);
denyAction(bot);
doorCodeCommand(bot);
openCommand(bot);
versionCommand(bot);

bot.help(helpHandler);
bot.on(message(), helpHandler);

await bot.telegram.setMyCommands([
  { command: 'open', description: 'Open the gate' },
  ...(doorCode ? [{ command: 'door_code', description: 'Get the door code' }] : []),
  { command: 'check_authorization', description: 'Check if you are allowed to open the gate' },
  { command: 'request_access', description: 'Request access to open the gate' },
  { command: 'version', description: 'Show the current version' },
]);

process.once('SIGINT', () => {
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
});

await bot.launch();
