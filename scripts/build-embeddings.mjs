import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { toPlainText } from '../src/lib/search.ts';
import { FORMAT, MODEL, encodeVector } from '../src/lib/semantic.ts';

const MIN_CHARS = 12;
const BATCH = 16;

export function chunks(markdown) {
  return markdown
    .replace(/^```[\s\S]*?^```/gm, '\n\n')
    .split(/\n{2,}/)
    .map(toPlainText)
    .filter((text) => text.length >= MIN_CHARS);
}

export const passage = (title, text) => `passage: ${title}. ${text}`;

export async function buildFile(posts, embed) {
  const entries = [];
  let dim = 0;
  for (const post of posts) {
    const texts = chunks(post.markdown).map((text) => passage(post.title, text));
    const vectors = [];
    for (let i = 0; i < texts.length; i += BATCH) {
      for (const vector of await embed(texts.slice(i, i + BATCH))) {
        dim = vector.length;
        vectors.push(encodeVector(vector));
      }
    }
    entries.push({ slug: post.slug, lang: post.lang, vectors });
  }
  return { format: FORMAT, model: MODEL, dim, entries };
}

export function readPosts(root = 'src/content/posts') {
  const posts = [];
  for (const dir of readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    for (const file of readdirSync(join(root, dir.name)).filter((f) => f.endsWith('.md'))) {
      const source = readFileSync(join(root, dir.name, file), 'utf8');
      const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(source);
      const title = /^title:\s*(.+)$/m.exec(match?.[1] ?? '')?.[1].trim().replace(/^["']|["']$/g, '');
      if (!match || !title) throw new Error(`${dir.name}/${file} has no title`);
      posts.push({ slug: dir.name, lang: file.replace(/\.md$/, ''), title, markdown: match[2] });
    }
  }
  return posts;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { pipeline, env } = await import('@huggingface/transformers');
  env.cacheDir = '.cache/transformers';
  const extractor = await pipeline('feature-extraction', MODEL, { dtype: 'q8' });
  const embed = async (texts) => (await extractor(texts, { pooling: 'mean', normalize: true })).tolist();

  const file = await buildFile(readPosts(), embed);
  mkdirSync('public', { recursive: true });
  writeFileSync('public/embeddings.json', JSON.stringify(file));
  const count = file.entries.reduce((n, e) => n + e.vectors.length, 0);
  console.log(`embeddings: ${file.entries.length} post versions, ${count} paragraphs, ${file.dim} dimensions`);
}
