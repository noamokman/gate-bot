import { Low } from 'lowdb';
// eslint-disable-next-line import-x/extensions
import { JSONFile } from 'lowdb/node';
import { dbPath } from '../framework/environment.js';

const adapter = new JSONFile<{ allowedUserIds?: string[] }>(dbPath);
const db = new Low(adapter, { allowedUserIds: [] });

await db.read();

export const isAllowedUser = (userId: string) => !!db.data?.allowedUserIds?.includes(userId);

export const addAllowedUser = (userId: string) => {
  if (!db.data?.allowedUserIds) {
    db.data = { allowedUserIds: [] };
  }

  db.data.allowedUserIds?.push(userId);

  return db.write();
};
