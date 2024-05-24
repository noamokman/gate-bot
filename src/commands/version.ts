import type { Telegraf } from 'telegraf';
import { readPackageUp } from 'read-package-up';
import { authorizeContext } from '../services/authorize.js';
import { notAllowed } from '../services/messages.js';
import { buildNumber } from '../framework/environment.js';

export const versionCommand = (bot: Telegraf) => {
  bot.command('version', async (ctx) => {
    if (!authorizeContext(ctx)) {
      await ctx.reply(notAllowed);
      return;
    }
    const result = await readPackageUp();

    if (!result?.packageJson) {
      await ctx.reply('Failed to read the version');
      return;
    }

    await ctx.reply(`The current version is ${result.packageJson.version}\nBuild number: ${buildNumber}`);
  });
};
