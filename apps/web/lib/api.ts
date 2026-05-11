import { clearSession, getAccessToken, getRefreshToken, saveSession } from './session';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: Record<string, unknown> | FormData | string | null;
};

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearSession();
    throw new Error('Session expired');
  }

  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) {
    clearSession();
    throw new Error('Session expired');
  }

  const data = (await response.json()) as { tokens: { accessToken: string; refreshToken: string } };
  const user = JSON.parse(localStorage.getItem('pulsepos.user') ?? 'null');
  if (user) {
    saveSession(data.tokens, user);
  }

  return data.tokens.accessToken;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const accessToken = getAccessToken();

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (!(options.body instanceof FormData) && options.body !== null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body:
      options.body instanceof FormData || typeof options.body === 'string' || options.body === null
        ? options.body
        : JSON.stringify(options.body)
  });

  if (response.status === 401 && getRefreshToken()) {
    const refreshedToken = await refreshAccessToken();
    const retryHeaders = new Headers(options.headers);
    retryHeaders.set('Authorization', `Bearer ${refreshedToken}`);
    if (!(options.body instanceof FormData) && options.body !== null && !retryHeaders.has('Content-Type')) {
      retryHeaders.set('Content-Type', 'application/json');
    }

    const retry = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: retryHeaders,
      body:
        options.body instanceof FormData || typeof options.body === 'string' || options.body === null
          ? options.body
          : JSON.stringify(options.body)
    });

    if (!retry.ok) {
      throw new Error(await retry.text());
    }

    return (await retry.json()) as T;
  }

  if (!response.ok) {
    throw new Error(await response.text());
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
