export const welcome = 'Welcome to the gate!👋🏻';

export const notAllowed = (userId: string) =>
  `Looks like you are not allowed to open the gate⛔🙅🏻\nPlease ask the owner to add you to the list of allowed users\nYour user id is: ${userId}\nTo check if you are allowed to open the gate, try using /check_authorization`;

export const allowed = 'You are allowed to open the gate!🥳🎉\nTry using /open to open the gate';

export const opening = 'Opening...🔓';

export const failedToOpen = 'Failed to open the gate⚠️';

export const help = 'Try using /open to open the gate, or /check_authorization to check if you are allowed to open the gate';
