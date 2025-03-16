import type { UserInfo } from '../types.js';
import { gateUrl } from '../framework/environment.js';

export const open = async (userInfo: UserInfo) => {
  if (!gateUrl) {
    return;
  }

  const response = await fetch(gateUrl, {
    method: 'POST',
    body: JSON.stringify(userInfo),
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to open the gate: ${response.statusText}`);
  }
};
