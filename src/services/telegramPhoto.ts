import type { Telegram } from 'telegraf';

export const getTelegramProfilePhoto = async (telegram: Telegram, userId: number): Promise<string | undefined> => {
  try {
    const { photos } = await telegram.getUserProfilePhotos(userId);
    const photo = photos[0]?.at(-1);

    if (!photo) {
      return undefined;
    }

    const link = await telegram.getFileLink(photo.file_id);

    return link.href;
  } catch {
    return undefined;
  }
};
