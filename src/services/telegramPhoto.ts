import type { Telegram } from 'telegraf';
import { botToken } from '../framework/environment.js';

const PHOTO_TIMEOUT_MS = 10_000;

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
  } catch {
    return undefined;
  }
};
