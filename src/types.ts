export interface UserInfo {
  userId: string;
  username?: string;
  firstName: string;
  lastName?: string;
  sourceType: 'telegram' | 'web';
}

export interface GoogleSessionUser {
  provider: 'google';
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  picture: string;
  isAdmin: boolean;
}

export interface PasswordSessionUser {
  provider: 'password';
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

export type WebSessionUser = GoogleSessionUser | PasswordSessionUser;

export interface TelegramUser {
  sourceType: 'telegram';
  id: string;
  name?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
}

export interface WebUser {
  sourceType: 'web';
  id: string;
  name: string;
  email: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
}

export type User = TelegramUser | WebUser;

export interface GoogleUserInfo {
  id: string;
  email: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  verified_email: boolean;
  name: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  given_name: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  family_name: string;
  picture: string;
  locale?: string;
}

export interface TelegramPendingRequest {
  id: string;
  sourceType: 'telegram';
  sourceUserId: string;
  name?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  requestedAt: string;
  requestToken?: string;
}

export interface WebPendingRequest {
  id: string;
  sourceType: 'web';
  sourceUserId: string;
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  picture: string;
  requestedAt: string;
}

export type PendingRequest = TelegramPendingRequest | WebPendingRequest;
