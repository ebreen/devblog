import { describe, expect, it } from "vitest";
import type { CollectionEntry } from "astro:content";
import { formatBlogDate, getReadingTime, sortBlogEntries } from "./blog";

type BlogEntry = CollectionEntry<"blog">;

const makeEntry = ({
  slug,
  date,
  body = "",
  readingTime
}: {
  slug: string;
  date: string;
  body?: string;
  readingTime?: string;
}): BlogEntry => ({ slug, body, data: { date: new Date(date), readingTime } }) as unknown as BlogEntry;

describe("sortBlogEntries", () => {
  it("orders entries newest first by date", () => {
    const entries = [
      makeEntry({ slug: "old", date: "2025-03-01" }),
      makeEntry({ slug: "new", date: "2026-08-15" }),
      makeEntry({ slug: "middle", date: "2026-01-12" })
    ];

    expect(sortBlogEntries(entries).map((entry) => entry.slug)).toEqual(["new", "middle", "old"]);
  });

  it("breaks equal dates by slug ascending", () => {
    const entries = [
      makeEntry({ slug: "zeta", date: "2026-01-12" }),
      makeEntry({ slug: "alpha", date: "2026-01-12" }),
      makeEntry({ slug: "middle", date: "2026-01-12" })
    ];

    expect(sortBlogEntries(entries).map((entry) => entry.slug)).toEqual(["alpha", "middle", "zeta"]);
  });

  it("sorts by the full timestamp when dates share a calendar day", () => {
    const entries = [
      makeEntry({ slug: "morning", date: "2026-01-12T08:00:00.000Z" }),
      makeEntry({ slug: "evening", date: "2026-01-12T20:00:00.000Z" })
    ];

    expect(sortBlogEntries(entries).map((entry) => entry.slug)).toEqual(["evening", "morning"]);
  });

  it("does not mutate the input array", () => {
    const entries = [
      makeEntry({ slug: "a", date: "2026-01-12" }),
      makeEntry({ slug: "b", date: "2026-02-01" })
    ];

    sortBlogEntries(entries);

    expect(entries.map((entry) => entry.slug)).toEqual(["a", "b"]);
  });
});

describe("getReadingTime", () => {
  it("prefers an explicit reading time over the body word count", () => {
    const entry = makeEntry({ slug: "x", date: "2026-01-12", body: "word ".repeat(1000), readingTime: " 5 min read " });

    expect(getReadingTime(entry)).toBe("5 min read");
  });

  it("computes minutes from the body word count, rounding up", () => {
    expect(getReadingTime(makeEntry({ slug: "x", date: "2026-01-12", body: "word ".repeat(200).trim() }))).toBe(
      "1 min read"
    );
    expect(getReadingTime(makeEntry({ slug: "x", date: "2026-01-12", body: "word ".repeat(201).trim() }))).toBe(
      "2 min read"
    );
  });

  it("floors at one minute for short or empty bodies", () => {
    expect(getReadingTime(makeEntry({ slug: "x", date: "2026-01-12", body: "word" }))).toBe("1 min read");
    expect(getReadingTime(makeEntry({ slug: "x", date: "2026-01-12", body: "  " }))).toBe("1 min read");
  });
});

describe("formatBlogDate", () => {
  it("formats as a long en-GB date", () => {
    expect(formatBlogDate(new Date("2026-01-12"))).toBe("12 January 2026");
  });

  it("renders the same calendar day regardless of the process timezone", () => {
    const previous = process.env.TZ;

    try {
      for (const timeZone of ["UTC", "America/Los_Angeles", "Asia/Tokyo", "Europe/Oslo"]) {
        process.env.TZ = timeZone;
        expect(formatBlogDate(new Date("2026-01-12"))).toBe("12 January 2026");
      }
    } finally {
      process.env.TZ = previous;
    }
  });
});
