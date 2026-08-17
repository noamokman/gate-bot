import { randomUUID } from 'node:crypto';
import type { Telegraf, Telegram } from 'telegraf';
import { authorize } from '../services/authorize.js';
import { alreadyAllowed, requestSent } from '../services/messages.js';
import { addPendingRequest, getUser, updatePendingRequestPicture } from '../services/db.js';
import { sendMessage } from '../services/telegram.js';
import { publish } from '../services/events.js';
import { getTelegramProfilePhoto } from '../services/telegramPhoto.js';
import type { TelegramPendingRequest } from '../types.js';

const refreshPendingPicture = async (telegram: Telegram, userId: string, fromId: number, requestToken: string) => {
  try {
    const picture = await getTelegramProfilePhoto(telegram, fromId);

    if (picture) {
      await updatePendingRequestPicture(userId, picture, requestToken);
    }
  } catch (error: unknown) {
    console.error('Failed to refresh pending request picture', error);
  }
};

export const requestAccessCommand = (bot: Telegraf) => {
  bot.command('request_access', async (ctx) => {
    const userId = ctx.from.id.toString();

    if (authorize(userId)) {
      return sendMessage(ctx.chat.id, alreadyAllowed);
    }

    const existing = getUser(userId, 'telegram');
    const requestToken = randomUUID();

    const request: TelegramPendingRequest = {
      id: `telegram:${userId}`,
      sourceType: 'telegram',
      sourceUserId: userId,
      name: `${ctx.from.first_name} ${ctx.from.last_name ?? ''}`.trim() || ctx.from.username,
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
      picture: existing?.picture,
      requestedAt: new Date().toISOString(),
      requestToken,
    };

    await addPendingRequest(request);

    await publish({ type: 'access_request_created', request });

    if (!existing?.picture) {
      void refreshPendingPicture(ctx.telegram, userId, ctx.from.id, requestToken);
    }

    return sendMessage(ctx.chat.id, requestSent);
  });
};
