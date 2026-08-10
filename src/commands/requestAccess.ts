import { Markup } from 'telegraf';
import type { Telegraf } from 'telegraf';
import pMap from 'p-map';
import { authorize } from '../services/authorize.js';
import { alreadyAllowed, requestSent } from '../services/messages.js';
import { addPendingRequest } from '../services/db.js';
import { adminUserIds } from '../framework/environment.js';
import { getTelegramProfilePhoto } from '../services/telegramPhoto.js';

export const requestAccessCommand = (bot: Telegraf) => {
  bot.command('request_access', async (ctx) => {
    const userId = ctx.from.id.toString();

    if (authorize(userId)) {
      return ctx.reply(alreadyAllowed);
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

    await pMap(adminUserIds, (adminUserId) =>
      ctx.telegram.sendMessage(
        adminUserId,
        `Request recieved\nusername: ${ctx.from.username}\nFull name: ${ctx.from.first_name} ${ctx.from.last_name}\nId: ${userId}`,
        Markup.inlineKeyboard([
          Markup.button.callback('Allow✅', `allow_${request.id}`),
          Markup.button.callback('Deny⛔', `deny_${request.id}`),
        ]),
      ),
    );

    return ctx.reply(requestSent);
  });
};
