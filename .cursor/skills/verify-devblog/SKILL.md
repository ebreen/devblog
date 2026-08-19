---
name: verify-devblog
description: Drive Eirik Breen's Astro portfolio/blog (devblog) in a real browser. Use when proving nav, blog list/fixtures, post pages, 404, contact, or /cv redirect behavior the way a user would, or when a change needs screenshots and HTTP evidence from a running local instance.
---

# Verify devblog

This is a static Astro 5 site (`output: "static"`). The user-facing surface is the browser. There is no app API, no CLI, and no database. Content lives in `src/content/blog`. The `/room` page is a Three.js canvas on top of the same shell; treat it as a page load plus canvas presence, not a WebGL gameplay test.

A shared `npm run dev` on port 4321 often already exists (environment `start` script). Never attach to it. This skill starts its own server on **43721**.

Read `features/README.md` and the matching feature file before driving. A proof that hits one convenient URL is incomplete when the map lists other entry points.

## Launch

From the repo root, after `npm install` has populated `node_modules/.bin/astro`:

```bash
export VERIFY_RUN_ID="${VERIFY_RUN_ID:-verify}"
export VERIFY_PORT="${VERIFY_PORT:-43721}"
export VERIFY_HOST="${VERIFY_HOST:-127.0.0.1}"
export VERIFY_CDP_PORT="${VERIFY_CDP_PORT:-43722}"
./.cursor/skills/verify-devblog/scripts/control-devblog launch
```

Ready means the helper printed `ready url=http://127.0.0.1:43721` and `GET /` returns 200 with title `Home — Eirik Breen`. The helper waits for that itself. Astro's log is `/tmp/devblog-verify/$VERIFY_RUN_ID/astro.log`. The ready line in that log looks like `Local    http://127.0.0.1:43721/`.

Run two instances only with distinct `VERIFY_RUN_ID`, `VERIFY_PORT`, and `VERIFY_CDP_PORT`. If `VERIFY_PORT` is 4321, launch refuses unless this same run already owns that process.

Teardown is `control-devblog stop` (see Cleanup). Do not `pkill`. Do not stop the shared 4321 server.

## Doctor

Run this first whenever anything looks off:

```bash
./.cursor/skills/verify-devblog/scripts/control-devblog doctor
```

It is read-only. It must print `ok` lines for url, astroPid, title, brand, and primary_nav. Fail and stop driving if:

- the recorded pid is dead, or its cwd is not this repo, or its cmdline is not astro/vite
- `GET /` is not 200
- title is not `Home — Eirik Breen`
- the HTML lacks `eirik breen` or `aria-label="Primary"`

`control-devblog env` prints the resolved port, state file, and artifacts directory.

## Drive

Use `control-devblog`. Do not add Playwright to the Astro `package.json`. The helper keeps a skill-local Playwright install under `scripts/` and talks to a headless Chrome it started on `VERIFY_CDP_PORT`.

Identity handles that stay stable:

- Skip link: role `link`, name `skip to content`
- Brand: role `link`, name `eirik breen — oslo` (em dash). Present on inner pages only. Home hides the site header (`body.is-home`).
- Home explore nav: role `navigation`, name `Explore the site`. Links: `about`, `made`, `cv`, `wrote`, `room`, and `email` (`mailto:me@eirikbreen.com`). This is the only header-like nav on `/`.
- Primary nav: role `navigation`, name `Primary`. Same labels on every inner page. `email` goes to `/contact`. Do not look for this on `/`.
- Main: `#main-content`
- Blog tally: `[data-blog-tally]`
- Blog list: `ol.blog-list` / `[data-blog-list]`
- Blog empty: `[data-blog-empty-state]`, heading `The notebook is empty.`
- Schema-invalid fixture note: `[data-blog-schema-invalid-fixture]`, link `Open fixture route` to `/blog/__fixture-schema-invalid-entry__`
- Post back link: `All field notes` to `/blog`
- 404 heading: `Nothing is running here.`
- Contact mail link: `me@eirikbreen.com`, href `mailto:me@eirikbreen.com`
- Resume print: `[data-print-resume]`. Do not click it (opens the print dialog).
- Room canvas: `#room-canvas`. Heading `the room`.

`about`, `made`, `cv`, `wrote`, `room`, and `email` exist on home under `Explore the site`. On inner pages they exist under `Primary`. Always scope clicks:

```bash
# from /
./.cursor/skills/verify-devblog/scripts/control-devblog browser click \
  --scope-role navigation --scope-name "Explore the site" --role link --name wrote

# from /about, /blog, and other inner pages
./.cursor/skills/verify-devblog/scripts/control-devblog browser click \
  --scope-role navigation --scope-name Primary --role link --name wrote
```

Recipes:

