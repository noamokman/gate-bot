import { gateUrl } from '../framework/environment.js';

export const open = async () => {
  const response = await fetch(gateUrl, { method: 'POST' });

  if (!response.ok) {
    throw new Error(`Failed to open the gate: ${response.statusText}`);
  }
};
