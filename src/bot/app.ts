import type { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
// eslint-disable-next-line import-x/extensions
import { message } from 'telegraf/filters';
import { botToken } from '../framework/environment.js';
import { authorizeContext } from '../services/authorize.js';
import { allowed, helpAllowed, notAllowed, welcome } from '../services/messages.js';
import { setBotPhotoIfMissing } from '../services/telegramPhoto.js';
import { initTelegram, sendMessage } from '../services/telegram.js';
import { openCommand } from '../commands/open.js';
import { requestAccessCommand } from '../commands/requestAccess.js';
import { checkAuthorizationCommand } from '../commands/checkAuthorization.js';
import { allowAction } from '../actions/allow.js';
import { denyAction } from '../actions/deny.js';
import { versionCommand } from '../commands/version.js';
import { userInfoCommand } from '../commands/userInfo.js';

const helpHandler = (ctx: Context) => {
  if (!ctx.chat) {
    return;
  }

  return sendMessage(ctx.chat.id, !authorizeContext(ctx) ? notAllowed : helpAllowed);
};

export const startTelegramBot = async (): Promise<void> => {
  if (!botToken) {
    return;
  }

  const bot = new Telegraf(botToken);

  initTelegram(bot);

  bot.start((ctx) => sendMessage(ctx.chat.id, `${welcome}\n${!authorizeContext(ctx) ? notAllowed : `${allowed}\n${helpAllowed}`}`));

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
    { command: 'info', description: 'View property info (door code, parking, floor, unit, notes)' },
    { command: 'version', description: 'Show the current version' },
  ]);

  await setBotPhotoIfMissing(bot.telegram);

  process.once('SIGINT', () => {
    bot.stop('SIGINT');
  });
  process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
  });

  await bot.launch();
};