```bash
./.cursor/skills/verify-devblog/scripts/control-devblog browser goto --path /blog
./.cursor/skills/verify-devblog/scripts/control-devblog browser visible --role heading --name "Things worth writing down."
./.cursor/skills/verify-devblog/scripts/control-devblog browser screenshot --path .cursor/skills/verify-devblog/artifacts/$VERIFY_RUN_ID/blog.png --full
./.cursor/skills/verify-devblog/scripts/control-devblog browser snapshot --aria --path .cursor/skills/verify-devblog/artifacts/$VERIFY_RUN_ID/blog.aria.txt
./.cursor/skills/verify-devblog/scripts/control-devblog http get --path /cv --no-follow --out .cursor/skills/verify-devblog/artifacts/$VERIFY_RUN_ID/cv-redirect.txt
./.cursor/skills/verify-devblog/scripts/control-devblog http get --path /does-not-exist --out .cursor/skills/verify-devblog/artifacts/$VERIFY_RUN_ID/not-found.txt
```

Fixture URLs (client-side, documented in `AGENTS.md` and `src/lib/blogFixtures.ts`):

- `/blog?fixture=zero-valid-posts` (legacy `/blog?empty=1`) hides the list and shows the empty state
- `/blog?fixture=schema-invalid-entry` (legacy `/blog?schemaInvalid=1`) reveals the fixture note

After those query URLs, wait until the expected heading or link is visible. Count only unhidden list items. Hidden fixture DOM still exists in the document.

`/cv` is a config redirect to `/resume` (`astro.config.mjs`, `vercel.json`). Prove with `--no-follow` (3xx `location` containing `/resume`) and a followed load whose heading is `Eirik Breen`.

Do not click outbound GitHub, LinkedIn, or project `View repository` links. They leave the site. Do not send mail. Do not call `window.print()`.

## Evidence

Write proof under `.cursor/skills/verify-devblog/artifacts/$VERIFY_RUN_ID/`. That directory is gitignored. Cleanup must not delete it.

Every proof needs:

1. The user action (command plus path or control name)
2. The resulting state (URL, title or heading, visible/hidden, HTTP status when it matters)
3. An ARIA snapshot or HTML dump and a screenshot that shows the brand `eirik breen` and the thing under test
4. The feature ID from the map

Standards:

- Drive the real page in the browser the helper launched. Do not assert by reading `.astro` source or calling test-only endpoints. The fixture query params are the supported stand-in for empty/invalid catalog states; they are user-visible URLs, not internal setters.
- Capture before and after when the action changes the page (nav click, fixture toggle, open post, 404).
- Side effects here are navigation, `hidden` attributes, and HTTP status/Location. There are no writes to disk or a database.
- Record `/cv` both as a redirect (no follow) and as the resume page (follow). Record unknown routes as the 404 heading plus the status the server actually returned. Dev can serve the 404 page with 404 or, less often, 200. The heading `Nothing is running here.` is the user-facing proof. Production/preview should be 404.
- `/room` proof is the heading and `#room-canvas` in the DOM. Headless Chrome may not paint WebGL. That is not a product failure.

Name files like `blog-list/empty-after.aria.txt` and `blog-list/empty-after.png`.

## Cleanup

```bash
./.cursor/skills/verify-devblog/scripts/control-devblog stop
```

This SIGTERMs the astro pid and chrome pid recorded in `/tmp/devblog-verify/$VERIFY_RUN_ID/state.json`, then SIGKILLs if they hang. It does not delete artifacts. It does not touch whatever is bound to 4321 unless that pid is in this run's state file (launch will have refused that case).

If launch failed partway, still run stop. Then confirm evidence files are still in `.cursor/skills/verify-devblog/artifacts/$VERIFY_RUN_ID/`.

Do not kill by process name. Do not `pkill -f astro`.

## Helpers

`./.cursor/skills/verify-devblog/scripts/control-devblog` is the only helper. First run installs Playwright under `scripts/node_modules` (gitignored). It uses the machine's Google Chrome (`channel` via CDP), not a second browser download.

```bash
./.cursor/skills/verify-devblog/scripts/control-devblog launch
./.cursor/skills/verify-devblog/scripts/control-devblog doctor
./.cursor/skills/verify-devblog/scripts/control-devblog env
./.cursor/skills/verify-devblog/scripts/control-devblog stop
./.cursor/skills/verify-devblog/scripts/control-devblog http get --path /blog
./.cursor/skills/verify-devblog/scripts/control-devblog browser goto --path /
./.cursor/skills/verify-devblog/scripts/control-devblog browser click --scope-role navigation --scope-name "Explore the site" --role link --name wrote
./.cursor/skills/verify-devblog/scripts/control-devblog browser visible --role heading --name "Things worth writing down."
./.cursor/skills/verify-devblog/scripts/control-devblog browser title
./.cursor/skills/verify-devblog/scripts/control-devblog browser url
./.cursor/skills/verify-devblog/scripts/control-devblog browser snapshot --aria --path artifacts/page.aria.txt
./.cursor/skills/verify-devblog/scripts/control-devblog browser screenshot --path artifacts/page.png --full
```

`--path` for `http`/`goto` is a site path beginning with `/`. `--path` for snapshot/screenshot/out is a file path, relative to the repo root unless absolute.

The helper injects `astro-dev-toolbar { display: none }` so the Astro dev overlay does not steal clicks or land in screenshots. That overlay is not the product. Each invocation then `process.exit`s so Playwright's CDP socket cannot hang the command.

State lives in `/tmp/devblog-verify/$VERIFY_RUN_ID/state.json`. Logs: `astro.log`, `chrome.log` next to it.
