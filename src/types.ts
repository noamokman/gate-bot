export interface UserInfo {
  userId: string;
  username?: string;
  firstName: string;
  lastName?: string;
  sourceType: 'telegram' | 'web';
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

