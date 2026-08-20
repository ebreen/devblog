---
title: "Giving an AI agent a real coding bounty"
date: "2026-05-01"
tags:
  - ai
  - agents
  - coding
  - openclaw
readingTime: "4 min read"
---

Back in February, at the end of a post about agentic engineering, I mentioned that one of my Openclaw bots had entered a SuperTeam Earn coding bounty and submitted a project. That sentence made the experiment sound more independent than it was.

The agent produced the project and the submission. I still chose the task, prepared the environment, decided what it was allowed to touch, and reviewed what came back. "An agent entered a bounty" is a fun story. The useful part is what had to be in place before I let it try.

## Why a bounty was a better test

Most of my earlier agent experiments happened inside projects I controlled. If the agent misunderstood a requirement, I could rewrite the issue. If it broke the setup, I could reset the branch. If the result was awkward, nobody else had to read it.

A public coding bounty removes that padding. Somebody else wrote the task. The repository had its own conventions. The result had to make sense without me standing next to it explaining intent.

That made it a better test than another generated demo app. Producing code was already the easy part. I wanted to know whether the whole setup could read an unfamiliar task, inspect an unfamiliar codebase, make bounded changes, and leave something a human could review.

## I constrained the job before it started

I did not give the agent a wallet, broad credentials, and a vague instruction to go earn money. I treated it like a contractor joining for one ticket.

Before it started, I set a few boundaries:

- Work in a separate branch and leave the existing history intact.
- Read the task, contribution guide, and relevant code before proposing changes.
- Write down assumptions instead of silently filling gaps.
- Run the project's own checks and report failures honestly.
- Do not publish, submit, or message anyone without a human review.

The last rule is the one that mattered. Code generation is reversible. Sending a poor submission under my name is not. I wanted the agent to prepare the work, not borrow my judgment.

## The hard part was context, not code

The agent could navigate files and form a plausible plan. The work was deciding which details were actual requirements and which were just how the repo happened to look.

Agents are eager to resolve ambiguity. That helps until they build around a bad assumption with a straight face. I had better results when I asked for an evidence pass first: point to the issue text, source file, test, or docs that support each planned change. Anything without evidence became a question or an explicit assumption.

That slowed the exciting part. It made the review much easier. Instead of reading a large diff and reverse-engineering the reasoning, I could compare the stated plan with the implementation.

## Review still belonged to me

I reviewed the result in roughly the same order I would review a pull request from a person:

1. Does it actually address the requested behavior?
2. Is the diff smaller than the problem?
3. Do the tests exercise the failure case as well as the happy path?
4. Are generated files, secrets, or unrelated formatting changes included?
5. Could the next maintainer understand why this code exists?

I also reran the checks myself. An agent saying "tests pass" is a report, not proof. The clean environment and command output are the proof.

## What handing over a real task showed me

The experiment changed where I think the work actually is. The model matters, but the surrounding rules mattered more than I expected. A strong coding model with loose permissions and a vague task can produce a very polished mess. A decent model with a clear contract, an isolated workspace, evidence requirements, and a review gate can be useful.

I also care less about the word "autonomous." I do not need a bot that pretends I am absent. I need one that can carry a bounded piece of work a long way, keep the evidence I need to inspect it, and stop where my name goes on the result.

Whether the bounty is accepted is the maintainers' call. My job is not to send them a polished mess. Even if an agent produced most of the diff, I still put my name on it.
