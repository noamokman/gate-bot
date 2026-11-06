import type { Telegraf } from 'telegraf';
import type { ActivityLogEntry } from '../types.js';
import { isAdmin } from '../services/authorize.js';
import { getActivity } from '../services/db.js';
import { adminOnly } from '../services/messages.js';
import { sendMessage } from '../services/telegram.js';
import { t } from '../web/locales/index.js';

const MAX_ENTRIES = 20;

const formatTimestamp = (timestamp: string): string => timestamp.replace('T', ' ').replace(/\..+/, '');

const formatEntry = (entry: ActivityLogEntry): string => {
  const who = entry.actor.name ?? entry.actor.username ?? entry.actor.email ?? entry.actor.id;
  const action = t('en', `activity.${entry.action}`);
  const target = entry.target ? `: ${entry.target}` : '';

  return `${formatTimestamp(entry.timestamp)} — ${who} ${action}${target}`;
};

export const activityCommand = (bot: Telegraf) => {
  bot.command('activity', async (ctx) => {
    const userId = ctx.from.id.toString();

    if (!isAdmin(userId)) {
      return sendMessage(ctx.chat.id, adminOnly);
    }

    const entries = getActivity();

    if (entries.length === 0) {
      return sendMessage(ctx.chat.id, t('en', 'activity.noActivity'));
    }

    const lines = entries.slice(0, MAX_ENTRIES).map(formatEntry);

    return sendMessage(ctx.chat.id, `${t('en', 'activity.title')}\n\n${lines.join('\n')}`);
  });
};
