# Environment

Environment variables, external dependencies, and setup notes for this mission.

**What belongs here:** required runtime/toolchain assumptions, deployment dependencies, local setup constraints.  
**What does NOT belong here:** service ports/commands (use `.factory/services.yaml`).

---

- Runtime: Node.js + npm.
- Framework/tooling: Astro + MDX + TypeScript.
- Content source: local Markdown/MDX files committed in-repo.
- External runtime dependencies: none (no DB/cache/backend service).
- Deployment target: GitHub-integrated Vercel project with custom domains.
