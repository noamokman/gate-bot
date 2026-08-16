import { readFile } from 'node:fs/promises';
import type { Telegram } from 'telegraf';
import type { User } from 'telegraf/types';
import { botToken, logoJpgPath } from '../framework/environment.js';

const PHOTO_TIMEOUT_MS = 10_000;

export const setBotPhotoIfMissing = async (telegram: Telegram, me?: User): Promise<void> => {
  try {
    const bot = me ?? (await telegram.getMe());
    const chat = await telegram.getChat(bot.id);

    if (chat.photo) {
      return;
    }

    const form = new FormData();
    form.append('photo', JSON.stringify({ type: 'static', photo: 'attach://photo' }));
    form.append('photo', new Blob([await readFile(logoJpgPath)], { type: 'image/jpeg' }), 'logo.jpg');

    const response = await fetch(`https://api.telegram.org/bot${botToken}/setMyProfilePhoto`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(PHOTO_TIMEOUT_MS),
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { description?: string } | null;
      throw new Error(error?.description ?? `Telegram API responded with status ${response.status}`);
    }

    console.log('Bot profile photo set');
  } catch (error) {
    console.error('Failed to set bot profile photo', error);
  }
};

export const getTelegramProfilePhoto = async (telegram: Telegram, userId: number): Promise<string | undefined> => {
  try {
    const { photos } = await telegram.getUserProfilePhotos(userId, 0, 1);
    const photo = photos[0]?.[0];

    if (!photo) {
      return undefined;
    }

    const file = await telegram.getFile(photo.file_id);

    if (!file.file_path) {
      return undefined;
    }

    const response = await fetch(`https://api.telegram.org/file/bot${botToken}/${file.file_path}`, {
      signal: AbortSignal.timeout(PHOTO_TIMEOUT_MS),
    });

    if (!response.ok) {
      await response.body?.cancel();
      return undefined;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error('Failed to get Telegram profile photo', error);
    return undefined;
  }
};
