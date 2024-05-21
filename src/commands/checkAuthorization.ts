import type { Telegraf } from 'telegraf';
import { authorizeContext } from '../services/authorize.js';
import { allowed, notAllowed } from '../services/messages.js';

export const checkAuthorizationCommand = (bot: Telegraf) => {
  bot.command('check_authorization', (ctx) => ctx.reply(!authorizeContext(ctx) ? notAllowed : allowed));
};
