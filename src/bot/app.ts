import type { Context } from 'telegraf';
import { Telegraf } from 'telegraf';
import type { User } from 'telegraf/types';
// eslint-disable-next-line import-x/extensions
import { message } from 'telegraf/filters';
import { botToken } from '../framework/environment.js';
import { isWebEnabled, setTelegramUsername } from '../services/system.js';
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
import { webCommand } from '../commands/web.js';

const helpHandler = (ctx: Context) => {
  if (!ctx.chat) {
    return;
  }

  return sendMessage(ctx.chat.id, !authorizeContext(ctx) ? notAllowed : helpAllowed);
};

export const startTelegramBot = async (): Promise<void> => {
  if (!botToken) {
    console.log('Telegram bot skipped: BOT_TOKEN not set');
    setTelegramUsername();
    return;
  }

  const bot = new Telegraf(botToken);

  const { telegram } = bot;

  let me: User | undefined;
  try {
    const botInfo = await telegram.getMe();
    // eslint-disable-next-line require-atomic-updates
    bot.botInfo = botInfo;
    me = botInfo;
    setTelegramUsername(botInfo.username);
  } catch (error) {
    console.error('Failed to fetch bot info:', error);
    setTelegramUsername();
  }

  initTelegram(bot);

  bot.start((ctx) => sendMessage(ctx.chat.id, `${welcome}\n${!authorizeContext(ctx) ? notAllowed : `${allowed}\n${helpAllowed}`}`));

  checkAuthorizationCommand(bot);
  requestAccessCommand(bot);
  allowAction(bot);
  denyAction(bot);
  openCommand(bot);
  versionCommand(bot);
  userInfoCommand(bot);
  if (isWebEnabled) {
    webCommand(bot);
  }

  bot.help(helpHandler);
  bot.on(message(), helpHandler);

  const commands = [
    { command: 'open', description: 'Open the gate' },
    { command: 'check_authorization', description: 'Check if you are allowed to open the gate' },
    { command: 'request_access', description: 'Request access to open the gate' },
    { command: 'info', description: 'View property info (door code, parking, floor, unit, notes)' },
    { command: 'version', description: 'Show the current version' },
  ];

  if (isWebEnabled) {
    commands.push({ command: 'web', description: 'Open the web UI' });
  }

  await telegram.setMyCommands(commands);

  await setBotPhotoIfMissing(telegram, me);

  process.once('SIGINT', () => {
    bot.stop('SIGINT');
  });
  process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
  });

  console.log('Telegram bot started');

  await bot.launch({}, () => {
    // eslint-disable-next-line unicorn/consistent-destructuring
    setTelegramUsername(bot.botInfo?.username);
  });
};
