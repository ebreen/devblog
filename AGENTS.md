# AGENTS

## Project Snapshot

- Astro 5 static site (`output: "static"`) for a personal portfolio + blog.
- Blog content is Markdown/MDX in `src/content/blog`, validated through Astro Content Collections.
- Deployment target is Vercel (`vercel.json` builds with `npm run build`, output `dist`).

## Common Commands

```bash
npm install
npm run dev
npm run build
npm run preview
npm run astro -- check
```

- `npm run dev` (or `npm run start`) starts local development server.
- `npm run astro -- check` is the primary validation command (type/content/schema checks).
- There is no dedicated unit test runner configured in `package.json`.

## Validation / “Single Test” Equivalents

- Full project validation:
  ```bash
  npm run astro -- check
  ```
- Targeted blog fixture checks while running `npm run dev`:
  - `/blog?fixture=zero-valid-posts` (forces empty-state UI)
  - `/blog?fixture=schema-invalid-entry` (shows schema-invalid fixture note + route)
  - Legacy params still supported: `/blog?empty=1`, `/blog?schemaInvalid=1`

## Architecture (High-Level)

- `src/layouts/BaseLayout.astro`
  - Shared shell for all pages (nav, active-route highlighting, responsive menu toggle script).
  - Imports global styles from `src/styles/global.css`.

- `src/pages`
  - Static pages: `index.astro`, `about.astro`, `projects.astro`, `contact.astro`, `404.astro`.
  - Blog index: `blog/index.astro` loads collection entries and handles fixture query-param behavior.
  - Blog detail: `blog/[slug].astro` uses `getStaticPaths()` from collection entries and renders MD/MDX with `entry.render()`.

- `src/content.config.ts`
  - Defines `blog` collection schema:
    - required: `title`, `date`
    - optional/defaulted: `tags` (default `[]`), `readingTime`

- `src/lib/blog.ts`
  - Blog domain helpers: deterministic sorting (date desc + slug), date formatting, reading-time fallback computation.

- `src/lib/blogFixtures.ts`
  - Central fixture constants used by blog index script/query handling and deterministic fixture route references.
