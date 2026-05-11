export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'BUSINESS_OWNER' | 'STAFF';
  businessId: string | null;
  staffId: string | null;
};

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

const ACCESS_KEY = 'pulsepos.accessToken';
const REFRESH_KEY = 'pulsepos.refreshToken';
const USER_KEY = 'pulsepos.user';

export function saveSession(tokens: SessionTokens, user: SessionUser) {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getAccessToken() {
  return typeof window === 'undefined' ? null : localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return typeof window === 'undefined' ? null : localStorage.getItem(REFRESH_KEY);
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const value = localStorage.getItem(USER_KEY);
  if (!value) return null;

  try {
    return JSON.parse(value) as SessionUser;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}
