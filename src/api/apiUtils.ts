import { API_URL, DEV_PROXY_PREFIX } from "./apiConfig.ts";
import type { Credentials } from "../types.ts";

export function resolveApiUrl(input?: string): string {
  const value = input?.trim().replace(/\/$/, "") ?? "";
  return value || API_URL;
}

export function normalizeCredentials(input: {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl?: string;
}): Credentials {
  return {
    idInstance: input.idInstance.trim(),
    apiTokenInstance: input.apiTokenInstance.trim(),
    apiUrl: resolveApiUrl(input.apiUrl),
  };
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Ошибка запроса";
}

export function tokenPath(credentials: Credentials, method: string, suffix = ""): string {
  const token = encodeURIComponent(credentials.apiTokenInstance);
  return suffix ? `${method}/${token}/${suffix}` : `${method}/${token}`;
}

export function requestTarget(credentials: Credentials, path: string): { url: string; headers: HeadersInit } {
  const apiPath = `/waInstance${credentials.idInstance}/${path}`;
  const apiUrl = credentials.apiUrl.replace(/\/$/, "");

  if (import.meta.env.DEV) {
    return {
      url: `${DEV_PROXY_PREFIX}${apiPath}`,
      headers: { "X-Green-Api-Base": apiUrl },
    };
  }

  return { url: `${apiUrl}${apiPath}`, headers: {} };
}
