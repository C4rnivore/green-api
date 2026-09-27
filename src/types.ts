export interface Credentials {
  idInstance: string
  apiTokenInstance: string
  apiUrl: string
}

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'noAccount'

export interface ChatMessage {
  localId: string
  idMessage?: string
  chatId: string
  text: string
  direction: 'in' | 'out'
  timestamp: number
  status?: MessageStatus
  error?: string
}

export interface Chat {
  chatId: string
  title: string
  phone?: string
  username?: string
  aliases?: string[]
  unread: number
  updatedAt: number
}

export interface InstanceData {
  chats: Chat[]
  messages: ChatMessage[]
  activeChatId: string | null
}

export interface SenderData {
  chatId?: string
  chatName?: string
  sender?: string
  senderName?: string
  senderPhoneNumber?: number
}

export interface NotificationBody {
  typeWebhook?: string
  timestamp?: number
  idMessage?: string
  chatId?: string
  status?: string
  senderData?: SenderData
  messageData?: {
    typeMessage?: string
    textMessageData?: { textMessage?: string }
    extendedTextMessageData?: { text?: string }
  }
}

export interface GreenNotification {
  receiptId: number
  body: NotificationBody
}
