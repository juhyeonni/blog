export interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  SITE_ORIGIN: string;
  SITE_BASE: string;
}

type Fetch = typeof fetch;

const STATE = /^[A-Za-z0-9_-]{1,200}$/;

function backToSite(env: Env, params: Record<string, string>): Response {
  const fragment = new URLSearchParams(params).toString();
  const location = `${env.SITE_ORIGIN}${env.SITE_BASE}/auth/callback/#${fragment}`;
  return new Response(null, { status: 302, headers: { Location: location } });
}

async function exchange(code: string, env: Env, fetchImpl: Fetch): Promise<string | null> {
  const response = await fetchImpl('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { access_token?: string };
  return body.access_token ?? null;
}

export async function handle(request: Request, env: Env, fetchImpl: Fetch = fetch): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.pathname !== '/callback') {
    return new Response('Not found', { status: 404 });
  }

  const state = url.searchParams.get('state') ?? '';
  if (!STATE.test(state)) return new Response('Bad state', { status: 400 });

  if (url.searchParams.get('error')) return backToSite(env, { error: 'denied', state });

  const code = url.searchParams.get('code');
  if (!code) return new Response('Missing code', { status: 400 });

  const token = await exchange(code, env, fetchImpl);
  if (!token) return backToSite(env, { error: 'exchange_failed', state });
  return backToSite(env, { token, state });
}

export default {
  fetch: (request: Request, env: Env) => handle(request, env),
};
