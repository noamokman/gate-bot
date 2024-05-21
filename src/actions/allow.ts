import type { Telegraf } from 'telegraf';
import pMap from 'p-map';
import { adminUserIds } from '../framework/environment.js';
import { addAllowedUser } from '../services/db.js';
import { allowed } from '../services/messages.js';
import { isAdmin } from '../services/authorize.js';

export const allowAction = (bot: Telegraf) => {
  bot.action(/allow_(.*)/, async (ctx) => {
    const issuingUserId = ctx.from?.id.toString();

    if (!issuingUserId || !isAdmin(issuingUserId)) {
      return ctx.reply('You are not allowed to do this');
    }

    const userId = ctx.match?.[1];

    if (!userId) {
      return ctx.reply('Something went wrong');
    }

    await pMap(
      [...adminUserIds].filter((id) => id !== issuingUserId),
      (adminUserId) => ctx.telegram.sendMessage(adminUserId, `User ${userId} was allowed to open the gate by ${ctx.from?.first_name}`),
    );

    // eslint-disable-next-line @typescript-eslint/naming-convention
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    if (ctx.callbackQuery.message && 'text' in ctx.callbackQuery.message) {
      await ctx.editMessageText(`${ctx.callbackQuery.message.text}\nApproved`);
    }

    await addAllowedUser(userId);

    await ctx.telegram.sendMessage(userId, allowed);

    return ctx.answerCbQuery('User was allowed to open the gate');
  });
};
