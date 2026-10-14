import { getCollection } from 'astro:content';
import { href } from './posts';

const DEFAULT_LANG = 'ko';

export async function aboutLangs(): Promise<string[]> {
  return (await getCollection('about')).map((entry) => entry.id).sort();
}

export const aboutHref = (lang: string) => href(`/about/${lang}/`);

export async function aboutLinkFor(lang: string): Promise<string> {
  return aboutHref((await aboutLangs()).includes(lang) ? lang : DEFAULT_LANG);
}
