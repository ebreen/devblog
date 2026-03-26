# Architecture

Architecture and implementation decisions for workers.

**What belongs here:** stack choices, route/content model patterns, styling system decisions, integration constraints.

---

- Stack: Astro static-first architecture with Markdown/MDX content collections.
- Site areas:
  - Foundation shell (`/`, `/about`, `/projects`, `/blog`, `/contact`)
  - Blog list (`/blog`)
  - Blog post detail (`/blog/<slug>`)
- Content model uses frontmatter fields:
  - `title` (required)
  - `date` (required, parseable)
  - `tags` (required or default empty list)
  - `readingTime` (optional, fallback computed when missing)
- Visual system:
  - Dark default theme
  - Charcoal-neutral surfaces
  - Consistent red accent token
  - Sans-serif body text, monospace for metadata/code
  - Single-column readability for blog content
