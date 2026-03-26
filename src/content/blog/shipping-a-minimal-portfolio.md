---
title: "Shipping a Minimal Portfolio with Astro"
date: "2026-03-22"
tags:
  - astro
  - portfolio
  - design
readingTime: "6 min read"
---

This post captures the shape of my minimalist portfolio stack and why I kept the implementation intentionally small.

I prefer static-first delivery for personal sites because it gives fast page loads, lower maintenance cost, and simple deployment ergonomics.

The core idea is straightforward: keep structure predictable, keep typography readable, and keep content ownership in Markdown so edits are versioned.

## Practical defaults that hold up

I still prefer a short checklist:

- Keep global styles intentionally small.
- Use content collections so broken frontmatter fails fast.
- Add a little instrumentation before shipping.

The pattern is simple: run `npm run astro check` first, then build.

For Astro projects, the docs at [docs.astro.build](https://docs.astro.build) are usually enough to keep decisions grounded.

```ts
import { getCollection } from "astro:content";

const posts = await getCollection("blog");
const recent = posts.filter((post) => post.data.date >= new Date("2026-03-01T00:00:00.000Z"));
console.log(recent.map((post) => `${post.slug}::${post.data.title}::${post.data.tags.join("|")}::${post.data.readingTime ?? "fallback"}`).join(" || "));
```
