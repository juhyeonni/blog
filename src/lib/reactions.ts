export const MAX_TEXT = 80;

export interface Anchor {
  lang: string;
  block: number;
  hash: string;
}

export interface Reaction extends Anchor {
  id: number;
  login: string;
  avatar: string;
  text: string;
}

export interface RawComment {
  id: number;
  body: string;
  user: { login: string; avatar_url: string } | null;
}

const FIRST_LINE = /^<!-- blog-reaction v1 (\{[^\n]*?\}) -->\n?([\s\S]*)$/;
const AVATAR_HOST = 'https://avatars.githubusercontent.com/';

export function blockHash(text: string): string {
  let hash = 0x811c9dc5;
  for (const char of text.replace(/\s+/g, ' ').trim()) {
    hash = Math.imul(hash ^ char.codePointAt(0)!, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0').slice(0, 6);
}

export function clampText(text: string): string {
  return Array.from(text.trim()).slice(0, MAX_TEXT).join('');
}

export function encode(anchor: Anchor, text: string): string {
  const { lang, block, hash } = anchor;
  return `<!-- blog-reaction v1 ${JSON.stringify({ lang, block, hash })} -->\n${clampText(text)}`;
}

function parseAnchor(json: string): Anchor | null {
  try {
    const value = JSON.parse(json) as Partial<Anchor>;
    const { lang, block, hash } = value;
    const valid =
      typeof lang === 'string' && /^[a-z]{2,8}$/.test(lang) &&
      Number.isInteger(block) && block! >= 0 &&
      typeof hash === 'string' && /^[0-9a-f]{6}$/.test(hash);
    return valid ? { lang, block: block!, hash } : null;
  } catch {
    return null;
  }
}

export function parse(comment: RawComment): Reaction | null {
  const match = FIRST_LINE.exec(comment.body);
  if (!match || !comment.user) return null;

  const anchor = parseAnchor(match[1]);
  const text = clampText(match[2]);
  if (!anchor || !text) return null;

  const avatar = comment.user.avatar_url.startsWith(AVATAR_HOST) ? comment.user.avatar_url : '';
  return { ...anchor, id: comment.id, login: comment.user.login, avatar, text };
}

export function groupByBlock(
  reactions: readonly Reaction[],
  lang: string,
  blocks: readonly { block: number; hash: string }[],
): Map<number, Reaction[]> {
  const hashes = new Map(blocks.map((b) => [b.block, b.hash]));
  const grouped = new Map<number, Reaction[]>();
  for (const reaction of reactions) {
    if (reaction.lang !== lang || hashes.get(reaction.block) !== reaction.hash) continue;
    grouped.set(reaction.block, [...(grouped.get(reaction.block) ?? []), reaction]);
  }
  return grouped;
}

export function canDelete(reaction: Reaction, me: string | null, owner: string): boolean {
  if (!me) return false;
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  return same(reaction.login, me) || (owner !== '' && same(me, owner));
}
