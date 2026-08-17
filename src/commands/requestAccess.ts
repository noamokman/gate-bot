import type { Telegraf } from 'telegraf';
import { authorize } from '../services/authorize.js';
import { alreadyAllowed, requestSent } from '../services/messages.js';
import { addPendingRequest, getUser } from '../services/db.js';
import { sendMessage } from '../services/telegram.js';
import { publish } from '../services/events.js';
import { getTelegramProfilePhoto } from '../services/telegramPhoto.js';
import type { TelegramPendingRequest } from '../types.js';

const noop = (error: unknown) => {
  console.error('Failed to refresh profile photo', error);
};

export const requestAccessCommand = (bot: Telegraf) => {
  bot.command('request_access', async (ctx) => {
    const userId = ctx.from.id.toString();

    if (authorize(userId)) {
      return sendMessage(ctx.chat.id, alreadyAllowed);
    }

    const existing = getUser(userId, 'telegram');

    const requestId = `telegram:${userId}`;

    const request: TelegramPendingRequest = {
      id: requestId,
      sourceType: 'telegram',
      sourceUserId: userId,
      name: `${ctx.from.first_name} ${ctx.from.last_name ?? ''}`.trim() || ctx.from.username,
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
      picture: existing?.picture,
      requestedAt: new Date().toISOString(),
    };

    await addPendingRequest(request);

    await publish({ type: 'access_request_created', request });

    if (!existing?.picture) {
      getTelegramProfilePhoto(ctx.telegram, ctx.from.id)
        .then((picture) => addPendingRequest({ ...request, picture }))
        .catch(noop);
    }

    return sendMessage(ctx.chat.id, requestSent);
  });
};
