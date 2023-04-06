import { allowedUserIds } from '../framework/environment.js';

export const authorize = (userId: string) => allowedUserIds.includes(userId);
