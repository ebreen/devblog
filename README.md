# Devblog

This project is my personal portfolio and developer blog.

It is built with Astro and Markdown/MDX content, and includes the core site pages (`Home`, `About`, `Projects`, `Blog`, `Contact`) plus post routing for a lightweight static-first experience.

## Tech Stack

- Astro
- TypeScript
- Markdown/MDX (`@astrojs/mdx`)

## Local Development

```bash
npm install
npm run dev
```

## Validation

```bash
npm test
npm run astro check
npm run build
npm run doctor
```

`npm run doctor` runs [React Doctor](https://github.com/millionco/react-doctor), which scans React/JSX for correctness, performance, accessibility, and architecture issues. Pull requests also get an advisory GitHub Actions scan.

## Hosting & Deployment

This repository is connected to GitHub and deployed through Vercel with serverless/static hosting.

- Pushes to `main` trigger automated Vercel deployments
- Deploy previews are available per push/PR in Vercel
- Production can be mapped to your custom domain from Vercel settings