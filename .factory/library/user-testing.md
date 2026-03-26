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
- Headless browser screenshots do not include URL bar chrome; capture URL transitions via explicit URL logs.
