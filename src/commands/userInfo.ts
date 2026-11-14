import type { Telegraf } from 'telegraf';
import { authorize } from '../services/authorize.js';
import {
  doorCode,
  parkingInfo,
  floor,
  unit,
  propertyNotes,
  resolveLocalizedText,
} from '../framework/environment.js';
import { detectLocale } from '../web/locales/index.js';
import { infoHeading, notAllowed } from '../services/messages.js';
import { sendMessage } from '../services/telegram.js';

const buildInfo = (locale: string): string => {
  const parking = resolveLocalizedText(parkingInfo, locale);
  const floorText = resolveLocalizedText(floor, locale);
  const unitText = resolveLocalizedText(unit, locale);
  const notes = resolveLocalizedText(propertyNotes, locale);

  const lines: string[] = [
    infoHeading,
    ...(doorCode ? [`Door Code 🔢: ${doorCode}`] : []),
    ...(parking ? [`Parking 🅿️: ${parking}`] : []),
    ...(floorText ? [`Floor: ${floorText}`] : []),
    ...(unitText ? [`Unit: ${unitText}`] : []),
    ...(notes ? [`Notes 📝: ${notes}`] : []),
  ];

  return lines.length > 1 ? lines.join('\n') : 'No property info set.';
};

export const userInfoCommand = (bot: Telegraf) => {
  bot.command('info', async (ctx) => {
    const userId = ctx.from.id.toString();

    if (!authorize(userId)) {
      return sendMessage(ctx.chat.id, notAllowed);
    }

    const locale = detectLocale(ctx.from.language_code);

    return sendMessage(ctx.chat.id, buildInfo(locale));
  });
};
