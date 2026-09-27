import { useMutation } from "@tanstack/react-query";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { MAX_MESSAGE_LENGTH } from "../api/apiConfig.ts";
import { errorText } from "../api/apiUtils.ts";
import { sendMessage } from "../api/greenApi.ts";
import {
  avatarColor,
  chatSubtitle,
  formatDay,
  formatTime,
  initials,
} from "../lib/format.ts";
import { useMessengerStore } from "../store/messengerStore.ts";
import type { ChatMessage, MessageStatus } from "../types.ts";
import {
  LuArrowUp,
  LuCheck,
  LuCheckCheck,
  LuChevronLeft,
  LuClock,
} from "react-icons/lu";

export function ChatWindow() {
  const chats = useMessengerStore((state) => state.chats);
  const storedMessages = useMessengerStore((state) => state.messages);
  const activeChatId = useMessengerStore((state) => state.activeChatId);
  const setActiveChat = useMessengerStore((state) => state.setActiveChat);
  const credentials = useMessengerStore((state) => state.credentials);
  const addOutgoing = useMessengerStore((state) => state.addOutgoing);
  const confirmOutgoing = useMessengerStore((state) => state.confirmOutgoing);
  const failOutgoing = useMessengerStore((state) => state.failOutgoing);
  const [draft, setDraft] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [draftChatId, setDraftChatId] = useState(activeChatId);
  const threadRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  const chat = chats.find((item) => item.chatId === activeChatId) ?? null;
  const messages = useMemo(
    () => storedMessages.filter((message) => message.chatId === chat?.chatId),
    [storedMessages, chat?.chatId],
  );

  const mutation = useMutation({
    mutationFn: async (payload: {
      localId: string;
      chatId: string;
      text: string;
    }) => {
      const current = useMessengerStore.getState().credentials;
      if (!current) throw new Error("Нет учётных данных");
      return sendMessage(current, payload.chatId, payload.text);
    },
    onSuccess: (idMessage, payload) => {
      confirmOutgoing(payload.localId, idMessage);
    },
    onError: (error, payload) => {
      failOutgoing(payload.localId, errorText(error));
    },
  });

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    thread.scrollTop = thread.scrollHeight;
  }, [messages.length, chat?.chatId]);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, 140)}px`;
  }, [draft]);

  if (draftChatId !== activeChatId) {
    setDraftChatId(activeChatId);
    setDraft("");
    setLocalError(null);
  }

  function submit() {
    const text = draft.trim();
    if (!text || !chat || !credentials) return;
    if (text.length > MAX_MESSAGE_LENGTH) {
      setLocalError(`Сообщение длиннее ${MAX_MESSAGE_LENGTH} символов`);
      return;
    }
    const localId = crypto.randomUUID();
    setDraft("");
    setLocalError(null);
    addOutgoing({
      localId,
      chatId: chat.chatId,
      text,
      direction: "out",
      timestamp: Date.now(),
      status: "pending",
    });
    mutation.mutate({ localId, chatId: chat.chatId, text });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  if (!chat) {
    return (
      <section className="chat-pane">
        <div className="chat-body">
          <div className="empty-chat">
            <div className="empty-card">
              <h2>Выберите чат</h2>
              <p>Или создайте новый по номеру телефона.</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const groups = groupByDay(messages);

  return (
    <section className="chat-pane">
      <header className="chat-header">
        <button
          type="button"
          className="icon-button"
          onClick={() => setActiveChat(null)}
        >
          <LuChevronLeft size={22} />
        </button>
        <span
          className="avatar small"
          style={{ background: avatarColor(chat.chatId) }}
        >
          {initials(chat.title)}
        </span>
        <span className="chat-heading">
          <strong>{chat.title}</strong>
          <span>{chatSubtitle(chat)}</span>
        </span>
      </header>
      <div className="chat-body">
        <div className="chat-thread" ref={threadRef} role="log">
          {groups.length === 0 ? (
            <div className="empty-chat">
              <div className="empty-card">
                <p>Напишите первое сообщение</p>
              </div>
            </div>
          ) : (
            groups.map((group) => (
              <div className="day-group" key={group.day}>
                <div className="day-chip">{group.day}</div>
                {group.items.map((message) => (
                  <MessageBubble key={message.localId} message={message} />
                ))}
              </div>
            ))
          )}
        </div>
        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="composer-bar">
            <textarea
              ref={fieldRef}
              rows={1}
              value={draft}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="Сообщение"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
            />
            <button
              className="send-button"
              type="submit"
              disabled={!draft.trim()}
            >
              <LuArrowUp size={18} />
            </button>
          </div>
          {localError ? (
            <p className="form-error composer-error">{localError}</p>
          ) : null}
        </form>
      </div>
    </section>
  );
}

function groupByDay(
  messages: ChatMessage[],
): { day: string; items: ChatMessage[] }[] {
  const groups: { day: string; items: ChatMessage[] }[] = [];
  for (const message of messages) {
    const day = formatDay(message.timestamp);
    const last = groups[groups.length - 1];
    if (!last || last.day !== day) groups.push({ day, items: [message] });
    else last.items.push(message);
  }
  return groups;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  return (
    <article
      className={message.direction === "out" ? "bubble out" : "bubble in"}
    >
      <p>
        {message.text}
        <span className="bubble-meta">
          <time dateTime={new Date(message.timestamp).toISOString()}>
            {formatTime(message.timestamp)}
          </time>
          {message.direction === "out" ? (
            <StatusMark status={message.status} />
          ) : null}
        </span>
      </p>
      {message.error ? (
        <span className="bubble-error">{message.error}</span>
      ) : null}
    </article>
  );
}

function StatusMark({ status }: { status?: MessageStatus }) {
  if (status === "pending") return <LuClock size={12} />;
  if (status === "read") {
    return (
      <span className="ticks read">
        <LuCheckCheck size={16} />
      </span>
    );
  }
  if (status === "delivered") return <LuCheckCheck size={16} />;
  if (status === "sent") return <LuCheck size={14} />;
  return null;
}
