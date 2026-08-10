import type { Telegraf } from 'telegraf';
import { open } from '../services/open.js';
import { authorize } from '../services/authorize.js';
import { updateUser } from '../services/db.js';
import { getTelegramProfilePhoto } from '../services/telegramPhoto.js';
import { failedToOpen, notAllowed, opening } from '../services/messages.js';

export const openCommand = (bot: Telegraf) => {
  bot.command('open', async (ctx) => {
    const userId = ctx.from.id.toString();

    if (!authorize(userId)) {
      return ctx.reply(notAllowed);
    }

    try {
      const photoPromise = getTelegramProfilePhoto(ctx.telegram, ctx.from.id);

      await open({
        userId,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        sourceType: 'telegram',
      });

      const picture = await photoPromise;

      await updateUser({
        sourceType: 'telegram',
        id: userId,
        name: `${ctx.from.first_name} ${ctx.from.last_name ?? ''}`.trim() || ctx.from.username,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        picture,
      });
    } catch (error) {
      if (error instanceof Error) {
        return ctx.reply(`${failedToOpen}\n${error.message}`);
      }

      return ctx.reply(failedToOpen);
    }

    return ctx.reply(opening);
  });
};
