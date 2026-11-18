import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** Title => URL segment: spaces become "-", characters that break URLs are dropped. */
export function toSlug(text: string): string {
  return text
    .trim()
    .replace(/[/?#%\\]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

const blog = defineCollection({
  loader: glob({
    // resume/ holds the resume page's data, not posts
    pattern: ['**/*.md', '!resume/**'],
    base: './src/content/blog',
    // id = "<lang>/<slug>", so the same title in two languages doesn't clash
    generateId: ({ entry, data }) => {
      const lang = entry.split('/')[0];
      const fallback = entry.split('/').pop()!.replace(/\.md$/, '');
      const source = (data.slug as string | undefined) ?? (data.title as string | undefined) ?? fallback;
      return `${lang}/${toSlug(String(source)) || fallback}`;
    },
  }),
  schema: z.object({
    /** Optional custom URL instead of the title: /blog/<slug>/. Chinese and UUIDs are fine. */
    slug: z
      .string()
      .regex(/^[^\s/?#%\\]+$/, 'slug cannot contain spaces, "/", "?", "#", "%" or "\\"')
      .optional(),
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const str = z.string().min(1);

/** A titled list of points; the title can link out. */
const highlightGroup = z
  .object({
    title: str,
    url: z.url().optional(),
    items: z.array(str).min(1),
  })
  .strict();

/** A job or a school. */
const resumeEntry = z
  .object({
    org: str,
    url: z.url().optional(),
    role: str.optional(),
    degree: str.optional(),
    date: str,
    summary: str.optional(),
    highlights: z.array(z.union([str, highlightGroup])).default([]),
  })
  .strict();

/**
 * Resume page data: front matter of blog-posts/resume/<lang>.md (id = lang).
 * The Markdown body is ignored. Sections left out are skipped on the page.
 */
const resume = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/blog/resume' }),
  schema: z.object({
    name: str,
    altName: str.optional(),
    headline: str,
    email: z.email().optional(),
    updated: str.optional(),
    summary: str,
    skills: z.array(z.object({ label: str, details: str }).strict()).default([]),
    work: z.array(resumeEntry).default([]),
    education: z.array(resumeEntry).default([]),
  }),
});

export const collections = { blog, resume };
