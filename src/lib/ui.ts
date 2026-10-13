const strings = {
  ko: {
    site: '사이트',
    posts: '글',
    skip: '본문으로 건너뛰기',
    theme: '테마 전환',
    toc: '목차',
    languages: '언어',
    pager: '이전 글, 다음 글',
    older: '이전 글',
    newer: '다음 글',
    more: '다른 글',
  },
  ja: {
    site: 'サイト',
    posts: '記事',
    skip: '本文へ移動',
    theme: 'テーマを切り替え',
    toc: '目次',
    languages: '言語',
    pager: '前の記事、次の記事',
    older: '前の記事',
    newer: '次の記事',
    more: '他の記事',
  },
} as const;

export type UiStrings = (typeof strings)['ko'];

export const ui = (lang: string): UiStrings =>
  strings[lang as keyof typeof strings] ?? strings.ko;
