import { Router } from 'express';
import pMap from 'p-map';
import {
  addAllowedUser,
  removeAllowedUser,
  getAllowedUserIds,
  getPendingRequests,
  removePendingRequest,
  addWebUser,
  removeWebUser,
  getWebUsers,
} from '../../services/db.js';
import { botToken, adminUserIds } from '../../framework/environment.js';
import { allowed, accessDenied } from '../../services/messages.js';

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
  const pendingCount = getPendingRequests().length;
  const allowedCount = getWebUsers().length + getAllowedUserIds().length;

  res.render('admin/dashboard', {
    user: req.session.user,
    pendingCount,
    allowedCount,
  });
});

router.get('/pending', (req, res): void => {
  const pendingRequests = getPendingRequests();

  res.render('admin/pending', { user: req.session.user, pendingRequests });
});

router.post('/pending/:id/allow', async (req, res): Promise<void> => {
  const { id } = req.params;
  const pendingRequests = getPendingRequests();
  const request = pendingRequests.find((r) => r.id === id);

  if (!request) {
    res.status(404).send('Request not found');
    return;
  }

  const adminName = req.session.user!.name;
  const adminEmail = req.session.user!.email;

  if (request.sourceType === 'telegram') {
    await addAllowedUser(request.sourceUserId);

    sendTelegram(request.sourceUserId, allowed);

    await pMap([...adminUserIds], (adminId) => {
      sendTelegram(adminId, `User ${request.name ?? request.sourceUserId} was allowed by ${adminName} (${adminEmail}) via web admin`);
    });
  } else {
    await addWebUser(request.sourceUserId, { email: request.email ?? '', name: request.name ?? '' });
  }

  await removePendingRequest(id);

  res.redirect('/admin/pending');
});

router.post('/pending/:id/deny', async (req, res): Promise<void> => {
  const { id } = req.params;
  const pendingRequests = getPendingRequests();
  const request = pendingRequests.find((r) => r.id === id);

  if (!request) {
    res.status(404).send('Request not found');
    return;
  }

  const adminName = req.session.user!.name;
  const adminEmail = req.session.user!.email;

  if (request.sourceType === 'telegram') {
    sendTelegram(request.sourceUserId, accessDenied);

    await pMap([...adminUserIds], (adminId) => {
      sendTelegram(adminId, `User ${request.name ?? request.sourceUserId} was denied by ${adminName} (${adminEmail}) via web admin`);
    });
  }

  await removePendingRequest(id);

  res.redirect('/admin/pending');
});

router.get('/users', (req, res): void => {
  const telegramUsers = getAllowedUserIds().map((id) => ({
    sourceType: 'telegram' as const,
    sourceUserId: id,
    name: id,
    email: undefined as string | undefined,
  }));
  const webUsersList = getWebUsers().map((u) => ({
    sourceType: 'web' as const,
    sourceUserId: u.googleId,
    name: u.name,
    email: u.email,
  }));

  const allowedUsers = [...telegramUsers, ...webUsersList];

  res.render('admin/users', { user: req.session.user, allowedUsers });
});

router.post('/users/:sourceType/:id/remove', async (req, res): Promise<void> => {
  const { sourceType, id } = req.params;

  await (sourceType === 'telegram' ? removeAllowedUser(id) : removeWebUser(id));

  res.redirect('/admin/users');
});

export { router as adminRouter };
