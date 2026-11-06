import { randomUUID } from 'node:crypto';
import type { ActivityActor, ActivityLogEntry, PendingRequest, UserInfo } from '../types.js';
import { addActivity, getUser, getUsers } from './db.js';
import type { AdminInfo, GateBotEvent } from './events.js';
import { onEvent } from './events.js';

const fullName = (firstName?: string, lastName?: string): string | undefined =>
  [firstName, lastName].filter(Boolean).join(' ') || undefined;

const findWebUserByEmail = (email?: string) => {
  if (!email) {
    return;
  }

  const found = getUsers('web').find((u) => u.sourceType === 'web' && u.email === email);

  return found?.sourceType === 'web' ? found : undefined;
};

const findTelegramUser = (userId?: string) => {
  if (!userId) {
    return;
  }

  const found = getUser(userId, 'telegram');

  return found?.sourceType === 'telegram' ? found : undefined;
};

const resolveAdminActor = (admin: AdminInfo | undefined): ActivityActor => {
  const webUser = findWebUserByEmail(admin?.email);
  const telegramUser = findTelegramUser(admin?.userId);
  const stored = webUser ?? telegramUser;

  return {
    id: admin?.userId ?? admin?.email ?? 'unknown',
    name: admin?.name ?? stored?.name,
    email: admin?.email ?? webUser?.email,
    username: telegramUser?.username,
    picture: stored?.picture,
    sourceType: webUser ? 'web' : telegramUser ? 'telegram' : undefined,
  };
};

const buildRequestActor = (request: PendingRequest): ActivityActor =>
  request.sourceType === 'telegram'
    ? {
        id: request.sourceUserId,
        name: request.name ?? request.username,
        username: request.username,
        picture: request.picture,
        sourceType: 'telegram',
      }
    : {
        id: request.sourceUserId,
        name: request.name,
        email: request.email,
        picture: request.picture,
        sourceType: 'web',
      };

const buildUserActor = (userInfo: UserInfo): ActivityActor => {
  const stored = getUser(userInfo.userId, userInfo.sourceType);

  return {
    id: userInfo.userId,
    name: stored?.name ?? fullName(userInfo.firstName, userInfo.lastName) ?? userInfo.username,
    username: userInfo.sourceType === 'telegram' ? userInfo.username : undefined,
    email: stored?.sourceType === 'web' ? stored.email : undefined,
    picture: stored?.picture,
    sourceType: userInfo.sourceType,
  };
};

const requestLabel = (request: PendingRequest): string =>
  request.name ?? (request.sourceType === 'telegram' ? request.username : undefined) ?? request.sourceUserId;

const buildEntry = (event: GateBotEvent): Omit<ActivityLogEntry, 'id' | 'timestamp'> | undefined => {
  switch (event.type) {
    case 'gate_opened': {
      return { action: 'gate_opened', actor: buildUserActor(event.userInfo) };
    }
    case 'gate_open_failed': {
      return { action: 'gate_open_failed', actor: buildUserActor(event.userInfo) };
    }
    case 'access_request_created': {
      return { action: 'access_requested', actor: buildRequestActor(event.request) };
    }
    case 'access_request_allowed': {
      return { action: 'access_allowed', actor: resolveAdminActor(event.admin), target: requestLabel(event.request) };
    }
    case 'access_request_denied': {
      return { action: 'access_denied', actor: resolveAdminActor(event.admin), target: requestLabel(event.request) };
    }
    case 'user_removed': {
      return { action: 'user_removed', actor: resolveAdminActor(event.admin), target: event.name ?? event.userId };
    }
  }
};

const recordActivity = async (event: GateBotEvent): Promise<void> => {
  const entry = buildEntry(event);

  if (!entry) {
    return;
  }

  await addActivity({ ...entry, id: randomUUID(), timestamp: new Date().toISOString() });
};

export const initActivityLog = (): void => {
  onEvent(recordActivity);
};
