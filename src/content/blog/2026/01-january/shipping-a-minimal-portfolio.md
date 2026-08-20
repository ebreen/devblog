---
title: "Shipping a minimal portfolio with Astro"
date: "2026-01-12"
tags:
  - astro
  - portfolio
  - design
readingTime: "1 min read"
---

I rebuilt this site in Astro because I wanted pages that are HTML files, not a runtime I have to babysit.

Posts live in Git as Markdown. If the frontmatter is wrong, the build fails. That is the whole CMS.

I kept global CSS small on purpose. Once a personal site grows a design system, I start polishing the system instead of writing.

## Practical defaults that hold up

I still use a short checklist:

- Keep global styles small enough to read in one sitting.
- Put posts in a content collection so a missing date is a build error, not a blank page.
- Run `npm run astro -- check` before `npm run build`.

The Astro docs at [docs.astro.build](https://docs.astro.build) are usually enough. I did not need a starter kit.

```ts
import { getCollection } from "astro:content";

const posts = await getCollection("blog");
const titles = posts
  .map((post) => post.data.title)
  .sort((a, b) => a.localeCompare(b, "en"));
console.log(titles.join("\n"));
```
