import { getCollection, type CollectionEntry } from 'astro:content';

export type Version = CollectionEntry<'posts'> & { slug: string; lang: string };

export interface Post {
  slug: string;
  primary: Version;
  versions: Version[];
}

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export const href = (path: string) => `${base}${path}`;

export const versionHref = (v: Pick<Version, 'slug' | 'lang'>) =>
  href(`/posts/${v.slug}/${v.lang}/`);

export const languageName = (lang: string) =>
  new Intl.DisplayNames([lang], { type: 'language' }).of(lang) ?? lang;

export const formatDate = (date: Date, lang: string) =>
  date.toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric' });

export async function getVersions(): Promise<Version[]> {
  const entries = await getCollection('posts');
  return entries.map((entry) => {
    const [slug, lang] = entry.id.split('/');
    return { ...entry, slug, lang };
  });
}

export async function getPosts(): Promise<Post[]> {
  const bySlug = new Map<string, Version[]>();
  for (const v of await getVersions()) {
    bySlug.set(v.slug, [...(bySlug.get(v.slug) ?? []), v]);
  }
  return [...bySlug].map(([slug, list]) => {
    const versions = list.sort((a, b) => a.lang.localeCompare(b.lang));
    const primary = versions.find((v) => v.lang === 'ko') ?? versions[0];
    return { slug, primary, versions };
  }).sort((a, b) => b.primary.data.date.getTime() - a.primary.data.date.getTime());
}
