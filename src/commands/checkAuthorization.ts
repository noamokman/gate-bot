import type { Telegraf } from 'telegraf';
import { authorizeContext } from '../services/authorize.js';
import { allowed, notAllowed } from '../services/messages.js';
import { sendMessage } from '../services/telegram.js';

export const checkAuthorizationCommand = (bot: Telegraf) => {
  bot.command('check_authorization', (ctx) => sendMessage(ctx.chat.id, !authorizeContext(ctx) ? notAllowed : allowed));
};
