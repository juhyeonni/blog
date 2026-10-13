import { getVersions, versionHref } from '../lib/posts';
import { toPlainText, type Entry } from '../lib/search';

export async function GET() {
  const versions = await getVersions();
  const index: Entry[] = versions.map((v) => ({
    slug: v.slug,
    lang: v.lang,
    title: v.data.title,
    description: v.data.description ?? '',
    text: toPlainText(v.body ?? ''),
    url: versionHref(v),
  }));
  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json' },
  });
}
