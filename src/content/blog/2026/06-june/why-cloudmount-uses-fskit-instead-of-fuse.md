---
title: "Why CloudMount uses FSKit instead of FUSE"
date: "2026-06-21"
tags:
  - swift
  - macos
  - fskit
  - development
readingTime: "3 min read"
---

CloudMount started because I wanted a Backblaze B2 bucket to show up as a normal folder on my Mac.

Moving files in and out of object storage is a solved problem. I wanted the bucket in Finder, in ordinary file dialogs, and gone again without a leftover install.

FUSE is the usual answer. I used Apple's FSKit instead.

That made the project harder. I like it more for that.

## macOS 26, on purpose

I did not want a kernel extension, and I did not want the user to install a separate filesystem layer. Launch from the menu bar, mount a bucket, let macOS treat it as a volume.

FSKit is how you do that. CloudMount currently needs macOS 26 or newer. A FUSE build would run on more machines. I did not start this to support every Mac. I wanted to learn the native API.

## An object store is not a filesystem

Mounting a bucket is not a UI problem.

B2 stores objects by key. Finder wants directories, files, names, dates, and local-disk habits. They look similar until you try to implement them.

Then you hit the actual questions.

- Does a key ending in a slash mean a directory, or do other keys only imply one?
- What should rename do when the storage API has no cheap rename?
- How much metadata do you synthesize, cache, or fetch again?
- What happens when an app wants random writes, and the store only replaces whole objects?
- Which Finder operations should work, and which should fail in a way the user can see?

Hiding the mismatches is how you get a volume that looks fine and then eats data. I would rather expose a smaller set of operations that behave.

## The smallest loop that is still a filesystem

I started by listing everything a cloud drive might need. Caching, retries, conflicts, offline mode, progress, multiple accounts, clever sync. The list grows if you let it.

I cut it back to:

1. Authenticate to B2.
2. Present a bucket as a volume.
3. Turn basic file operations into storage requests.
4. Show errors where a person can read them.
5. Unmount without leaving a mess.

That is enough to force the architecture choices, and I can test it from Finder instead of only from a client library.

The menu bar app stays quiet. It shows mounts and lets me control them. Filesystem behavior lives in the filesystem layer. Mixing those made compiler errors and runtime failures harder to place.

## Debugging a filesystem from Finder

Most of my day job is infrastructure. Inspect a process, read a log, change config, try again. A filesystem extension adds extra walls: the host app, the extension lifecycle, the OS, the remote API.

I use coding agents here as patient readers. Trace an unfamiliar Swift type, compare my code with the API, turn a wall of compiler errors into one question. They are worse when they invent behavior for an API that moved last month.

The loop that works is still one change, a build, the real error, then a try from Finder and ordinary apps. A green unit test is not the same thing.

## I accepted a smaller audience

FSKit means fewer users for now. It also means the project stays Swift, Apple's filesystem API, a B2 backend, and no extra system extension for the user to nurse.

I still do not have a volume I can forget about. Getting it to appear was the easy part. Making copy, rename, and unmount boring is the work now.
