import { adminUserIds } from '../framework/environment.js';
import { isAllowedUser } from './db.js';

export const authorize = (userId: string) => adminUserIds.includes(userId) || isAllowedUser(userId);
export const isAdmin = (userId: string) => adminUserIds.includes(userId);
