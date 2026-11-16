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
    pattern: '**/*.md',
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

export const collections = { blog };
