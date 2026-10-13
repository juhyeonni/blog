import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_RESULTS,
  MIN_SCORE,
  cosine,
  decodeVector,
  encodeVector,
  rank,
  type EmbeddingsFile,
} from './semantic.ts';

const unit = (x: number, y: number) => {
  const n = Math.hypot(x, y);
  return [x / n, y / n];
};

const file = (entries: { slug: string; lang: string; vectors: number[][] }[]): EmbeddingsFile => ({
  format: 1,
  model: 'm',
  dim: 2,
  entries: entries.map((e) => ({ ...e, vectors: e.vectors.map(encodeVector) })),
});

test('encoding then decoding keeps the vector within rounding error', () => {
  const vector = [0.5, -0.25, 0.9, -1, 0, 0.123];
  const back = decodeVector(encodeVector(vector));
  vector.forEach((x, i) => assert.ok(Math.abs(back[i] - x) <= 1 / 127, `component ${i}`));
});

test('the cosine of a vector with itself is 1 and of opposites is -1', () => {
  const v = [0.3, 0.4, 0.5];
  assert.ok(Math.abs(cosine(v, v) - 1) < 1e-9);
  assert.ok(Math.abs(cosine(v, v.map((x) => -x)) + 1) < 1e-9);
  assert.equal(cosine([0, 0], [1, 0]), 0);
});

test('results below the threshold are dropped', () => {
  const near = unit(1, 0.1);
  const far = unit(0, 1);
  const matches = rank(unit(1, 0), file([
    { slug: 'a', lang: 'ko', vectors: [near] },
    { slug: 'b', lang: 'ko', vectors: [far] },
  ]));
  assert.deepEqual(matches.map((m) => m.slug), ['a']);
  assert.ok(matches[0].score >= MIN_SCORE);
});

test('at most the maximum number of results come back, best first', () => {
  const entries = Array.from({ length: MAX_RESULTS + 3 }, (_, i) => ({
    slug: `p${i}`,
    lang: 'ko',
    vectors: [unit(1, i * 0.01)],
  }));
  const matches = rank(unit(1, 0), file(entries));
  assert.equal(matches.length, MAX_RESULTS);
  assert.deepEqual(matches.map((m) => m.slug), ['p0', 'p1', 'p2', 'p3', 'p4']);
});

test('the best paragraph represents a post version', () => {
  const matches = rank(unit(1, 0), file([
    { slug: 'a', lang: 'ko', vectors: [unit(0, 1), unit(1, 0.05), unit(-1, 0)] },
  ]));
  assert.equal(matches.length, 1);
  assert.ok(matches[0].score > 0.99);
});

test('a post already in the keyword results is not repeated', () => {
  const matches = rank(
    unit(1, 0),
    file([
      { slug: 'a', lang: 'ko', vectors: [unit(1, 0)] },
      { slug: 'a', lang: 'ja', vectors: [unit(1, 0)] },
    ]),
    new Set(['a/ko']),
  );
  assert.deepEqual(matches.map((m) => `${m.slug}/${m.lang}`), ['a/ja']);
});
