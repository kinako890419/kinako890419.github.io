export const languages = {
  'zh-tw': { label: '繁體中文', htmlLang: 'zh-Hant-TW', dateLocale: 'zh-TW' },
  en: { label: 'English', htmlLang: 'en', dateLocale: 'en-US' },
} as const;

export type Lang = keyof typeof languages;
export const defaultLang: Lang = 'zh-tw';

/** The UI language of the current page: pass `Astro.currentLocale`. */
export function toLang(locale: string | undefined): Lang {
  return locale && locale in languages ? (locale as Lang) : defaultLang;
}

/** Path without the locale prefix: /en/blog/ => /blog/. */
export function stripLocale(path: string): string {
  for (const l of Object.keys(languages)) {
    if (l !== defaultLang && (path === `/${l}` || path.startsWith(`/${l}/`))) {
      return path.slice(l.length + 1) || '/';
    }
  }
  return path;
}

export const ui = {
  'zh-tw': {
    'nav.home': '首頁',
    'nav.blog': '部落格',
    'nav.resume': '履歷',
    'theme.toLight': '切換為淺色主題',
    'theme.toDark': '切換為深色主題',
    'lang.label': '語言',
    'card.flip': '翻面',
    'card.flipBack': '翻回',
    'card.front': '名片正面',
    'card.back': '名片背面',
    'home.latestPost': '最新文章',
    'blog.title': '部落格',
    'blog.empty': '還沒有文章，敬請期待！',
    'blog.back': '回到文章列表',
    'blog.updated': '更新於',
    'tags.title': '標籤',
    'tags.postsTagged': '標籤：',
    'chips.more': 'load more...',
    'years.title': '年份',
    'years.all': '全部',
    'years.suffix': ' 年',
    'pager.label': '分頁',
    'pager.prev': '上一頁',
    'pager.next': '下一頁',
    'pager.page': '第 {n} 頁',
    '404.title': '找不到這一頁',
    '404.home': '回到首頁',
    'resume.title': '履歷',
    'resume.skills': '技能',
    'resume.work': '工作經歷',
    'resume.education': '學歷',
    'resume.updated': '更新日期：',
  },
  en: {
    'nav.home': 'Home',
    'nav.blog': 'Blog',
    'nav.resume': 'Resume',
    'theme.toLight': 'Switch to light theme',
    'theme.toDark': 'Switch to dark theme',
    'lang.label': 'Language',
    'card.flip': 'Flip',
    'card.flipBack': 'Back',
    'card.front': 'Card front',
    'card.back': 'Card back',
    'home.latestPost': 'Latest post',
    'blog.title': 'Blog',
    'blog.empty': 'No posts yet. Stay tuned!',
    'blog.back': 'Back to all posts',
    'blog.updated': 'Updated',
    'tags.title': 'Tags',
    'tags.postsTagged': 'Tagged: ',
    'chips.more': 'load more...',
    'years.title': 'Years',
    'years.all': 'All',
    'years.suffix': '',
    'pager.label': 'Pages',
    'pager.prev': 'Newer',
    'pager.next': 'Older',
    'pager.page': 'Page {n}',
    '404.title': 'Page not found',
    '404.home': 'Back home',
    'resume.title': 'Resume',
    'resume.skills': 'Skills',
    'resume.work': 'Work Experience',
    'resume.education': 'Education',
    'resume.updated': 'Last updated:',
  },
} as const satisfies Record<Lang, Record<string, string>>;

export type UIKey = keyof (typeof ui)['zh-tw'];

export function useTranslations(lang: Lang) {
  return (key: UIKey): string => ui[lang][key] ?? ui[defaultLang][key];
}

/** Localised text: a plain string, or { 'zh-tw': ..., en: ... }. */
export type LocalizedText = string | Partial<Record<Lang, string>>;

export function localize(value: LocalizedText, lang: Lang): string {
  if (typeof value === 'string') return value;
  return value[lang] ?? value[defaultLang] ?? Object.values(value)[0] ?? '';
}

/** Prefix a site path with the locale (default locale has no prefix). */
export function localePath(path: string, lang: Lang): string {
  if (!path.startsWith('/')) return path; // external URL
  return lang === defaultLang ? path : `/${lang}${path}`;
}

export function formatDate(date: Date, lang: Lang): string {
  return date.toLocaleDateString(languages[lang].dateLocale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
