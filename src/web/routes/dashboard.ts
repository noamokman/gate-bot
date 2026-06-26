import { Router } from 'express';
import pMap from 'p-map';
import { open } from '../../services/open.js';
import { isWebUserAllowed, addPendingRequest } from '../../services/db.js';
import { botToken, adminUserIds, doorCode, parkingInfo, floor, unit, propertyNotes } from '../../framework/environment.js';
import { failedToOpen, opening, requestSent, alreadyAllowed } from '../../services/messages.js';

const router = Router();

const sendTelegram = (chatId: string, text: string, inlineKeyboard?: Record<string, string>[][]) => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const body: Record<string, unknown> = { chat_id: chatId, text };

  if (inlineKeyboard) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    body.reply_markup = { inline_keyboard: inlineKeyboard };
  }

  void fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
};

router.get('/status', (req, res): void => {
  const user = req.session.user!;
  const allowed = user.isAdmin || isWebUserAllowed(user.googleId);

  res.json({ allowed });
});

router.get('/', (req, res): void => {
  const user = req.session.user!;
  const allowed = user.isAdmin || isWebUserAllowed(user.googleId);

  res.render('dashboard', {
    user,
    isAllowed: allowed,
    doorCode: allowed && doorCode ? doorCode : null,
    parkingInfo: allowed ? parkingInfo ?? null : null,
    floor: allowed ? floor ?? null : null,
    unit: allowed ? unit ?? null : null,
    propertyNotes: allowed ? propertyNotes ?? null : null,
    message: null,
  });
});

router.post('/open', async (req, res): Promise<void> => {
  const user = req.session.user!;
  const allowed = user.isAdmin || isWebUserAllowed(user.googleId);

  if (!allowed) {
    res.render('dashboard', { user, isAllowed: false, doorCode: null, parkingInfo: null, floor: null, unit: null, propertyNotes: null, message: 'Not authorized' });
    return;
  }

  try {
    await open({
      userId: user.googleId,
      username: user.email,
      firstName: user.name,
      sourceType: 'web',
    });

    res.render('dashboard', { user, isAllowed: true, doorCode: doorCode ?? null, parkingInfo: parkingInfo ?? null, floor: floor ?? null, unit: unit ?? null, propertyNotes: propertyNotes ?? null, message: opening });
  } catch (error) {
    res.render('dashboard', {
      user,
      isAllowed: true,
      doorCode: doorCode ?? null,
      parkingInfo: parkingInfo ?? null,
      floor: floor ?? null,
      unit: unit ?? null,
      propertyNotes: propertyNotes ?? null,
      message: error instanceof Error ? `${failedToOpen}\n${error.message}` : failedToOpen,
    });
  }
});

router.post('/request-access', async (req, res): Promise<void> => {
  const user = req.session.user!;

  if (user.isAdmin || isWebUserAllowed(user.googleId)) {
    res.render('dashboard', { user, isAllowed: true, doorCode: doorCode ?? null, parkingInfo: parkingInfo ?? null, floor: floor ?? null, unit: unit ?? null, propertyNotes: propertyNotes ?? null, message: alreadyAllowed });
    return;
  }

  await addPendingRequest({
    id: `web:${user.googleId}`,
    sourceType: 'web',
    sourceUserId: user.googleId,
    name: user.name,
    email: user.email,
    requestedAt: new Date().toISOString(),
  });

  await pMap(adminUserIds, (adminId) => {
    sendTelegram(adminId, `Web access request\nName: ${user.name}\nEmail: ${user.email}\nGoogle ID: ${user.googleId}`, [
      [
        // eslint-disable-next-line @typescript-eslint/naming-convention
        { text: 'Allow✅', callback_data: `allow_${user.googleId}` },
        // eslint-disable-next-line @typescript-eslint/naming-convention
        { text: 'Deny⛔', callback_data: `deny_${user.googleId}` },
      ],
    ]);
  });

  res.render('dashboard', { user, isAllowed: false, doorCode: null, parkingInfo: null, floor: null, unit: null, propertyNotes: null, message: requestSent });
});

export { router as dashboardRouter };
