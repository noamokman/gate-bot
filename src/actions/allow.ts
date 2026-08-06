import type { Telegraf } from 'telegraf';
import pMap from 'p-map';
import { adminUserIds } from '../framework/environment.js';
import { addUser, getPendingRequests, removePendingRequest } from '../services/db.js';
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

    const pendingRequests = getPendingRequests();
    const pending = pendingRequests.find((r) => r.sourceUserId === userId);

    if (pending?.sourceType === 'web') {
      await addUser({
        sourceType: 'web',
        id: pending.sourceUserId,
        name: pending.name ?? '',
        email: pending.email ?? '',
        firstName: pending.firstName,
        lastName: pending.lastName,
        picture: pending.picture,
      });

      await pMap(
        [...adminUserIds].filter((id) => id !== issuingUserId),
        (adminUserId) =>
          ctx.telegram.sendMessage(
            adminUserId,
            `Web user ${pending.name ?? userId} (${pending.email ?? ''}) was allowed to open the gate by ${ctx.from?.first_name}`,
          ),
      );

      await removePendingRequest(pending.id);
    } else {
      await addUser({
        sourceType: 'telegram',
        id: userId,
        name: pending?.name,
        username: pending?.username,
        firstName: pending?.firstName,
        lastName: pending?.lastName,
      });

      await pMap(
        [...adminUserIds].filter((id) => id !== issuingUserId),
        (adminUserId) =>
          ctx.telegram.sendMessage(adminUserId, `User ${pending?.name ?? userId} was allowed to open the gate by ${ctx.from?.first_name}`),
      );

      await removePendingRequest(`telegram:${userId}`);

      await ctx.telegram.sendMessage(userId, allowed);
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    if (ctx.callbackQuery.message && 'text' in ctx.callbackQuery.message) {
      await ctx.editMessageText(`${ctx.callbackQuery.message.text}\nApproved`);
    }

    return ctx.answerCbQuery('User was allowed to open the gate');
  });
};
