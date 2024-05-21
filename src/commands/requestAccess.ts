import { Markup } from 'telegraf';
import type { Telegraf } from 'telegraf';
import pMap from 'p-map';
import { authorize } from '../services/authorize.js';
import { alreadyAllowed, requestSent } from '../services/messages.js';
import { adminUserIds } from '../framework/environment.js';

export const requestAccessCommand = (bot: Telegraf) => {
  bot.command('request_access', async (ctx) => {
    const userId = ctx.from.id.toString();

    if (authorize(userId)) {
      return ctx.reply(alreadyAllowed);
    }

    await pMap(adminUserIds, (adminUserId) =>
      ctx.telegram.sendMessage(
        adminUserId,
        `Request recieved\nusername: ${ctx.from.username}\nFull name: ${ctx.from.first_name} ${ctx.from.last_name}\nId: ${userId}`,
        Markup.inlineKeyboard([Markup.button.callback('Allow✅', `allow_${userId}`), Markup.button.callback('Deny⛔', `deny_${userId}`)]),
      ),
    );

    return ctx.reply(requestSent);
  });
};
