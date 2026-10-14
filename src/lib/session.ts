import { TOKEN_KEY } from './auth';

export interface User {
  login: string;
  avatarUrl: string;
}

let pending: Promise<User | null> | null = null;

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function fetchUser(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    });
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    if (!response.ok) return null;
    const user = (await response.json()) as { login: string; avatar_url: string };
    return { login: user.login, avatarUrl: user.avatar_url };
  } catch {
    return null;
  }
}

export function loadUser(): Promise<User | null> {
  pending ??= fetchUser();
  return pending;
}

export function forgetUser(): void {
  pending = null;
}
