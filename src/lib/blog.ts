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

export const formatBlogDate = (value: Date) =>
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(value);

export const getReadingTime = (entry: CollectionEntry<"blog">) => {
  if (entry.data.readingTime) {
    return entry.data.readingTime;
  }

  const words = entry.body.trim().split(/\s+/u).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
  return `${minutes} min read`;
};
