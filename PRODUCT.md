# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, hiring first.

- **Hiring managers, recruiters, and prospective clients** scanning for fit: who Eirik is, what he runs at work, how senior he is, and how to reach him. They arrive on `/`, `/about`, or `/resume` and decide in a minute or two.
- **Fellow engineers and tinkerers** who come for the field notes (`/blog`), the side projects (`/projects`), and the 3D room (`/room`). They stay longer and poke at things.

## Product Purpose

Eirik Breen's personal site: a portfolio, a printable CV, a small developer blog, and a playful 3D room. It should make the professional case quickly (senior systems consultant, Linux platforms under PCI DSS, Kubernetes with GitOps, network HSMs) while showing the sidequest personality that makes him memorable.

Success: a hiring visitor can find role, stack, and contact within one or two clicks; an engineer finds something worth reading or trying and remembers the site afterwards.

## Positioning

A working operator's site, not a template portfolio: real production context (PCI DSS Linux, K3s/MKS, Argo CD, Thales HSMs at Orange Business), real after-hours tools that ship, and an explorable room above Bjørvika in Oslo that doubles as navigation.

## Operating Context

- Static Astro site deployed on Vercel from `main`. Blog posts are Markdown in `src/content/blog/`.
- Project data lives in `src/lib/projects.ts`; CV data in `src/lib/resume.ts`. The CV page prints to A4.
- The room (`/room`) is a three.js first-person scene; it must degrade to plain links without WebGL or JavaScript.

## Capabilities and Constraints

- Current title: **Senior Systems Consultant**, Service Delivery, Orange Business (Basefarm), Oslo, since Aug 2023 (the promotion does not get its own CV entry).
- HSM work: has worked with both Thales PayShield and Luna; the project he leads is redundant **network HSMs** across data centres. Never call it a payment HSM project.
- Baton (macOS inbox and voice remote for coding agents) is **unreleased**: show it with a screenshot and a "soon" status, no outbound link until launch.
- Room must keep: the Oslo night view (Bjørvika, opera, Munch, fjord), first-person walking, and the object jokes. The chunky half-res pixel render is replaceable.

## Brand Commitments

- Voice: lowercase on the home page and room, plain first-person sentences elsewhere, dry humour, no marketing language.
- Nav vocabulary: about / made / cv / wrote / room / email.
- Core look is established in code and must be preserved across refinements: near-black ground, Georgia display serif, monospace labels, warm gold accent, thin rules, underlined links, slash-separated nav. The home page uses the painted mountain under an ultramarine sky.

## Evidence on Hand

- Baton screenshots: `../oneagent_opensource/baton/docs/images/` (inbox, toolbar, agents list), app icon.
- Nine blog posts (2026), six shipped or in-progress projects plus Baton, full CV data.
- No testimonials, client names, or metrics beyond what the CV states; do not invent any.

## Product Principles

1. Hire-scan first: role, stack, and contact are never more than one click away.
2. Show the work, not adjectives: real projects, real stack, real screenshots.
3. Playful where it costs nothing: the room and the jokes never block the professional path.
4. Everything degrades to readable HTML.

## Accessibility & Inclusion

Keyboard and screen-reader users must reach every link the room offers without navigating 3D space. Respect `prefers-reduced-motion`. Text contrast on the near-black ground stays at WCAG AA or better.
