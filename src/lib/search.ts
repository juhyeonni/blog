export interface Entry {
  slug: string;
  lang: string;
  title: string;
  description: string;
  text: string;
  url: string;
}

export interface Hit {
  entry: Entry;
  snippet: string;
}

const SNIPPET_RADIUS = 36;

export function toPlainText(markdown: string): string {
  return markdown
    .replace(/^```.*$/gm, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_`~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function snippetAround(text: string, at: number, length: number): string {
  const start = Math.max(0, at - SNIPPET_RADIUS);
  const end = Math.min(text.length, at + length + SNIPPET_RADIUS);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

// ponytail: linear scan of the whole index; swap for Pagefind if search.json passes ~1 MB
export function search(index: readonly Entry[], query: string, limit = 8): Hit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const hits: { hit: Hit; rank: number; order: number }[] = [];
  index.forEach((entry, order) => {
    const inTitle = entry.title.toLowerCase().includes(q);
    const inDescription = entry.description.toLowerCase().indexOf(q);
    const inText = entry.text.toLowerCase().indexOf(q);
    if (!inTitle && inDescription < 0 && inText < 0) return;

    const rank = inTitle ? 0 : inDescription >= 0 ? 1 : 2;
    const snippet =
      inText >= 0
        ? snippetAround(entry.text, inText, q.length)
        : entry.description || entry.title;
    hits.push({ hit: { entry, snippet }, rank, order });
  });

  return hits
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .slice(0, limit)
    .map((h) => h.hit);
}
