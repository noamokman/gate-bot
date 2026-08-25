import type { UserInfo } from '../types.js';
import { gateUrl } from '../framework/environment.js';

const GATE_TIMEOUT_MS = 10_000;

export const open = async (userInfo: UserInfo) => {
  if (!gateUrl) {
    return;
  }

  const response = await fetch(gateUrl, {
    method: 'POST',
    body: JSON.stringify(userInfo),
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(GATE_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Failed to open the gate: ${response.statusText}`);
  }
};
