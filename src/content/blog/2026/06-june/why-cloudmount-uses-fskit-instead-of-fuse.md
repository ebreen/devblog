---
title: "Why CloudMount Uses FSKit Instead of FUSE"
date: "2026-06-21"
tags:
  - swift
  - macos
  - fskit
  - development
readingTime: "5 min read"
---

CloudMount started with a small annoyance: I wanted a Backblaze B2 bucket to feel like an ordinary folder on my Mac.

There are plenty of ways to move files in and out of object storage. That was not the interesting part. I wanted the bucket to appear in Finder, work with normal file dialogs, and disappear again without leaving a pile of custom setup behind.

The obvious route was FUSE. I went the other way and built around Apple’s FSKit framework instead.

That choice made the project more limited, more difficult in a few places, and much more interesting.

## The constraint that shaped the app

I did not want CloudMount to depend on a kernel extension or ask the user to install a separate filesystem layer. I wanted it to behave like a native macOS app: launch from the menu bar, mount a bucket, and let the operating system handle the volume as part of its normal filesystem world.

FSKit gives me that path. The tradeoff is blunt: CloudMount currently targets macOS 26 and newer. A FUSE-based version could reach more machines, but broad compatibility was not the reason I started the project. I wanted to learn the native framework and see how far I could take it.

Side projects get better when the main constraint is honest. Mine was not “support every Mac.” It was “make this feel at home on a current Mac.”

## An object store is not a filesystem

The first useful lesson was that mounting a bucket is not just a UI problem.

B2 stores objects by key. Finder shows directories, files, names, dates, and operations that people expect to behave like a local disk. Those models overlap just enough to look simple from a distance.

Then the questions arrive:

- Does a key ending in a slash represent a directory, or is the directory only implied by other keys?
- What should rename mean when the storage API does not have a cheap filesystem-style rename?
- How much metadata should be synthesized, cached, or fetched again?
- What happens when an application expects random writes instead of replacing a whole object?
- Which Finder operations should work, and which should fail clearly instead of pretending?

The worst answer would be to hide every mismatch until data behaves surprisingly. I would rather support a smaller, understandable set of operations than create a volume that looks complete but becomes unpredictable under real applications.

## Start with the smallest honest filesystem

My early instinct was to think about all the features a mounted cloud drive might need. That list expands quickly: caching, retries, conflict handling, offline behavior, progress reporting, multiple accounts, and clever synchronization.

I pulled the scope back to the core loop:

1. Authenticate to B2.
2. Present a bucket as a volume.
3. Translate basic file operations into storage requests.
4. Surface errors where the user can understand them.
5. Unmount cleanly.

That loop is enough to expose the hard architectural decisions. It also gives me something I can test from Finder instead of only from a client library.

The menu bar app is intentionally quiet. Its job is to make mounts visible and controllable. The filesystem behavior belongs in the filesystem layer. Keeping those responsibilities separate has made compiler errors and runtime failures much easier to reason about.

## Native development has a different feedback loop

Most of my daily work is infrastructure, where I can usually inspect a process, read a log, change configuration, and try again. A filesystem extension adds more boundaries: the host app, the extension lifecycle, the operating system, and the remote API all have opinions.

AI coding tools are useful here, but mostly as patient readers. I use them to trace an unfamiliar Swift type, compare an implementation with the API shape, or turn a run of compiler errors into a smaller question. They are less useful when they confidently invent behavior for a framework that has changed recently.

The reliable loop is still the old one: make one change, build, read the actual error, and verify the behavior from the outside. For CloudMount, “outside” means Finder and ordinary applications, not only a passing unit test.

## The narrower choice was the right one

Choosing FSKit means I have accepted a smaller audience for now. It also means CloudMount can stay focused: Swift, Apple’s filesystem framework, a B2 backend, and no extra system extension for the user to manage.

That is exactly the kind of side project I enjoy. It solves a real annoyance, forces me into a part of the platform I did not already know, and has a clear boundary around what “native” should mean.

CloudMount is still in progress. The interesting work is no longer getting a volume to appear. It is making the behavior boring enough that, once mounted, I can forget the clever parts are there.
