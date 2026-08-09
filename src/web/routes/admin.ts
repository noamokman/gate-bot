import { Router } from 'express';
import pMap from 'p-map';
import {
  addUser,
  removeUser,
  getUsers,
  getPendingRequests,
  removePendingRequest,
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
  const allowedCount = getUsers().length;

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
    await addUser({
      sourceType: 'telegram',
      id: request.sourceUserId,
      name: request.name,
      username: request.username,
      firstName: request.firstName,
      lastName: request.lastName,
    });

    sendTelegram(request.sourceUserId, allowed);

    await pMap([...adminUserIds], (adminId) => {
      sendTelegram(adminId, `User ${request.name ?? request.sourceUserId} was allowed by ${adminName} (${adminEmail}) via web admin`);
    });
  } else {
    await addUser({
      sourceType: 'web',
      id: request.sourceUserId,
      name: request.name ?? '',
      email: request.email ?? '',
      firstName: request.firstName,
      lastName: request.lastName,
      picture: request.picture,
    });
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
  const allowedUsers = getUsers().map((u) => {
    if (u.sourceType === 'telegram') {
      return {
        sourceType: 'telegram' as const,
        sourceUserId: u.id,
        name: u.name ?? u.username ?? u.id,
        email: u.username ? `@${u.username}` : undefined,
        firstName: u.firstName,
        lastName: u.lastName,
        picture: undefined as string | undefined,
      };
    }

    return {
      sourceType: 'web' as const,
      sourceUserId: u.id,
      name: u.name,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      picture: u.picture,
    };
  });

  res.render('admin/users', { user: req.session.user, allowedUsers });
});

router.post('/users/:sourceType/:id/remove', async (req, res): Promise<void> => {
  const { sourceType, id } = req.params;

  await removeUser(id, sourceType as 'telegram' | 'web');

  res.redirect('/admin/users');
});

export { router as adminRouter };
