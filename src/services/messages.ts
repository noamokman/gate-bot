import { doorCode } from '../framework/environment.js';

export const welcome = 'Welcome to the gate!👋🏻';

export const notAllowed =
  'Looks like you are not an allowed user⛔🙅🏻\nTo request access, use /request_access\nTo check if you have been approved, use /check_authorization';

export const allowed = 'You are allowed to open the gate!🥳🎉';

export const opening = 'Opening...🔓';

export const failedToOpen = 'Failed to open the gate⚠️';

export const helpAllowed = 'Use /open to open the gate🔑\nTo check the door code, use /door_code 🔢';

export const alreadyAllowed = 'You are already allowed to open the gate!🥳🎉';

export const requestSent = 'Request sent!📨';

export const accessDenied = 'Your access to this bot has been denied⛔🙅🏻';

export const doorCodeDetails = doorCode ? `The door code is 🔢\n${doorCode}` : 'The door code is not set.';
