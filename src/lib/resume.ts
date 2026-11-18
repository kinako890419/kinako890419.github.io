import { getEntry, type CollectionEntry } from 'astro:content';
import { defaultLang, type Lang } from '../i18n/ui';

export type Resume = CollectionEntry<'resume'>['data'];
export type ResumeEntry = Resume['work'][number];

/** The resume in `lang`, or the default language's copy if that one is missing. */
export async function getResume(lang: Lang): Promise<Resume> {
  const entry = (await getEntry('resume', lang)) ?? (await getEntry('resume', defaultLang));
  if (!entry) throw new Error(`No resume found: add blog-posts/resume/${defaultLang}.md`);
  return entry.data;
}
