import type { Request, Response } from 'express';

const supportedLocales = new Set(['en', 'ru', 'he']);

export const changeLanguage = (req: Request, res: Response): void => {
  const locale = req.body?.locale as string | undefined;

  if (locale && supportedLocales.has(locale)) {
    req.session.locale = locale;
    res.json({ ok: true });
    return;
  }

  res.status(400).json({ ok: false });
};
