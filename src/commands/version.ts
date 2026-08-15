import type { Telegraf } from 'telegraf';
import { readPackageUp } from 'read-package-up';
import { authorizeContext } from '../services/authorize.js';
import { notAllowed } from '../services/messages.js';
import { buildVersion } from '../framework/environment.js';
import { sendMessage } from '../services/telegram.js';

export const versionCommand = (bot: Telegraf) => {
  bot.command('version', async (ctx) => {
    if (!authorizeContext(ctx)) {
      await sendMessage(ctx.chat.id, notAllowed);
      return;
    }
    const result = await readPackageUp();

    if (!result?.packageJson) {
      await sendMessage(ctx.chat.id, 'Failed to read the version');
      return;
    }

    await sendMessage(ctx.chat.id, `The current version is ${result.packageJson.version}\nBuild version: ${buildVersion}`);
  });
};
