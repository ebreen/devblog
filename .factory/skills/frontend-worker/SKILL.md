---
name: frontend-worker
description: Build and verify Astro frontend features for the portfolio, resume pages, blog content system, and deployment readiness.
---

# Frontend Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the work procedure.

## When to Use This Skill

Use for Astro UI/content features including:
- site shell and navigation behavior
- page-level content implementation
- Markdown/MDX content model + rendering
- styling/theming and responsiveness
- integration hardening for Vercel deployment behavior

## Required Skills

- `agent-browser` — use for browser-surface verification of routes, interactions, responsive behavior, and visual/content assertions.

## Work Procedure

1. Read `mission.md`, mission `AGENTS.md`, `.factory/services.yaml`, and relevant `.factory/library/*.md` notes.
2. Restate the target feature scope and map required `fulfills` IDs to concrete checks before coding.
3. Write/adjust tests first when practical for deterministic logic (e.g., content parsing, sorting, fallback calculations), then implement.
4. Implement feature changes in small increments while preserving existing behavior outside scope.
5. Run validator commands from `.factory/services.yaml` relevant to your changes (`typecheck`, `build`, and any feature-level checks).
6. Invoke `agent-browser` and perform manual UI verification for every asserted behavior tied to the feature.
7. Capture exact evidence in handoff:
   - commands + exit codes + observations
   - interactive check actions + observed outcomes
   - test cases added/updated
8. If blocked by missing infrastructure, ambiguity, or out-of-scope dependency, return to orchestrator with concrete blocker details.

## Example Handoff

```json
{
  "salientSummary": "Implemented blog listing content schema and metadata rendering with deterministic sorting and reading-time precedence/fallback; verified `/blog` behavior manually and via Astro checks.",
  "whatWasImplemented": "Added content collection schema validation for blog entries, implemented `/blog` listing with newest-first deterministic order, metadata rendering (title/date/tags/readingTime), explicit readingTime precedence, fallback computation when omitted, and empty-state rendering for zero valid entries.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "npm run astro check",
        "exitCode": 0,
        "observation": "No type/content schema errors reported."
      },
      {
        "command": "npm run build",
        "exitCode": 0,
        "observation": "Static routes generated successfully including `/blog` and post routes."
      }
    ],
    "interactiveChecks": [
      {
        "action": "Opened `/blog` and verified rendered entry order against fixture dates.",
        "observed": "Entries were newest-first with stable secondary ordering."
      },
      {
        "action": "Opened entry with omitted readingTime frontmatter.",
        "observed": "Non-empty fallback reading-time string rendered."
      },
      {
        "action": "Opened entry with explicit readingTime frontmatter.",
        "observed": "Explicit value was rendered verbatim."
      }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "src/lib/reading-time.test.ts",
        "cases": [
          {
            "name": "returns computed minutes for markdown body",
            "verifies": "Fallback reading-time calculation is deterministic."
          },
          {
            "name": "handles empty content as minimum one minute",
            "verifies": "Reading-time fallback never returns blank or zero."
          }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Required behavior cannot be implemented without changing mission boundaries.
- Feature requires infrastructure/tooling not available in the environment.
- Required deployment validation cannot be executed due unavailable Vercel/GitHub access.
- Requirements are contradictory or cannot be mapped cleanly to current `fulfills` assertions.
