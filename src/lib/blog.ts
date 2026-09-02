import type { CollectionEntry } from "astro:content";

const WORDS_PER_MINUTE = 200;

export const sortBlogEntries = (entries: CollectionEntry<"blog">[]) =>
  [...entries].sort((entryA, entryB) => {
    const dateDifference = entryB.data.date.getTime() - entryA.data.date.getTime();
    if (dateDifference !== 0) {
      return dateDifference;
    }

    return entryA.slug.localeCompare(entryB.slug, "en");
  });

// Content dates are coerced at UTC midnight; format in UTC so the calendar day
// in the frontmatter never shifts with the build machine's timezone.
const blogDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  year: "numeric",
  month: "long",
  day: "numeric"
});

export const formatBlogDate = (value: Date) => blogDateFormatter.format(value);

export const getReadingTime = (entry: CollectionEntry<"blog">) => {
  const explicitReadingTime = entry.data.readingTime?.trim();
  if (explicitReadingTime) {
    return explicitReadingTime;
  }

  const words = entry.body.trim().split(/\s+/u).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
  return `${minutes} min read`;
};
