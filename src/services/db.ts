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

export const addPendingRequest = async (request: PendingRequest) => {
  db.data.pendingRequests = (db.data.pendingRequests ?? []).filter(
    (r) => !(r.sourceType === request.sourceType && r.sourceUserId === request.sourceUserId),
  );
  db.data.pendingRequests.push(request);
  await db.write();
};

export const removePendingRequest = async (id: string) => {
  db.data.pendingRequests = (db.data.pendingRequests ?? []).filter((r) => r.id !== id);
  await db.write();
};

export const getPendingRequests = () => [...(db.data.pendingRequests ?? [])];


