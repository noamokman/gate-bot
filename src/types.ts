export interface UserInfo {
  userId: string;
  usename?: string;
  firstName: string;
  lastName?: string;
}

export interface WebSessionUser {
  googleId: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

export interface PendingRequest {
  id: string;
  sourceType: 'telegram' | 'web';
  sourceUserId: string;
  name?: string;
  email?: string;
  requestedAt: string;
}
