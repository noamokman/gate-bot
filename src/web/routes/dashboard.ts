import { Router } from 'express';
import pMap from 'p-map';
import { open } from '../../services/open.js';
import { isWebUserAllowed, addPendingRequest } from '../../services/db.js';
import { botToken, adminUserIds, doorCode } from '../../framework/environment.js';
import { failedToOpen, opening, requestSent, alreadyAllowed } from '../../services/messages.js';

const router = Router();

const sendTelegram = (chatId: string, text: string) => {
  void fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // eslint-disable-next-line @typescript-eslint/naming-convention
    body: JSON.stringify({ chat_id: chatId, text }),
  });
};

router.get('/', (req, res): void => {
  const user = req.session.user!;
  const allowed = user.isAdmin || isWebUserAllowed(user.googleId);

  res.render('dashboard', {
    user,
    isAllowed: allowed,
    doorCode: allowed && doorCode ? doorCode : null,
    message: null,
  });
});

router.post('/open', async (req, res): Promise<void> => {
  const user = req.session.user!;
  const allowed = user.isAdmin || isWebUserAllowed(user.googleId);

  if (!allowed) {
    res.render('dashboard', { user, isAllowed: false, doorCode: null, message: 'Not authorized' });
    return;
  }

  try {
    await open({
      userId: user.googleId,
      usename: user.email,
      firstName: user.name,
    });

    res.render('dashboard', { user, isAllowed: true, doorCode: doorCode ?? null, message: opening });
  } catch (error) {
    res.render('dashboard', {
      user,
      isAllowed: true,
      doorCode: doorCode ?? null,
      message: error instanceof Error ? `${failedToOpen}\n${error.message}` : failedToOpen,
    });
  }
});

router.post('/request-access', async (req, res): Promise<void> => {
  const user = req.session.user!;

  if (user.isAdmin || isWebUserAllowed(user.googleId)) {
    res.render('dashboard', { user, isAllowed: true, doorCode: doorCode ?? null, message: alreadyAllowed });
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

  await pMap([...adminUserIds], (adminId) => {
    sendTelegram(adminId, `Web access request\nName: ${user.name}\nEmail: ${user.email}\nGoogle ID: ${user.googleId}`);
  });

  res.render('dashboard', { user, isAllowed: false, doorCode: null, message: requestSent });
});

export { router as dashboardRouter };
