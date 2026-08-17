import { Low } from 'lowdb';
// eslint-disable-next-line import-x/extensions
import { JSONFile } from 'lowdb/node';
import type { PendingRequest, User } from '../types.js';
import { dbPath } from '../framework/environment.js';

interface Schema {
  users?: User[];
  pendingRequests?: PendingRequest[];
}

const adapter = new JSONFile<Schema>(dbPath);
const db = new Low(adapter, { users: [] });

await db.read();

export const isUserAllowed = (id: string, sourceType: 'telegram' | 'web') =>
  (db.data?.users ?? []).some((u) => u.id === id && u.sourceType === sourceType);

export const getUser = (id: string, sourceType: 'telegram' | 'web'): User | undefined =>
  (db.data?.users ?? []).find((u) => u.id === id && u.sourceType === sourceType);

export const getUsers = (sourceType?: 'telegram' | 'web') => {
  const all = db.data?.users ?? [];
  return sourceType ? all.filter((u) => u.sourceType === sourceType) : [...all];
};

export const addUser = async (user: User) => {
  if (!db.data?.users) {
    db.data = { users: [] };
  }

  db.data.users = db.data.users?.filter((u) => !(u.id === user.id && u.sourceType === user.sourceType)) ?? [];
  db.data.users.push(user);
  await db.write();
};

export const removeUser = async (id: string, sourceType: 'telegram' | 'web') => {
  db.data.users = (db.data.users ?? []).filter((u) => !(u.id === id && u.sourceType === sourceType));
  await db.write();
};

const mergeUser = (existing: User, incoming: User): User => {
  switch (incoming.sourceType) {
    case 'web': {
      if (existing.sourceType !== 'web') {
        return existing;
      }

      return {
        sourceType: 'web',
        id: existing.id,
        name: incoming.name ?? existing.name,
        email: incoming.email ?? existing.email,
        firstName: incoming.firstName ?? existing.firstName,
        lastName: incoming.lastName ?? existing.lastName,
        picture: incoming.picture ?? existing.picture,
      };
    }
    case 'telegram': {
      if (existing.sourceType !== 'telegram') {
        return existing;
      }

      return {
        sourceType: 'telegram',
        id: existing.id,
        name: incoming.name ?? existing.name,
        username: incoming.username ?? existing.username,
        firstName: incoming.firstName ?? existing.firstName,
        lastName: incoming.lastName ?? existing.lastName,
        picture: incoming.picture ?? existing.picture,
      };
    }
  }
};

export const updateUser = async (user: User) => {
  const users = db.data?.users ?? [];

  const index = users.findIndex((u) => u.id === user.id && u.sourceType === user.sourceType);

  if (index === -1) {
    return;
  }

  const existing = users[index];

  if (!existing) {
    return;
  }

  users[index] = mergeUser(existing, user);
  db.data.users = users;
  await db.write();
};

export const addPendingRequest = async (request: PendingRequest) => {
  db.data.pendingRequests = (db.data.pendingRequests ?? []).filter(
    (r) => !(r.sourceType === request.sourceType && r.sourceUserId === request.sourceUserId),
  );
  db.data.pendingRequests.push(request);
  await db.write();
};

export const updatePendingRequestPicture = async (sourceUserId: string, picture: string, requestToken: string): Promise<void> => {
  const request = (db.data.pendingRequests ?? []).find(
    (r) => r.sourceType === 'telegram' && r.sourceUserId === sourceUserId && 'requestToken' in r && r.requestToken === requestToken,
  );

  if (!request || !('picture' in request)) {
    return;
  }

  request.picture = picture;
  await db.write();
};

export const removePendingRequest = async (id: string) => {
  db.data.pendingRequests = (db.data.pendingRequests ?? []).filter((r) => r.id !== id);
  await db.write();
};

export const getPendingRequests = () => [...(db.data.pendingRequests ?? [])];
