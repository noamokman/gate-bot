import type { Request, Response } from 'express';
import { addUser, removeUser as removeDbUser, getUsers, getPendingRequests, removePendingRequest } from '../../services/db.js';
import { publish } from '../../services/events.js';

export const adminDashboard = (req: Request, res: Response): void => {
  const pendingCount = getPendingRequests().length;
  const allowedCount = getUsers().length;

  res.render('admin/dashboard', {
    user: req.session.user,
    pendingCount,
    allowedCount,
  });
};

export const adminPending = (req: Request, res: Response): void => {
  const pendingRequests = getPendingRequests();

  res.render('admin/pending', { user: req.session.user, pendingRequests });
};

export const allowRequest = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const pendingRequests = getPendingRequests();
  const request = pendingRequests.find((r) => r.id === id);

  if (!request) {
    res.status(404).json({ ok: false, message: 'Request not found' });
    return;
  }

  const adminName = req.session.user!.name;
  const adminEmail = req.session.user!.email;

  await addUser(
    request.sourceType === 'telegram'
      ? {
          sourceType: 'telegram',
          id: request.sourceUserId,
          name: request.name,
          username: request.username,
          firstName: request.firstName,
          lastName: request.lastName,
          picture: request.picture,
        }
      : {
          sourceType: 'web',
          id: request.sourceUserId,
          name: request.name ?? '',
          email: request.email ?? '',
          firstName: request.firstName,
          lastName: request.lastName,
          picture: request.picture,
        },
  );

  await publish({
    type: 'access_request_allowed',
    request,
    admin: { name: adminName, email: adminEmail },
  });

  await removePendingRequest(id);

  res.json({ ok: true });
};

export const denyRequest = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const pendingRequests = getPendingRequests();
  const request = pendingRequests.find((r) => r.id === id);

  if (!request) {
    res.status(404).json({ ok: false, message: 'Request not found' });
    return;
  }

  const adminName = req.session.user!.name;
  const adminEmail = req.session.user!.email;

  if (request.sourceType === 'telegram') {
    await publish({
      type: 'access_request_denied',
      request,
      admin: { name: adminName, email: adminEmail },
    });
  }

  await removePendingRequest(id);

  res.json({ ok: true });
};

export const adminUsers = (req: Request, res: Response): void => {
  const allowedUsers = getUsers().map((u) => {
    if (u.sourceType === 'telegram') {
      return {
        sourceType: 'telegram' as const,
        sourceUserId: u.id,
        name: u.name ?? u.username ?? u.id,
        email: u.username ? `@${u.username}` : undefined,
        firstName: u.firstName,
        lastName: u.lastName,
        picture: u.picture,
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
};

export const removeUser = async (req: Request, res: Response): Promise<void> => {
  const { sourceType, id } = req.params as { sourceType: string; id: string };

  await removeDbUser(id, sourceType as 'telegram' | 'web');

  res.json({ ok: true });
};
