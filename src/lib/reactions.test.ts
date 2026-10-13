import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_TEXT,
  blockHash,
  canDelete,
  clampText,
  encode,
  groupByBlock,
  parse,
  type RawComment,
} from './reactions.ts';

const user = { login: 'ana', avatar_url: 'https://avatars.githubusercontent.com/u/1' };
const comment = (body: string, over: Partial<RawComment> = {}): RawComment => ({ id: 7, body, user, ...over });
const anchor = { lang: 'ko', block: 3, hash: 'a1b2c3' };

test('a written reaction reads back the same', () => {
  const reaction = parse(comment(encode(anchor, '이 부분 좋아요')));
  assert.deepEqual(reaction, { ...anchor, id: 7, login: 'ana', avatar: user.avatar_url, text: '이 부분 좋아요' });
});

test('a comment with a missing, malformed or wrong-version first line is ignored', () => {
  assert.equal(parse(comment('just a comment')), null);
  assert.equal(parse(comment('<!-- blog-reaction v1 {oops} -->\nhi')), null);
  assert.equal(parse(comment('<!-- blog-reaction v2 {"lang":"ko","block":1,"hash":"a1b2c3"} -->\nhi')), null);
  assert.equal(parse(comment('<!-- blog-reaction v1 {"lang":"ko","block":-1,"hash":"a1b2c3"} -->\nhi')), null);
  assert.equal(parse(comment('<!-- blog-reaction v1 {"lang":"ko","block":1,"hash":"zzzzzz"} -->\nhi')), null);
  assert.equal(parse(comment(encode(anchor, '   '))), null);
  assert.equal(parse(comment(encode(anchor, 'hi'), { user: null })), null);
});

test('an avatar from another host is dropped', () => {
  const other = comment(encode(anchor, 'hi'), { user: { login: 'x', avatar_url: 'https://evil.example/a.png' } });
  assert.equal(parse(other)?.avatar, '');
});

test('the block hash changes when the text changes and ignores spacing', () => {
  assert.notEqual(blockHash('개발 기록'), blockHash('개발 기록!'));
  assert.equal(blockHash('개발   기록\n'), blockHash('개발 기록'));
  assert.match(blockHash('x'), /^[0-9a-f]{6}$/);
});

test('a reaction with a stale hash or another language is not grouped under the block', () => {
  const fresh = parse(comment(encode({ lang: 'ko', block: 1, hash: 'aaaaaa' }, 'ok')))!;
  const stale = parse(comment(encode({ lang: 'ko', block: 1, hash: 'bbbbbb' }, 'old')))!;
  const other = parse(comment(encode({ lang: 'ja', block: 1, hash: 'aaaaaa' }, 'ja')))!;
  const grouped = groupByBlock([fresh, stale, other], 'ko', [{ block: 1, hash: 'aaaaaa' }]);
  assert.deepEqual(grouped.get(1)?.map((r) => r.text), ['ok']);
});

test('only the author or the owner may delete', () => {
  const reaction = parse(comment(encode(anchor, 'hi')))!;
  assert.equal(canDelete(reaction, 'ana', 'owner'), true);
  assert.equal(canDelete(reaction, 'Owner', 'owner'), true);
  assert.equal(canDelete(reaction, 'bob', 'owner'), false);
  assert.equal(canDelete(reaction, null, 'owner'), false);
  assert.equal(canDelete(reaction, 'bob', ''), false);
});

test('text over the limit is cut by characters, not bytes', () => {
  const long = '가'.repeat(MAX_TEXT + 20);
  assert.equal(Array.from(clampText(long)).length, MAX_TEXT);
  assert.equal(Array.from(parse(comment(encode(anchor, long)))!.text).length, MAX_TEXT);
});
