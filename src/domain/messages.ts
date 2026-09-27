import { formatPhone, phoneFromWaId } from '../lib/format.ts'
import type { Chat, InstanceData, MessageStatus, NotificationBody } from '../types.ts'

const HAPPY_RANK: Record<string, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
}

export function mergeStatus(current: MessageStatus | undefined, next: string): MessageStatus {
  if (next === 'failed' || next === 'noAccount') return next
  if (current === 'failed' || current === 'noAccount') return current
  if (next !== 'sent' && next !== 'delivered' && next !== 'read') {
    return current ?? 'sent'
  }
  const currentRank = HAPPY_RANK[current ?? 'pending'] ?? 0
  const nextRank = HAPPY_RANK[next]
  return nextRank >= currentRank ? next : (current ?? 'sent')
}

function textOf(body: NotificationBody): string | null {
  const data = body.messageData
  if (!data) return null
  const type = data.typeMessage
  if (type && type !== 'textMessage' && type !== 'extendedTextMessage' && type !== 'quotedMessage') {
    return null
  }
  const text = data.textMessageData?.textMessage ?? data.extendedTextMessageData?.text
  if (!text?.trim()) return null
  return text
}

function timestampOf(timestamp?: number): number {
  if (!timestamp) return Date.now()
  return timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp
}

function phoneOf(value?: number): string | undefined {
  if (!value || value <= 0) return undefined
  return String(value)
}

function titleOf(body: NotificationBody, chatId: string): string {
  const name = body.senderData?.chatName?.trim() || body.senderData?.senderName?.trim()
  if (name) return name
  const phone = phoneOf(body.senderData?.senderPhoneNumber) ?? phoneFromWaId(chatId)
  if (phone) return formatPhone(phone)
  return chatId
}

function findChat(chats: Chat[], incomingId: string, phone?: string): Chat | undefined {
  return chats.find(
    (chat) =>
      chat.chatId === incomingId ||
      chat.aliases?.includes(incomingId) ||
      (phone !== undefined && chat.phone === phone),
  )
}

function nextUnread(unread: number, direction: 'in' | 'out', active: boolean): number {
  if (direction !== 'in') return unread
  return active ? 0 : unread + 1
}

function applyStatus(instance: InstanceData, body: NotificationBody): InstanceData {
  const idMessage = body.idMessage ? String(body.idMessage) : ''
  const status = body.status
  if (!idMessage || !status) return instance

  let changed = false
  const messages = instance.messages.map((message) => {
    if (message.idMessage !== idMessage) return message
    const next = mergeStatus(message.status, status)
    const error =
      next === 'failed'
        ? 'Не удалось отправить сообщение'
        : next === 'noAccount'
          ? 'На этом номере нет WhatsApp'
          : undefined
    if (next === message.status && error === message.error) return message
    changed = true
    return { ...message, status: next, error }
  })

  return changed ? { ...instance, messages } : instance
}

function applyTextMessage(
  instance: InstanceData,
  body: NotificationBody,
  direction: 'in' | 'out',
): InstanceData {
  const text = textOf(body)
  const incomingId = body.senderData?.chatId ? String(body.senderData.chatId) : ''
  if (!text || !incomingId) return instance

  const timestamp = timestampOf(body.timestamp)
  const idMessage = body.idMessage ? String(body.idMessage) : undefined
  const phone =
    phoneOf(body.senderData?.senderPhoneNumber) ??
    phoneFromWaId(incomingId) ??
    phoneFromWaId(body.senderData?.sender)
  const known = findChat(instance.chats, incomingId, phone)
  const chatId = known?.chatId ?? incomingId

  if (idMessage && instance.messages.some((message) => message.idMessage === idMessage)) {
    return instance
  }

  if (direction === 'out') {
    const pending = instance.messages.find(
      (message) =>
        message.direction === 'out' &&
        message.chatId === chatId &&
        !message.idMessage &&
        message.text === text &&
        message.status === 'pending',
    )
    if (pending) {
      return {
        ...instance,
        messages: instance.messages.map((message) =>
          message.localId === pending.localId
            ? { ...message, idMessage, status: mergeStatus(message.status, 'sent'), error: undefined }
            : message,
        ),
      }
    }
  }

  const duplicate = instance.messages.some(
    (message) =>
      message.chatId === chatId &&
      message.direction === direction &&
      message.text === text &&
      message.timestamp === timestamp,
  )
  if (duplicate) return instance

  const active = instance.activeChatId === chatId
  const aliases =
    known && incomingId !== known.chatId && !known.aliases?.includes(incomingId)
      ? [...(known.aliases ?? []), incomingId]
      : known?.aliases
  const chats: Chat[] = known
    ? instance.chats.map((chat) =>
        chat.chatId === known.chatId
          ? {
              ...chat,
              updatedAt: timestamp,
              phone: chat.phone ?? phone,
              aliases,
              unread: nextUnread(chat.unread, direction, active),
            }
          : chat,
      )
    : [
        {
          chatId,
          title: titleOf(body, incomingId),
          phone,
          unread: direction === 'in' && !active ? 1 : 0,
          updatedAt: timestamp,
        },
        ...instance.chats,
      ]

  return {
    ...instance,
    chats,
    messages: [
      ...instance.messages,
      {
        localId: idMessage ? `remote-${idMessage}` : `remote-${chatId}-${timestamp}-${direction}`,
        idMessage,
        chatId,
        text,
        direction,
        timestamp,
        status: direction === 'out' ? 'sent' : undefined,
      },
    ],
  }
}

export function applyNotification(instance: InstanceData, body: NotificationBody): InstanceData {
  if (body.typeWebhook === 'outgoingMessageStatus') return applyStatus(instance, body)
  if (body.typeWebhook === 'incomingMessageReceived') return applyTextMessage(instance, body, 'in')
  if (body.typeWebhook === 'outgoingMessageReceived' || body.typeWebhook === 'outgoingAPIMessageReceived') {
    return applyTextMessage(instance, body, 'out')
  }
  return instance
}
