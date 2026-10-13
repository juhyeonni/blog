import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorizeUrl, randomState, resolveCallback } from './auth.ts';

const pending = { state: 's1', returnTo: '/blog/posts/hello/ko/' };

test('a matching state signs in and returns to the stored page', () => {
  const result = resolveCallback('#token=tok&state=s1', pending, '/blog/');
  assert.deepEqual(result, { ok: true, token: 'tok', returnTo: '/blog/posts/hello/ko/' });
});

test('a state that does not match signs nobody in', () => {
  assert.deepEqual(resolveCallback('#token=tok&state=other', pending, '/blog/'), { ok: false });
});

test('no stored state, no token or an error answer signs nobody in', () => {
  assert.deepEqual(resolveCallback('#token=tok&state=s1', null, '/blog/'), { ok: false });
  assert.deepEqual(resolveCallback('#state=s1', pending, '/blog/'), { ok: false });
  assert.deepEqual(resolveCallback('#error=denied&state=s1', pending, '/blog/'), { ok: false });
});

test('a stored return path that leaves the site falls back to the home page', () => {
  const result = resolveCallback('#token=tok&state=s1', { state: 's1', returnTo: '//evil.example/x' }, '/blog/');
  assert.deepEqual(result, { ok: true, token: 'tok', returnTo: '/blog/' });
});

test('the authorize link carries the client id, the callback and the state', () => {
  const url = new URL(authorizeUrl('cid', 'https://auth.example.workers.dev/', 'abc'));
  assert.equal(url.origin + url.pathname, 'https://github.com/login/oauth/authorize');
  assert.equal(url.searchParams.get('client_id'), 'cid');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://auth.example.workers.dev/callback');
  assert.equal(url.searchParams.get('state'), 'abc');
});

test('each state is unguessable and different', () => {
  assert.notEqual(randomState(), randomState());
  assert.match(randomState(), /^[0-9a-f]{32}$/);
});
