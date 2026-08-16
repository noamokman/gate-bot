import type { Telegraf } from 'telegraf';
import { sendMessage } from '../services/telegram.js';
import { webBaseUrl } from '../services/system.js';

export const webCommand = (bot: Telegraf) => {
  bot.command('web', (ctx) => sendMessage(ctx.chat.id, `You can also open the gate from the web:\n${webBaseUrl}`));
};
