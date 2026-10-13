import { test } from 'node:test';
import assert from 'node:assert/strict';
import { issueTitle, plan, run } from './ensure-reaction-issues.mjs';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

function fakeGitHub(existing) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const { pathname } = new URL(url);
    calls.push(`${init.method} ${pathname}`);
    if (init.method === 'GET') return json(existing);
    if (pathname.endsWith('/labels')) return json({}, 201);
    return json({ number: 100 + calls.length }, 201);
  };
  return { fetchImpl, calls };
}

test('the plan keeps existing issues and lists only the missing posts', () => {
  const existing = [{ number: 4, title: issueTitle('hello') }, { number: 5, title: 'unrelated' }];
  assert.deepEqual(plan(existing, ['hello', 'notes']), { map: { hello: 4 }, missing: ['notes'] });
});

test('only the missing issues are created and the full map comes back', async () => {
  const { fetchImpl, calls } = fakeGitHub([{ number: 4, title: issueTitle('hello') }]);
  const map = await run({ repo: 'o/r', token: 't', slugs: ['hello', 'notes'], fetchImpl });
  assert.equal(map.hello, 4);
  assert.equal(typeof map.notes, 'number');
  assert.equal(calls.filter((c) => c.startsWith('POST') && c.endsWith('/issues')).length, 1);
});

test('nothing is created when every post already has an issue', async () => {
  const { fetchImpl, calls } = fakeGitHub([{ number: 4, title: issueTitle('hello') }]);
  const map = await run({ repo: 'o/r', token: 't', slugs: ['hello'], fetchImpl });
  assert.deepEqual(map, { hello: 4 });
  assert.deepEqual(calls, ['GET /repos/o/r/issues']);
});

test('pull requests in the list are ignored', async () => {
  const existing = [{ number: 9, title: issueTitle('hello'), pull_request: {} }];
  const { fetchImpl } = fakeGitHub(existing);
  const map = await run({ repo: 'o/r', token: 't', slugs: ['hello'], fetchImpl });
  assert.notEqual(map.hello, 9);
});

test('with no token or no repository it does nothing and calls nothing', async () => {
  const { fetchImpl, calls } = fakeGitHub([]);
  assert.equal(await run({ repo: 'o/r', token: '', slugs: ['hello'], fetchImpl }), null);
  assert.equal(await run({ repo: '', token: 't', slugs: ['hello'], fetchImpl }), null);
  assert.deepEqual(calls, []);
});
