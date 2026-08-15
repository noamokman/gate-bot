import type { Telegraf } from 'telegraf';
import { addUser, getPendingRequests, removePendingRequest } from '../services/db.js';
import { isAdmin } from '../services/authorize.js';
import { answerCallbackQuery, sendMessage } from '../services/telegram.js';
import { publish } from '../services/events.js';

export const allowAction = (bot: Telegraf) => {
  bot.action(/allow_(.*)/, async (ctx) => {
    const chatId = ctx.chat?.id;

    if (!chatId) {
      return;
    }

    const issuingUserId = ctx.from?.id.toString();

    if (!issuingUserId || !isAdmin(issuingUserId)) {
      return sendMessage(chatId, 'You are not allowed to do this');
    }

    const requestId = ctx.match?.[1];

    if (!requestId) {
      return sendMessage(chatId, 'Something went wrong');
    }

    const pendingRequests = getPendingRequests();
    const pending = pendingRequests.find((r) => r.id === requestId);

    if (!pending) {
      return sendMessage(chatId, 'This request is no longer pending');
    }

    await addUser(
      pending.sourceType === 'web'
        ? {
            sourceType: 'web',
            id: pending.sourceUserId,
            name: pending.name ?? '',
            email: pending.email ?? '',
            firstName: pending.firstName,
            lastName: pending.lastName,
            picture: pending.picture,
          }
        : {
            sourceType: 'telegram',
            id: pending.sourceUserId,
            name: pending.name,
            username: pending.username,
            firstName: pending.firstName,
            lastName: pending.lastName,
            picture: pending.picture,
          },
    );

    const callbackMessage = ctx.callbackQuery.message;

    await publish({
      type: 'access_request_allowed',
      request: pending,
      admin: { userId: issuingUserId, name: ctx.from?.first_name },
      messageRef: callbackMessage ? { chatId: callbackMessage.chat.id, messageId: callbackMessage.message_id } : undefined,
    });

    await removePendingRequest(pending.id);

    return answerCallbackQuery(ctx.callbackQuery.id, 'User was allowed to open the gate');
  });
};
