import 'dotenv/config.js';
import { Telegraf, Markup } from 'telegraf';
// eslint-disable-next-line import/extensions
import { message } from 'telegraf/filters';
import { adminUserIds, botToken } from './framework/environment.js';
import { open } from './services/open.js';
import { authorize } from './services/authorize.js';
import { allowed, failedToOpen, help, notAllowed, opening, welcome, alreadyAllowed, accessDenied } from './services/messages.js';
import { addAllowedUser } from './services/db.js';

const bot = new Telegraf(botToken);

bot.start((ctx) => {
  const userId = ctx.from.id.toString();

  if (!authorize(userId)) {
    return ctx.reply(`${welcome}\n${notAllowed}`);
  }

  return ctx.reply(`${welcome}\nTry using /open to open the gate`);
});
bot.help((ctx) => ctx.reply(help));

bot.command('check_authorization', async (ctx) => {
  const userId = ctx.from.id.toString();

  if (!authorize(userId)) {
    return ctx.reply(notAllowed);
  }

  return ctx.reply(allowed);
});

bot.command('request_access', async (ctx) => {
  const userId = ctx.from.id.toString();

  if (authorize(userId)) {
    return ctx.reply(alreadyAllowed);
  }

  await Promise.all(
    adminUserIds.map((adminUserId) =>
      ctx.telegram.sendMessage(
        adminUserId,
        `Request recieved\nusername: ${ctx.from.username}\nFull name: ${ctx.from.first_name} ${ctx.from.last_name}\nId: ${userId}`,
        Markup.inlineKeyboard([Markup.button.callback('Allow✅', `allow_${userId}`), Markup.button.callback('Deny⛔', `deny_${userId}`)]),
      ),
    ),
  );

  return ctx.reply('Request sent!📨');
});

bot.action(/allow_(.*)/, async (ctx) => {
  const issuingUserId = ctx.from?.id.toString();

  if (!issuingUserId || !adminUserIds.includes(issuingUserId)) {
    return ctx.reply('You are not allowed to do this');
  }

  const userId = ctx.match?.[1];

  if (!userId) {
    return ctx.reply('Something went wrong');
  }

  await Promise.all(
    adminUserIds
      .filter((id) => id !== issuingUserId)
      .map((adminUserId) =>
        ctx.telegram.sendMessage(adminUserId, `User ${userId} was allowed to open the gate by ${ctx.from?.first_name}}`),
      ),
  );

  // eslint-disable-next-line @typescript-eslint/naming-convention
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

  if (ctx.callbackQuery.message && 'text' in ctx.callbackQuery.message) {
    await ctx.editMessageText(`${ctx.callbackQuery.message.text}\nApproved`);
  }

  await ctx.telegram.sendMessage(userId, allowed);

  await addAllowedUser(userId);

  return ctx.answerCbQuery('User was allowed to open the gate');
});

bot.action(/deny_(.*)/, async (ctx) => {
  const issuingUserId = ctx.from?.id.toString();

  if (!issuingUserId || !adminUserIds.includes(issuingUserId)) {
    return ctx.reply('You are not allowed to do this');
  }

  const userId = ctx.match?.[1];

  if (!userId) {
    return ctx.reply('Something went wrong');
  }

  await Promise.all(
    adminUserIds
      .filter((id) => id !== issuingUserId)
      .map((adminUserId) =>
        ctx.telegram.sendMessage(adminUserId, `User ${userId} was denied access to open the gate by ${ctx.from?.first_name}`),
      ),
  );

  // eslint-disable-next-line @typescript-eslint/naming-convention
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

  if (ctx.callbackQuery.message && 'text' in ctx.callbackQuery.message) {
    await ctx.editMessageText(`${ctx.callbackQuery.message.text}\nDenied`);
  }

  await ctx.telegram.sendMessage(userId, accessDenied);

  return ctx.answerCbQuery('User was denied access to open the gate');
});

bot.command('open', async (ctx) => {
  const userId = ctx.from.id.toString();

  if (!authorize(userId)) {
    return ctx.reply(notAllowed);
  }

  try {
    await open();
  } catch (error) {
    if (error instanceof Error) {
      return ctx.reply(`${failedToOpen}\n${error.message}`);
    }

    return ctx.reply(failedToOpen);
  }

  return ctx.reply(opening);
});

bot.on(message(), (ctx) => ctx.reply(help));

await bot.telegram.setMyCommands([
  { command: 'open', description: 'Open the gate' },
  { command: 'check_authorization', description: 'Check if you are allowed to open the gate' },
  { command: 'request_access', description: 'Request access to open the gate' },
]);

process.once('SIGINT', () => {
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
});

await bot.launch();
