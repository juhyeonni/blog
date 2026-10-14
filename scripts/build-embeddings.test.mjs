import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFile, chunks, passage } from './build-embeddings.mjs';
import { FORMAT, MODEL, decodeVector } from '../src/lib/semantic.ts';

const markdown = [
  '개발하며 배운 것과 만든 것을 기록하려고 블로그를 열었습니다.',
  '## 짧음',
  '- 개발 기록\n- 만든 것에 대한 이야기\n- 읽는 분과 나누고 싶은 생각',
  '```ts\nconst greeting = (name: string) => `안녕하세요, ${name}`;\n```',
  '한 글에 여러 언어 버전이 있을 수 있어서, 위의 언어 링크로 바꿔 읽을 수 있습니다.',
].join('\n\n');

test('paragraphs are split on blank lines, and tiny and code-only paragraphs are skipped', () => {
  const found = chunks(markdown);
  assert.equal(found.length, 3);
  assert.ok(found[0].startsWith('개발하며'));
  assert.ok(found[1].includes('개발 기록') && found[1].includes('읽는 분과'));
  assert.ok(!found.some((text) => text.includes('const greeting')));
  assert.ok(!found.some((text) => text === '짧음'));
});

test('every chunk carries the title and the passage prefix', () => {
  assert.equal(passage('제목', '본문'), 'passage: 제목. 본문');
});

test('the output records the model and format and lists every post version', async () => {
  const seen = [];
  const embed = async (texts) => {
    seen.push(...texts);
    return texts.map(() => [0.6, 0.8]);
  };
  const posts = [
    { slug: 'hello', lang: 'ko', title: '안녕', markdown },
    { slug: 'hello', lang: 'ja', title: 'こんにちは', markdown: 'ひとつの記事に、複数の言語版を載せることがあります。' },
    { slug: 'empty', lang: 'ko', title: '비어 있음', markdown: '짧음' },
  ];
  const file = await buildFile(posts, embed);

  assert.equal(file.model, MODEL);
  assert.equal(file.format, FORMAT);
  assert.equal(file.dim, 2);
  assert.deepEqual(file.entries.map((e) => `${e.slug}/${e.lang}:${e.vectors.length}`), ['hello/ko:3', 'hello/ja:1', 'empty/ko:0']);
  assert.ok(seen.every((text) => text.startsWith('passage: ')));
  assert.ok(seen.slice(0, 3).every((text) => text.startsWith('passage: 안녕. ')));
  const back = decodeVector(file.entries[0].vectors[0]);
  assert.ok(Math.abs(back[0] - 0.6) <= 1 / 127 && Math.abs(back[1] - 0.8) <= 1 / 127);
});
