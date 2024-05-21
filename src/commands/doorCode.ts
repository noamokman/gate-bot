import type { Telegraf } from 'telegraf';
import { doorCode } from '../framework/environment.js';
import { authorizeContext } from '../services/authorize.js';
import { doorCodeDetails, notAllowed } from '../services/messages.js';

export const doorCodeCommand = (bot: Telegraf) => {
  if (!doorCode) {
    return;
  }

  bot.command('door_code', async (ctx) => ctx.reply(!authorizeContext(ctx) ? notAllowed : doorCodeDetails));
};
