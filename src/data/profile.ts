import { parse } from 'yaml';
import { z } from 'astro/zod';
import raw from './profile.yaml?raw';

const text = z.union([
  z.string().min(1),
  z.object({ 'zh-tw': z.string().min(1), en: z.string().min(1).optional() }).strict(),
]);

const url = z.string().refine((v) => v.startsWith('/') || /^https?:\/\/[^\s]+$/.test(v), {
  message: 'url must start with "/" (site path) or "https://" (external link)',
});

const link = z.object({ label: text, url }).strict();

const face = z
  .object({
    links: z.array(link).min(1).max(3, 'at most 3 links fit on one side of the card'),
  })
  .strict();

const schema = z
  .object({
    site: z.object({ title: text, description: text, author: text }).strict(),
    card: z
      .object({
        holo: z.number().min(0).max(1).default(0.6),
        credit: link.optional(),
        status: z
          .object({
            github: z.string().min(1),
            fallback: z
              .string()
              .regex(/^:[a-z0-9_+-]+:$/, 'fallback must be an emoji shortcode like ":coffee:"')
              .optional(),
          })
          .strict()
          .optional(),
        front: face,
        back: face,
      })
      .strict(),
  })
  .strict();

function load() {
  const result = schema.safeParse(parse(raw));
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
    throw new Error(`src/data/profile.yaml is invalid:\n${issues}`);
  }
  return result.data;
}

export const profile = load();
export type Profile = typeof profile;
export type CardFace = Profile['card']['front'];
