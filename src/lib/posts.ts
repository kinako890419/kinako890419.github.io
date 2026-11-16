import { getCollection, type CollectionEntry } from 'astro:content';
import { defaultLang, type Lang } from '../i18n/ui';

export type Post = CollectionEntry<'blog'> & { slug: string; lang: Lang };

/** Posts are only written in zh-tw for now; the /en/ pages show them with the English UI. */
export const CONTENT_LANG: Lang = defaultLang;

function langOf(entry: CollectionEntry<'blog'>): string | undefined {
  return entry.filePath?.match(/blog\/([^/]+)\//)?.[1];
}

/** Published posts for one language, newest first. Drafts show only in `npm run dev`. */
export async function getPosts(lang: Lang): Promise<Post[]> {
  const entries = await getCollection('blog', (e) => langOf(e) === lang && (import.meta.env.DEV || !e.data.draft));
  return entries
    .map((e) => ({ ...e, lang, slug: e.id.startsWith(`${lang}/`) ? e.id.slice(lang.length + 1) : e.id }))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function getTags(posts: Post[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of posts) for (const t of p.data.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return new Map([...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

/** Dates are date-only (stored as UTC midnight), so read the year in UTC. */
export function yearOf(post: Post): string {
  return String(post.data.date.getUTCFullYear());
}

/** Year => post count, newest year first. */
export function getYears(posts: Post[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of posts) counts.set(yearOf(p), (counts.get(yearOf(p)) ?? 0) + 1);
  return new Map([...counts].sort((a, b) => Number(b[0]) - Number(a[0])));
}

export const PAGE_SIZE = 10;

/** URL of page `n` of a listing whose first page is `base` (e.g. /blog/). */
export function pageUrl(base: string, n: number): string {
  return n <= 1 ? base : `${base}page/${n}/`;
}

export function pagedPaths<P extends Record<string, string>, X extends Record<string, unknown>>(
  posts: Post[],
  params: P,
  props: X,
) {
  const pages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  return Array.from({ length: pages }, (_, i) => ({
    params: { ...params, page: i === 0 ? undefined : `page/${i + 1}` },
    props: {
      ...props,
      posts: posts.slice(i * PAGE_SIZE, (i + 1) * PAGE_SIZE),
      page: i + 1,
      pages,
    },
  }));
}
