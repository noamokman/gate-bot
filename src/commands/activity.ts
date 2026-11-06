import type { Telegraf } from 'telegraf';
import type { ActivityLogEntry } from '../types.js';
import { isAdmin } from '../services/authorize.js';
import { getActivity } from '../services/db.js';
import { adminOnly } from '../services/messages.js';
import { sendMessage } from '../services/telegram.js';
import { t } from '../web/locales/index.js';

const MAX_ENTRIES = 20;
const TELEGRAM_MAX_LENGTH = 4096;

const formatTimestamp = (timestamp: string): string =>
  `${timestamp.replace('T', ' ').replace(/\.\d+Z$/, '')} UTC`;

const formatEntry = (entry: ActivityLogEntry): string => {
  const who = [entry.actor.name, entry.actor.username, entry.actor.email].find(Boolean) ?? entry.actor.id;
  const action = t('en', `activity.${entry.action}`);
  const target = entry.target ? `: ${entry.target}` : '';

  return `${formatTimestamp(entry.timestamp)} — ${who} ${action}${target}`;
};

const splitMessages = (header: string, lines: string[]): string[] => {
  const messages: string[] = [];
  let buffer = header;

  for (const line of lines) {
    const next = buffer ? `${buffer}\n${line}` : line;

    if (next.length <= TELEGRAM_MAX_LENGTH) {
      buffer = next;
      continue;
    }

    if (buffer) {
      messages.push(buffer);
    }

    buffer = line.slice(0, TELEGRAM_MAX_LENGTH);
  }

  messages.push(buffer);

  return messages;
};

export const activityCommand = (bot: Telegraf) => {
  bot.command('activity', async (ctx) => {
    const userId = ctx.from.id.toString();

    if (!isAdmin(userId)) {
      return sendMessage(ctx.chat.id, adminOnly);
    }

    if (ctx.chat.type !== 'private') {
      return sendMessage(ctx.chat.id, 'This command is only available in a private chat with the bot');
    }

    const entries = getActivity();

    if (entries.length === 0) {
      return sendMessage(ctx.chat.id, t('en', 'activity.noActivity'));
    }

    const messages = splitMessages(
      t('en', 'activity.title'),
      entries.slice(0, MAX_ENTRIES).map((entry) => formatEntry(entry)),
    );

    for (const message of messages) {
      await sendMessage(ctx.chat.id, message);
    }
  });
};
