import type { Telegraf, Telegram } from 'telegraf';
import type { User } from 'telegraf/types';
import { open } from '../services/open.js';
import { authorize } from '../services/authorize.js';
import { getUser, updateUser } from '../services/db.js';
import { getTelegramProfilePhoto } from '../services/telegramPhoto.js';
import { sendMessage } from '../services/telegram.js';
import { failedToOpen, notAllowed, opening } from '../services/messages.js';

const refreshProfilePhoto = async (telegram: Telegram, from: User) => {
  const userId = from.id.toString();
  const existing = getUser(userId, 'telegram');
  const picture = existing?.picture ?? (await getTelegramProfilePhoto(telegram, from.id));

  await updateUser({
    sourceType: 'telegram',
    id: userId,
    name: `${from.first_name} ${from.last_name ?? ''}`.trim() || from.username,
    username: from.username,
    firstName: from.first_name,
    lastName: from.last_name,
    picture,
  });
};

export const openCommand = (bot: Telegraf) => {
  bot.command('open', async (ctx) => {
    const userId = ctx.from.id.toString();

    if (!authorize(userId)) {
      return sendMessage(ctx.chat.id, notAllowed);
    }

    try {
      await open({
        userId,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        sourceType: 'telegram',
      });
    } catch (error) {
      if (error instanceof Error) {
        return sendMessage(ctx.chat.id, `${failedToOpen}\n${error.message}`);
      }

      return sendMessage(ctx.chat.id, failedToOpen);
    }

    refreshProfilePhoto(ctx.telegram, ctx.from).catch((error: unknown) => {
      console.error('Failed to refresh profile photo', error);
    });

    return sendMessage(ctx.chat.id, opening);
  });
};
