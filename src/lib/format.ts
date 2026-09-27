const MONTHS = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];
const AVATAR_COLORS = [
  "#5b8def",
  "#7c6aef",
  "#3aa9a0",
  "#e07a3d",
  "#d45d7a",
  "#4c9a4a",
];

export function formatPhone(phone?: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("7")) {
    return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
  }
  return digits ? `+${digits}` : phone;
}

export function normalizePhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 11 || digits.length > 16) return null;
  return digits;
}

export function phoneFromWaId(value?: string): string | undefined {
  if (!value) return undefined;
  const match = value.match(/(\d{10,16})@c\.us/);
  return match?.[1];
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatDay(timestamp: number): string {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, "0");
  return `${day} ${MONTHS[date.getMonth()]} ${date.getFullYear()} г.`;
}

export function chatTitle(
  username: string | undefined,
  phone: string | undefined,
  chatId: string,
): string {
  const name = username?.replace(/^@/, "").trim();
  if (name) return name;
  if (phone) return formatPhone(phone);
  return chatId;
}

export function chatSubtitle(chat: {
  title: string;
  phone?: string;
  username?: string;
}): string {
  const phone = chat.phone ? formatPhone(chat.phone) : "";
  if (phone && phone !== chat.title) return phone;
  if (chat.username) {
    const name = chat.username.startsWith("@")
      ? chat.username
      : `@${chat.username}`;
    if (name !== `@${chat.title}` && name !== chat.title) return name;
  }
  return "Личный чат";
}

export function initials(title: string): string {
  const clean = title.replace(/^@/, "").trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export function avatarColor(seed: string): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
