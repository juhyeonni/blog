import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readingMinutes } from './readtime.ts';

test('short text is one minute', () => {
  assert.equal(readingMinutes('짧은 글'), 1);
  assert.equal(readingMinutes(''), 1);
});

test('counts Korean by characters and English by words', () => {
  assert.equal(readingMinutes('가'.repeat(1000)), 2);
  assert.equal(readingMinutes('word '.repeat(440)), 2);
  assert.equal(readingMinutes('가'.repeat(500) + ' ' + 'word '.repeat(220)), 2);
});
