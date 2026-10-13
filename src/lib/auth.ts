export const TOKEN_KEY = 'gh-token';
export const STATE_KEY = 'auth-state';

export interface Pending {
  state: string;
  returnTo: string;
}

export type CallbackResult =
  | { ok: true; token: string; returnTo: string }
  | { ok: false };

export function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function authorizeUrl(clientId: string, authUrl: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${authUrl.replace(/\/$/, '')}/callback`,
    state,
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

function safeReturnTo(path: string, fallback: string): string {
  return path.startsWith('/') && !path.startsWith('//') ? path : fallback;
}

export function resolveCallback(hash: string, pending: Pending | null, fallback: string): CallbackResult {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const token = params.get('token');
  const state = params.get('state');
  if (!pending || !token || !state || state !== pending.state) return { ok: false };
  return { ok: true, token, returnTo: safeReturnTo(pending.returnTo, fallback) };
}
