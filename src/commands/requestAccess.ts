import type { Telegraf } from 'telegraf';
import { authorize } from '../services/authorize.js';
import { alreadyAllowed, requestSent } from '../services/messages.js';
import { addPendingRequest } from '../services/db.js';
import { sendMessage } from '../services/telegram.js';
import { publish } from '../services/events.js';
import { getTelegramProfilePhoto } from '../services/telegramPhoto.js';

export const requestAccessCommand = (bot: Telegraf) => {
  bot.command('request_access', async (ctx) => {
    const userId = ctx.from.id.toString();

    if (authorize(userId)) {
      return sendMessage(ctx.chat.id, alreadyAllowed);
    }

    const request = {
      id: `telegram:${userId}`,
      sourceType: 'telegram' as const,
      sourceUserId: userId,
      name: `${ctx.from.first_name} ${ctx.from.last_name ?? ''}`.trim() || ctx.from.username,
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
      picture: await getTelegramProfilePhoto(ctx.telegram, ctx.from.id),
      requestedAt: new Date().toISOString(),
    };

    await addPendingRequest(request);

    await publish({ type: 'access_request_created', request });

    return sendMessage(ctx.chat.id, requestSent);
  });
};
