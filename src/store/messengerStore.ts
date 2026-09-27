import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyNotification, mergeStatus } from "../domain/messages.ts";
import type { Chat, ChatMessage, Credentials, InstanceData, NotificationBody } from "../types.ts";

interface MessengerState {
  credentials: Credentials | null;
  chats: Chat[];
  messages: ChatMessage[];
  activeChatId: string | null;
  setCredentials: (credentials: Credentials) => void;
  clearCredentials: () => void;
  setActiveChat: (chatId: string | null) => void;
  upsertChat: (chat: Pick<Chat, "chatId" | "title" | "phone" | "username" | "aliases">) => void;
  addOutgoing: (message: ChatMessage) => void;
  confirmOutgoing: (localId: string, idMessage: string) => void;
  failOutgoing: (localId: string, error: string) => void;
  applyNotification: (body: NotificationBody) => void;
}

const emptyData = {
  chats: [] as Chat[],
  messages: [] as ChatMessage[],
  activeChatId: null as string | null,
};

function sameAccount(current: Credentials | null, next: Credentials): boolean {
  return current?.apiUrl === next.apiUrl && current.idInstance === next.idInstance;
}

export const useMessengerStore = create<MessengerState>()(
  persist(
    (set) => ({
      credentials: null,
      ...emptyData,
      setCredentials: (credentials) =>
        set((state) =>
          sameAccount(state.credentials, credentials) ? { credentials } : { credentials, ...emptyData },
        ),
      clearCredentials: () => set({ credentials: null }),
      setActiveChat: (chatId) =>
        set((state) => ({
          activeChatId: chatId,
          chats: state.chats.map((chat) => (chat.chatId === chatId ? { ...chat, unread: 0 } : chat)),
        })),
      upsertChat: (input) =>
        set((state) => {
          const existing = state.chats.find(
            (chat) =>
              chat.chatId === input.chatId ||
              (input.phone !== undefined && chat.phone === input.phone) ||
              chat.aliases?.includes(input.chatId),
          );
          const updatedAt = Date.now();
          if (!existing) {
            return {
              activeChatId: input.chatId,
              chats: [{ ...input, unread: 0, updatedAt }, ...state.chats],
            };
          }
          return {
            activeChatId: existing.chatId,
            chats: state.chats.map((chat) =>
              chat.chatId === existing.chatId
                ? {
                    ...chat,
                    title: input.title,
                    phone: input.phone ?? chat.phone,
                    username: input.username ?? chat.username,
                    unread: 0,
                    updatedAt,
                  }
                : chat,
            ),
          };
        }),
      addOutgoing: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
          chats: state.chats.map((chat) =>
            chat.chatId === message.chatId ? { ...chat, updatedAt: message.timestamp } : chat,
          ),
        })),
      confirmOutgoing: (localId, idMessage) =>
        set((state) => ({
          messages: state.messages.some(
            (message) => message.idMessage === idMessage && message.localId !== localId,
          )
            ? state.messages.filter((message) => message.localId !== localId)
            : state.messages.map((message) =>
                message.localId === localId
                  ? { ...message, idMessage, status: mergeStatus(message.status, "sent"), error: undefined }
                  : message,
              ),
        })),
      failOutgoing: (localId, error) =>
        set((state) => ({
          messages: state.messages.map((message) =>
            message.localId === localId && message.status === "pending"
              ? { ...message, status: "failed", error }
              : message,
          ),
        })),
      applyNotification: (body) =>
        set((state) =>
          applyNotification(
            { chats: state.chats, messages: state.messages, activeChatId: state.activeChatId },
            body,
          ),
        ),
    }),
    {
      name: "green-api-whatsapp",
      version: 1,
      migrate: (persisted) => {
        const saved = persisted as {
          credentials?: Credentials | null;
          instances?: Record<string, InstanceData>;
          chats?: Chat[];
          messages?: ChatMessage[];
          activeChatId?: string | null;
        };
        const credentials = saved.credentials ?? null;
        const current =
          saved.chats !== undefined
            ? saved
            : credentials
              ? saved.instances?.[`${credentials.apiUrl}|${credentials.idInstance}`]
              : undefined;
        return {
          credentials,
          chats: current?.chats ?? [],
          messages: current?.messages ?? [],
          activeChatId: current?.activeChatId ?? null,
        };
      },
      partialize: (state) => ({
        credentials: state.credentials,
        chats: state.chats,
        messages: state.messages,
        activeChatId: state.activeChatId,
      }),
    },
  ),
);
