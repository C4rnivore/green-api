import { HTTP_API_SETTINGS, RECEIVE_TIMEOUT_SECONDS } from "./apiConfig.ts";
import { requestTarget, tokenPath } from "./apiUtils.ts";
import type { Credentials, GreenNotification } from "../types.ts";

async function apiRequest<T>(
  credentials: Credentials,
  path: string,
  config?: { method?: string; body?: unknown; signal?: AbortSignal },
): Promise<T> {
  const target = requestTarget(credentials, path);
  const response = await fetch(target.url, {
    method: config?.method ?? "GET",
    headers: {
      ...target.headers,
      ...(config?.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: config?.body !== undefined ? JSON.stringify(config.body) : undefined,
    signal: config?.signal,
  });

  const text = await response.text();
  if (!response.ok) throw new Error(text || `GREEN-API: ${response.status}`);
  if (!text) return null as T;
  return JSON.parse(text) as T;
}

export async function connectInstance(credentials: Credentials): Promise<void> {
  const state = await apiRequest<{ stateInstance?: string }>(
    credentials,
    tokenPath(credentials, "getStateInstance"),
  );
  if (state?.stateInstance !== "authorized") throw new Error("Инстанс не авторизован");

  await apiRequest(credentials, tokenPath(credentials, "setSettings"), {
    method: "POST",
    body: HTTP_API_SETTINGS,
  });
}

export async function checkWhatsapp(
  credentials: Credentials,
  phone: string,
): Promise<{ chatId: string; phone: string; username?: string }> {
  const result = await apiRequest<{ existsWhatsapp?: boolean; chatId?: string | number; username?: string }>(
    credentials,
    tokenPath(credentials, "checkWhatsapp"),
    { method: "POST", body: { chatId: `${phone}@c.us` } },
  );

  if (!result?.existsWhatsapp) throw new Error("На этом номере нет WhatsApp");

  return {
    chatId: result.chatId ? String(result.chatId) : `${phone}@c.us`,
    phone,
    username: result.username || undefined,
  };
}

export async function sendMessage(
  credentials: Credentials,
  chatId: string,
  message: string,
): Promise<string> {
  const result = await apiRequest<{ idMessage: string }>(credentials, tokenPath(credentials, "sendMessage"), {
    method: "POST",
    body: { chatId, message },
  });
  return String(result.idMessage);
}

export async function receiveNotification(
  credentials: Credentials,
  signal?: AbortSignal,
): Promise<GreenNotification | null> {
  const data = await apiRequest<GreenNotification | null>(
    credentials,
    `${tokenPath(credentials, "receiveNotification")}?receiveTimeout=${RECEIVE_TIMEOUT_SECONDS}`,
    { signal },
  );
  if (!data?.receiptId || !data.body) return null;
  return data;
}

export async function deleteNotification(
  credentials: Credentials,
  receiptId: number,
  signal?: AbortSignal,
): Promise<void> {
  await apiRequest(credentials, tokenPath(credentials, "deleteNotification", String(receiptId)), {
    method: "DELETE",
    signal,
  });
}
