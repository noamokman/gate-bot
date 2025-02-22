import { gateUrl } from '../framework/environment.js';

export const open = async (userId: string) => {
  if (!gateUrl) {
    return;
  }

  const response = await fetch(gateUrl, {
    method: 'POST',
    body: JSON.stringify({ userId }),
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to open the gate: ${response.statusText}`);
  }
};
