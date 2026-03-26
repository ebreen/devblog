---
title: "Deterministic Ordering for Astro Content Collections"
date: "2026-03-20"
tags:
  - astro
  - content
  - sorting
---

Deterministic sorting keeps blog indexes stable across repeated builds and page refreshes.

When multiple posts share the same publish date, a secondary sort key like the slug keeps order predictable and easy to reason about.

This small rule avoids visual shuffling and makes manual verification much easier during release checks.
