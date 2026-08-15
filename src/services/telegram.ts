import type { Telegraf, Telegram } from 'telegraf';
import { Markup } from 'telegraf';
import type { InlineKeyboardMarkup } from 'telegraf/types';
import pMap from 'p-map';
import type { PendingRequest } from '../types.js';
import { adminUserIds } from '../framework/environment.js';
import type { AdminInfo, GateBotEvent, TelegramMessageRef } from './events.js';
import { onEvent } from './events.js';
import { accessDenied, allowed } from './messages.js';

let telegram: Telegram;

export const sendMessage = async (chatId: string | number, text: string, replyMarkup?: InlineKeyboardMarkup): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  await telegram.sendMessage(chatId, text, replyMarkup ? { reply_markup: replyMarkup } : undefined);
};

const trySendMessage = async (chatId: string | number, text: string, replyMarkup?: InlineKeyboardMarkup): Promise<void> => {
  try {
    await sendMessage(chatId, text, replyMarkup);
  } catch (error) {
    console.error(`Failed to send Telegram message to ${chatId}`, error);
  }
};

export const editMessageText = async (chatId: string | number, messageId: number, text: string): Promise<void> => {
  await telegram.editMessageText(chatId, messageId, undefined, text);
};

export const editMessageReplyMarkup = async (chatId: string | number, messageId: number): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  await telegram.editMessageReplyMarkup(chatId, messageId, undefined, { inline_keyboard: [] });
};

export const answerCallbackQuery = async (callbackQueryId: string, text?: string): Promise<void> => {
  await telegram.answerCbQuery(callbackQueryId, text);
};

const buildAccessRequestAdminText = (request: PendingRequest): string => {
  if (request.sourceType === 'telegram') {
    return `Request recieved\nusername: ${request.username}\nFull name: ${request.firstName} ${request.lastName}\nId: ${request.sourceUserId}`;
  }

  return `Web access request\nName: ${request.name}\nEmail: ${request.email}\nUser ID: ${request.sourceUserId}`;
};

const buildAdminLabel = (admin?: AdminInfo): string => {
  if (admin?.email) {
    return `${admin.name ?? ''} (${admin.email}) via web admin`;
  }

  return admin?.name ?? admin?.userId ?? 'an admin';
};

const buildResolutionAdminText = (request: PendingRequest, admin: AdminInfo | undefined, action: 'allowed' | 'denied'): string => {
  const who =
    request.sourceType === 'web'
      ? `Web user ${request.name ?? request.id} (${request.email ?? ''})`
      : `User ${request.name ?? request.sourceUserId}`;
  const verb = action === 'allowed' ? 'was allowed to open the gate by' : 'was denied access to open the gate by';

  return `${who} ${verb} ${buildAdminLabel(admin)}`;
};

const sendAccessRequestToAdmins = async (request: PendingRequest): Promise<void> => {
  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback('Allow✅', `allow_${request.id}`),
    Markup.button.callback('Deny⛔', `deny_${request.id}`),
  ]).reply_markup;

  await pMap([...adminUserIds], (adminId) => trySendMessage(adminId, buildAccessRequestAdminText(request), keyboard));
};

const editResolvedMessage = async (
  messageRef: TelegramMessageRef,
  request: PendingRequest,
  action: 'allowed' | 'denied',
): Promise<void> => {
  try {
    await editMessageReplyMarkup(messageRef.chatId, messageRef.messageId);
    await editMessageText(
      messageRef.chatId,
      messageRef.messageId,
      `${buildAccessRequestAdminText(request)}\n${action === 'allowed' ? 'Approved' : 'Denied'}`,
    );
  } catch (error) {
    console.error(`Failed to edit resolved request message in chat ${messageRef.chatId}`, error);
  }
};

const handleEvent = async (event: GateBotEvent): Promise<void> => {
  switch (event.type) {
    case 'gate_opened': {
      break;
    }
    case 'gate_open_failed': {
      break;
    }
    case 'access_request_created': {
      await sendAccessRequestToAdmins(event.request);
      break;
    }
    case 'access_request_allowed':
    case 'access_request_denied': {
      const { request, admin, messageRef } = event;

      if (request.sourceType === 'telegram') {
        await trySendMessage(request.sourceUserId, event.type === 'access_request_allowed' ? allowed : accessDenied);
      }

      const action = event.type === 'access_request_allowed' ? 'allowed' : 'denied';
      const adminIds = [...adminUserIds].filter((id) => id !== admin?.userId);

      await pMap(adminIds, (adminId) => trySendMessage(adminId, buildResolutionAdminText(request, admin, action)));

      if (messageRef) {
        await editResolvedMessage(messageRef, request, action);
      }

      break;
    }
  }
};

export const initTelegram = (bot: Telegraf) => {
  const { telegram: botTelegram } = bot;

  telegram = botTelegram;

  onEvent(handleEvent);
};
