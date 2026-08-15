import type { Telegraf } from 'telegraf';
import { authorize } from '../services/authorize.js';
import { doorCode, parkingInfo, floor, unit, propertyNotes } from '../framework/environment.js';
import { infoHeading, notAllowed } from '../services/messages.js';
import { sendMessage } from '../services/telegram.js';

const infoLines: string[] = [
  infoHeading,
  ...(doorCode ? [`Door Code 🔢: ${doorCode}`] : []),
  ...(parkingInfo ? [`Parking 🅿️: ${parkingInfo}`] : []),
  ...(floor ? [`Floor: ${floor}`] : []),
  ...(unit ? [`Unit: ${unit}`] : []),
  ...(propertyNotes ? [`Notes 📝: ${propertyNotes}`] : []),
];

const infoString = infoLines.length > 1 ? infoLines.join('\n') : 'No property info set.';

export const userInfoCommand = (bot: Telegraf) => {
  bot.command('info', async (ctx) => {
    const userId = ctx.from.id.toString();

    if (!authorize(userId)) {
      return sendMessage(ctx.chat.id, notAllowed);
    }

    return sendMessage(ctx.chat.id, infoString);
  });
};
