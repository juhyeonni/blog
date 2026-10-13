import { test } from 'node:test';
import assert from 'node:assert/strict';
import { search, toPlainText, type Entry } from './search.ts';

const entry = (over: Partial<Entry>): Entry => ({
  slug: 's',
  lang: 'ko',
  title: '',
  description: '',
  text: '',
  url: '/s/ko/',
  ...over,
});

const index: Entry[] = [
  entry({ slug: 'hello', lang: 'ko', title: '안녕하세요, 블로그를 열었습니다', text: '개발하며 배운 것을 기록합니다' }),
  entry({ slug: 'hello', lang: 'ja', title: 'こんにちは、ブログを始めました', text: '開発で学んだことを記録します' }),
  entry({ slug: 'notes', lang: 'ko', title: '메모를 남기는 방법', text: '블로그에 짧은 메모를 올립니다' }),
];

test('a partial Korean word finds its post', () => {
  const hits = search(index, '블로');
  assert.ok(hits.some((h) => h.entry.slug === 'hello' && h.entry.lang === 'ko'));
});

test('a Japanese query finds the Japanese version only', () => {
  const hits = search(index, 'ブログ');
  assert.deepEqual(hits.map((h) => `${h.entry.slug}/${h.entry.lang}`), ['hello/ja']);
});

test('matching ignores case', () => {
  const latin = [entry({ title: 'Astro Notes' })];
  assert.equal(search(latin, 'astro').length, 1);
});

test('a title match ranks above a text match', () => {
  const hits = search(index, '블로그');
  assert.deepEqual(hits.map((h) => h.entry.slug), ['hello', 'notes']);
  assert.equal(hits[0].entry.title.includes('블로그'), true);
});

test('an empty query returns nothing', () => {
  assert.deepEqual(search(index, '   '), []);
});

test('plain text drops Markdown syntax but keeps code and link text', () => {
  const text = toPlainText('## 제목\n\n- **굵게** [링크](https://x.dev)\n\n```ts\nconst a = 1;\n```');
  assert.equal(text, '제목 굵게 링크 const a = 1;');
});
