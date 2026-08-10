import { Router } from 'express';
import pMap from 'p-map';
import { open } from '../../services/open.js';
import { isUserAllowed, addPendingRequest } from '../../services/db.js';
import { botToken, adminUserIds, doorCode, parkingInfo, floor, unit, propertyNotes, basicAuthUsers } from '../../framework/environment.js';
import { failedToOpen, opening, requestSent, alreadyAllowed } from '../../services/messages.js';
import { ensureAuth } from '../middleware.js';

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

const buildPropertyInfo = (allowed: boolean) => ({
  doorCode: allowed && doorCode ? doorCode : null,
  parkingInfo: allowed && parkingInfo ? parkingInfo : null,
  floor: allowed && floor ? floor : null,
  unit: allowed && unit ? unit : null,
  propertyNotes: allowed && propertyNotes ? propertyNotes : null,
});

router.get('/', (req, res): void => {
  const { user } = req.session;

  if (!user) {
    const error = req.query.error as string | undefined;

    res.render('login', { showPasswordLogin: basicAuthUsers.length > 0, error });
    return;
  }

  const allowed = user.isAdmin || isUserAllowed(user.id, 'web');

  res.render('dashboard', {
    user,
    isAllowed: allowed,
    ...buildPropertyInfo(allowed),
    message: null,
  });
});

router.get('/status', ensureAuth, (req, res): void => {
  const user = req.session.user!;
  const allowed = user.isAdmin || isUserAllowed(user.id, 'web');

  res.json({ allowed });
});

router.post('/open', ensureAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;
  const allowed = user.isAdmin || isUserAllowed(user.id, 'web');

  if (!allowed) {
    res.status(403).json({ ok: false, message: 'Not authorized' });
    return;
  }

  try {
    await open({
      userId: user.id,
      username: user.email || user.name,
      firstName: user.name,
      sourceType: 'web',
    });

    res.json({ ok: true, message: opening });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error instanceof Error ? `${failedToOpen}\n${error.message}` : failedToOpen,
    });
  }
});

router.post('/request-access', ensureAuth, async (req, res): Promise<void> => {
  const user = req.session.user!;

  if (user.isAdmin || isUserAllowed(user.id, 'web')) {
    res.render('dashboard', { user, isAllowed: true, ...buildPropertyInfo(true), message: alreadyAllowed });
    return;
  }

  if (user.provider !== 'google') {
    res.status(400).send('Access requests are only supported for Google accounts');
    return;
  }

  const request = {
    id: `web:${user.id}`,
    sourceType: 'web' as const,
    sourceUserId: user.id,
    name: user.name,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    picture: user.picture,
    requestedAt: new Date().toISOString(),
  };

  await addPendingRequest(request);

  await pMap(adminUserIds, (adminId) => {
    sendTelegram(adminId, `Web access request\nName: ${user.name}\nEmail: ${user.email}\nUser ID: ${user.id}`, [
      [
        // eslint-disable-next-line @typescript-eslint/naming-convention
        { text: 'Allow✅', callback_data: `allow_${request.id}` },
        // eslint-disable-next-line @typescript-eslint/naming-convention
        { text: 'Deny⛔', callback_data: `deny_${request.id}` },
      ],
    ]);
  });

  res.render('dashboard', { user, isAllowed: false, ...buildPropertyInfo(false), message: requestSent });
});

export { router as dashboardRouter };
