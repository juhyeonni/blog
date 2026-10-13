import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handle, type Env } from './index.ts';

const env: Env = {
  GITHUB_CLIENT_ID: 'id',
  GITHUB_CLIENT_SECRET: 'secret',
  SITE_ORIGIN: 'https://juhyeonni.github.io',
  SITE_BASE: '/blog',
};

const callback = (query: string) => new Request(`https://auth.example.workers.dev/callback?${query}`);

const github = (body: unknown, ok = true): typeof fetch =>
  (async () => new Response(JSON.stringify(body), { status: ok ? 200 : 500 })) as typeof fetch;

const location = (response: Response) => response.headers.get('Location') ?? '';

test('a valid code and state redirect to the site with the token in the fragment', async () => {
  const response = await handle(callback('code=abc&state=s1'), env, github({ access_token: 'tok' }));
  assert.equal(response.status, 302);
  assert.equal(location(response), 'https://juhyeonni.github.io/blog/auth/callback/#token=tok&state=s1');
});

test('the code is exchanged with the app secret', async () => {
  let sent = '';
  const spy = (async (_url: string, init: RequestInit) => {
    sent = String(init.body);
    return new Response(JSON.stringify({ access_token: 't' }));
  }) as unknown as typeof fetch;
  await handle(callback('code=abc&state=s1'), env, spy);
  assert.deepEqual(JSON.parse(sent), { client_id: 'id', client_secret: 'secret', code: 'abc' });
});

test('a missing code or a missing or odd state is rejected', async () => {
  const ok = github({ access_token: 'tok' });
  assert.equal((await handle(callback('state=s1'), env, ok)).status, 400);
  assert.equal((await handle(callback('code=abc'), env, ok)).status, 400);
  assert.equal((await handle(callback('code=abc&state=a%2Fb'), env, ok)).status, 400);
});

test('no input makes it redirect outside the configured origin', async () => {
  const query = 'code=abc&state=s1&redirect_uri=https%3A%2F%2Fevil.example&next=https%3A%2F%2Fevil.example';
  const response = await handle(callback(query), env, github({ access_token: 'tok' }));
  assert.ok(location(response).startsWith('https://juhyeonni.github.io/blog/'));
});

test("GitHub's error answer comes back as an error without a token", async () => {
  const failed = await handle(callback('code=abc&state=s1'), env, github({ error: 'bad_verification_code' }));
  assert.equal(location(failed), 'https://juhyeonni.github.io/blog/auth/callback/#error=exchange_failed&state=s1');

  const denied = await handle(callback('error=access_denied&state=s1'), env, github({}));
  assert.equal(location(denied), 'https://juhyeonni.github.io/blog/auth/callback/#error=denied&state=s1');
});

test('other paths and methods are not found', async () => {
  const other = new Request('https://auth.example.workers.dev/other');
  assert.equal((await handle(other, env, github({}))).status, 404);
});
