import type { Telegraf } from 'telegraf';
import pMap from 'p-map';
import { adminUserIds } from '../framework/environment.js';
import { accessDenied } from '../services/messages.js';
import { getPendingRequests, removePendingRequest } from '../services/db.js';
import { isAdmin } from '../services/authorize.js';

export const denyAction = (bot: Telegraf) => {
  bot.action(/deny_(.*)/, async (ctx) => {
    const issuingUserId = ctx.from?.id.toString();

    if (!issuingUserId || !isAdmin(issuingUserId)) {
      return ctx.reply('You are not allowed to do this');
    }

    const requestId = ctx.match?.[1];

    if (!requestId) {
      return ctx.reply('Something went wrong');
    }

    const pendingRequests = getPendingRequests();
    const pending = pendingRequests.find((r) => r.id === requestId);

    if (!pending) {
      return ctx.reply('This request is no longer pending');
    }

    if (pending.sourceType === 'web') {
      await pMap(
        [...adminUserIds].filter((id) => id !== issuingUserId),
        (adminUserId) =>
          ctx.telegram.sendMessage(
            adminUserId,
            `Web user ${pending.name ?? requestId} (${pending.email ?? ''}) was denied access by ${ctx.from?.first_name}`,
          ),
      );

      await removePendingRequest(pending.id);
    } else {
      const userId = pending.sourceUserId;

      await pMap(
        [...adminUserIds].filter((id) => id !== issuingUserId),
        (adminUserId) =>
          ctx.telegram.sendMessage(adminUserId, `User ${userId} was denied access to open the gate by ${ctx.from?.first_name}`),
      );

      await removePendingRequest(pending.id);

      await ctx.telegram.sendMessage(userId, accessDenied);
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    if (ctx.callbackQuery.message && 'text' in ctx.callbackQuery.message) {
      await ctx.editMessageText(`${ctx.callbackQuery.message.text}\nDenied`);
    }

    return ctx.answerCbQuery('User was denied access to open the gate');
  });
};
