import { useMemo, useState } from "react";
import { avatarColor, formatTime, initials } from "../lib/format.ts";
import { useMessengerStore } from "../store/messengerStore.ts";
import type { Chat, ChatMessage } from "../types.ts";
import { LuPlus, LuSearch, LuSettings } from "react-icons/lu";

interface ChatSidebarProps {
  onNewChat: () => void;
  onSettings: () => void;
}

function lastMessage(
  messages: ChatMessage[],
  chatId: string,
): ChatMessage | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].chatId === chatId) return messages[index];
  }
  return undefined;
}

export function ChatSidebar({ onNewChat, onSettings }: ChatSidebarProps) {
  const [query, setQuery] = useState("");
  const chats = useMessengerStore((state) => state.chats);
  const messages = useMessengerStore((state) => state.messages);
  const activeChatId = useMessengerStore((state) => state.activeChatId);
  const setActiveChat = useMessengerStore((state) => state.setActiveChat);
  const needle = query.trim().toLowerCase();

  const visibleChats = useMemo(() => {
    const sorted = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!needle) return sorted;
    return sorted.filter((chat) => {
      const haystack =
        `${chat.title} ${chat.phone ?? ""} ${chat.username ?? ""}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [chats, needle]);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>Чаты</h1>
        <button type="button" className="plus-button" onClick={onNewChat}>
          <LuPlus size={18} />
        </button>
      </div>
      <label className="search">
        <LuSearch size={18} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск"
        />
      </label>
      <div className="chat-list">
        {visibleChats.length === 0 ? (
          <p className="list-empty">
            {needle
              ? "Ничего не найдено"
              : "Нет чатов. Нажмите +, чтобы начать."}
          </p>
        ) : (
          visibleChats.map((chat) => (
            <ChatRow
              key={chat.chatId}
              chat={chat}
              active={chat.chatId === activeChatId}
              message={lastMessage(messages, chat.chatId)}
              onSelect={() => setActiveChat(chat.chatId)}
            />
          ))
        )}
      </div>
      <footer className="sidebar-footer">
        <button type="button" className="settings-button" onClick={onSettings}>
          <LuSettings size={20} />
          Настройки
        </button>
      </footer>
    </aside>
  );
}

function ChatRow({
  chat,
  active,
  message,
  onSelect,
}: {
  chat: Chat;
  active: boolean;
  message?: ChatMessage;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? "chat-item active" : "chat-item"}
      onClick={onSelect}
    >
      <span className="avatar" style={{ background: avatarColor(chat.chatId) }}>
        {initials(chat.title)}
      </span>
      <span className="chat-item-body">
        <span className="chat-item-top">
          <span className={chat.unread > 0 ? "chat-name unread" : "chat-name"}>
            {chat.title}
          </span>
          {message ? (
            <time className="chat-time">{formatTime(message.timestamp)}</time>
          ) : null}
        </span>
        <span className="chat-item-bottom">
          <span className="chat-preview">
            {message?.text ?? "Нет сообщений"}
          </span>
          {chat.unread > 0 ? (
            <span className="unread-badge">{chat.unread}</span>
          ) : null}
        </span>
      </span>
    </button>
  );
}
