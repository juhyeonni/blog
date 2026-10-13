export const MODEL = 'Xenova/multilingual-e5-small';
export const FORMAT = 1;
export const MIN_SCORE = 0.82;
export const MAX_RESULTS = 5;

export interface EmbeddingsFile {
  format: number;
  model: string;
  dim: number;
  entries: { slug: string; lang: string; vectors: string[] }[];
}

export interface Match {
  slug: string;
  lang: string;
  score: number;
}

export function encodeVector(vector: ArrayLike<number>): string {
  const bytes = new Int8Array(vector.length);
  for (let i = 0; i < vector.length; i++) bytes[i] = Math.round(Math.max(-1, Math.min(1, vector[i])) * 127);
  let binary = '';
  for (const byte of new Uint8Array(bytes.buffer)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodeVector(encoded: string): Float32Array {
  const binary = atob(encoded);
  const vector = new Float32Array(binary.length);
  for (let i = 0; i < binary.length; i++) vector[i] = ((binary.charCodeAt(i) << 24) >> 24) / 127;
  return vector;
}

export function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
}

export function rank(query: ArrayLike<number>, file: EmbeddingsFile, skip: ReadonlySet<string> = new Set()): Match[] {
  const matches: Match[] = [];
  for (const entry of file.entries) {
    if (skip.has(`${entry.slug}/${entry.lang}`)) continue;
    const score = Math.max(0, ...entry.vectors.map((v) => cosine(query, decodeVector(v))));
    if (score >= MIN_SCORE) matches.push({ slug: entry.slug, lang: entry.lang, score });
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS);
}
