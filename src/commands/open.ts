import type { Telegraf } from 'telegraf';
import { open } from '../services/open.js';
import { authorize } from '../services/authorize.js';
import { failedToOpen, notAllowed, opening } from '../services/messages.js';

export const openCommand = (bot: Telegraf) => {
  bot.command('open', async (ctx) => {
    const userId = ctx.from.id.toString();

    if (!authorize(userId)) {
      return ctx.reply(notAllowed);
    }

    try {
      await open(userId);
    } catch (error) {
      if (error instanceof Error) {
        return ctx.reply(`${failedToOpen}\n${error.message}`);
      }

      return ctx.reply(failedToOpen);
    }

    return ctx.reply(opening);
  });
};
