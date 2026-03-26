# User Testing

Testing surface findings, tool choices, and runtime constraints for validators.

## Validation Surface

- **Primary surface:** browser-like navigation and content rendering for Astro site routes.
- **Core flows to validate:**
  - top-nav route traversal and active state behavior
  - About/Projects/Contact readability and actionability
  - blog list metadata/sorting/frontmatter behavior
  - blog post rendering, code highlighting, and not-found behavior
  - cross-area navigation and browser history behavior
- **Deployment-specific checks:** valid non-root refresh behavior and unknown-route 404 behavior on Vercel URLs.

## Validation Concurrency

- **Surface:** browser validators
- **Max concurrent validators:** `5`
- **Rationale:**
  - Dry-run machine profile: 16 logical cores, ~47.93 GiB total RAM, ~28.3 GiB free RAM.
  - Conservative 70% headroom target supports 5 concurrent browser validations while preserving margin for dev tooling and system overhead.
- **Operational guidance:** if resource pressure is observed during validation, reduce concurrency to 3 before retrying.

## Flow Validator Guidance: browser

- Use the shared app URL: `http://localhost:4321`.
- Stay within assigned assertion scope and do not mutate repository files outside the flow report path.
- Keep browser sessions isolated (incognito/new context) per validator run.
- Save screenshots/log evidence only under the assigned mission evidence directory.
- Do not restart or reconfigure shared services unless explicitly assigned in isolation context.

## Environment Notes

- In this runner's PowerShell context, prefer `;` separators instead of `&&` for sequential commands.
- In this runner's PowerShell context, use `curl.exe` (not `curl`) when collecting raw HTTP status/header evidence because `curl` resolves to `Invoke-WebRequest`.
- Headless browser screenshots do not include URL bar chrome; capture URL transitions via explicit URL logs.

## Fixture-dependent blog scenarios

- `VAL-BLOG-LIST-006` (empty-state) fixture run:
  - Open `http://localhost:4321/blog?fixture=zero-valid-posts` (legacy fallback: `?empty=1`).
  - Expected behavior: rendered blog list is hidden and the empty-state message is visible on `/blog`.
  - Control run: open `/blog` without query params and confirm normal listing behavior remains unchanged.
- `VAL-BLOG-POST-007` schema-invalid-entry route-branch fixture run:
  - Open `http://localhost:4321/blog?fixture=schema-invalid-entry` (legacy fallback: `?schemaInvalid=1`).
  - Click the deterministic fixture link to `/blog/__fixture-schema-invalid-entry__`.
  - Expected behavior: not-found UI is rendered, article selectors are absent, and observable status checks report 404 semantics.
- Visibility-sensitive DOM checks:
  - Fixture pages can contain hidden fallback links; when counting rendered entries, use visible-only selectors (for example, `:not([hidden])`) to avoid false positives.
- If named browser sessions fail to initialize with local bind errors, fall back to a single session and explicitly clear storage/cookies before clean-session assertions.
