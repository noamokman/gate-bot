import type { Telegraf } from 'telegraf';
import pMap from 'p-map';
import { adminUserIds } from '../framework/environment.js';
import { accessDenied } from '../services/messages.js';
import { isAdmin } from '../services/authorize.js';

export const denyAction = (bot: Telegraf) => {
  bot.action(/deny_(.*)/, async (ctx) => {
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
      (adminUserId) =>
        ctx.telegram.sendMessage(adminUserId, `User ${userId} was denied access to open the gate by ${ctx.from?.first_name}`),
    );

    // eslint-disable-next-line @typescript-eslint/naming-convention
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    if (ctx.callbackQuery.message && 'text' in ctx.callbackQuery.message) {
      await ctx.editMessageText(`${ctx.callbackQuery.message.text}\nDenied`);
    }

    await ctx.telegram.sendMessage(userId, accessDenied);

    return ctx.answerCbQuery('User was denied access to open the gate');
  });
};
