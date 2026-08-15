import type { Telegraf } from 'telegraf';
import { getPendingRequests, removePendingRequest } from '../services/db.js';
import { isAdmin } from '../services/authorize.js';
import { answerCallbackQuery, sendMessage } from '../services/telegram.js';
import { publish } from '../services/events.js';

export const denyAction = (bot: Telegraf) => {
  bot.action(/deny_(.*)/, async (ctx) => {
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

    const callbackMessage = ctx.callbackQuery.message;

    await publish({
      type: 'access_request_denied',
      request: pending,
      admin: { userId: issuingUserId, name: ctx.from?.first_name },
      messageRef: callbackMessage ? { chatId: callbackMessage.chat.id, messageId: callbackMessage.message_id } : undefined,
    });

    await removePendingRequest(pending.id);

    return answerCallbackQuery(ctx.callbackQuery.id, 'User was denied access to open the gate');
  });
};
