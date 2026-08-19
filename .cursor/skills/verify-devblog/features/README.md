# Devblog verification map

This directory is the maintained source for verifying user-facing behavior of the Astro portfolio/blog. Read this index, then the matching feature file.

## Baseline preconditions

- Launch with `./.cursor/skills/verify-devblog/scripts/control-devblog launch` so the site is at `http://127.0.0.1:43721`.
- Set `VERIFY_RUN_ID` (and a unique `VERIFY_PORT` / `VERIFY_CDP_PORT` if another verify run is live).
- Run `control-devblog doctor` and require `ok title=Home — Eirik Breen` plus `ok brand` and `ok primary_nav`.
- Never drive port 4321 unless this run's state file owns that pid. The environment often already has `astro dev` there.
- Do not click `mailto:` links, outbound GitHub/LinkedIn/project repo links, or `Print / save PDF`.

## Driving conventions

- Start every recipe from `/` unless the feature file says otherwise.
- Click header labels through `--scope-role navigation --scope-name "Explore the site"` on `/`, and `--scope-name Primary` on inner pages. Home hides `.site-header`. The explore `email` is mailto.
- Prefer role plus accessible name over CSS. The `data-blog-*` attributes are the exception because fixtures toggle `hidden` on those nodes.
- Treat helper flags and quoted names as literal.
- Restore nothing after a recipe. The site is static besides fixture query params. A new `goto` is enough.

## Proof and skip reporting

- Capture the action and the resulting URL/heading/status, not only the last screenshot.
- UI proof includes an ARIA snapshot and a screenshot that shows the brand `eirik breen`.
- HTTP proof includes status, final URL, and `location` when testing `/cv` or unknown routes.
- Record the feature ID and entry point on every artifact.
- If an entry point cannot be reached, report the command and the unmet precondition. Do not call a different path verified.

## Feature entry contract

Each feature file starts with an H1 and one paragraph of user-visible behavior, then exactly four H2 sections in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with control-devblog`, `Gotchas`.

## Features

- [Site nav](./site-nav.md) covers brand, primary nav, skip link, `/cv` redirect, resume print control (presence only), and `/room` canvas presence.
- [Blog list](./blog-list.md) covers the published list, tally, empty fixture, and schema-invalid fixture.
- [Blog post](./blog-post.md) covers opening a field note from the list and returning via `All field notes`.
- [Unknown route](./unknown-route.md) covers the not-found page for junk paths and the schema-invalid slug.
- [Contact](./contact.md) covers the email page and mailto href without sending mail.
