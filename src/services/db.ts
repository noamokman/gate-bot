import { Low } from 'lowdb';
// eslint-disable-next-line import-x/extensions
import { JSONFile } from 'lowdb/node';
import type { PendingRequest } from '../types.js';
import { dbPath } from '../framework/environment.js';

interface WebUserRecord {
  googleId: string;
  email: string;
  name: string;
  allowed: boolean;
}

interface Schema {
  allowedUserIds?: string[];
  webUsers?: Record<string, WebUserRecord>;
  pendingRequests?: PendingRequest[];
}

const adapter = new JSONFile<Schema>(dbPath);
const db = new Low(adapter, { allowedUserIds: [] });

await db.read();

export const isAllowedUser = (userId: string) => !!db.data?.allowedUserIds?.includes(userId);

export const getAllowedUserIds = () => [...(db.data?.allowedUserIds ?? [])];

export const addAllowedUser = (userId: string) => {
  if (!db.data?.allowedUserIds) {
    db.data = { allowedUserIds: [] };
  }

  db.data.allowedUserIds?.push(userId);

  return db.write();
};

export const removeAllowedUser = async (userId: string) => {
  db.data.allowedUserIds = (db.data.allowedUserIds ?? []).filter((id) => id !== userId);
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

export const addWebUser = async (googleId: string, info: { email: string; name: string }) => {
  if (!db.data.webUsers) {
    db.data.webUsers = {};
  }
  db.data.webUsers[googleId] = { googleId, ...info, allowed: true };
  await db.write();
};

export const isWebUserAllowed = (googleId: string) => db.data.webUsers?.[googleId]?.allowed ?? false;

export const getWebUsers = () => Object.values(db.data.webUsers ?? {}).filter((u) => u.allowed);

export const removeWebUser = async (googleId: string) => {
  if (db.data.webUsers) {
    delete db.data.webUsers[googleId];
  }
  await db.write();
};


