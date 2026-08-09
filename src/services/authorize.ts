import type { Context } from 'telegraf';
import { adminUserIds } from '../framework/environment.js';
import { isUserAllowed } from './db.js';

export const isAdmin = (userId: string) => adminUserIds.has(userId);
export const authorize = (userId: string) => isAdmin(userId) || isUserAllowed(userId, 'telegram');
export const authorizeContext = (ctx: Context) => {
  const userId = ctx.from?.id.toString();

  return !!userId && authorize(userId);
};
