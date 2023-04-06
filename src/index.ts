import 'dotenv/config.js';
import { Telegraf } from 'telegraf';
// eslint-disable-next-line import/extensions
import { message } from 'telegraf/filters';
import { botToken } from './framework/environment.js';
import { open } from './services/open.js';
import { authorize } from './services/authorize.js';
import { allowed, failedToOpen, help, notAllowed, opening, welcome } from './services/messages.js';

const bot = new Telegraf(botToken);

bot.start((ctx) => {
  const userId = ctx.from.id.toString();

  if (!authorize(userId)) {
    return ctx.reply(`${welcome}\n${notAllowed(userId)}`);
  }

  return ctx.reply(`${welcome}\nTry using /open to open the gate`);
});
bot.help((ctx) => ctx.reply(help));

bot.command('check_authorization', async (ctx) => {
  const userId = ctx.from.id.toString();

  if (!authorize(userId)) {
    return ctx.reply(notAllowed(userId));
  }

  return ctx.reply(allowed);
});

bot.command('open', async (ctx) => {
  const userId = ctx.from.id.toString();

  if (!authorize(userId)) {
    return ctx.reply(notAllowed(userId));
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
]);

process.once('SIGINT', () => {
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
});

await bot.launch();
