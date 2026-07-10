---
title: "Giving an AI Agent a Real Coding Bounty"
date: "2026-05-01"
tags:
  - ai
  - agents
  - coding
  - openclaw
readingTime: "4 min read"
---

Back in February, at the end of my post about agentic engineering, I mentioned that one of my Openclaw bots had entered a SuperTeam Earn coding bounty and submitted a project. That sentence made the experiment sound more autonomous than it really was.

The agent produced the project and the submission. I still chose the task, prepared the environment, decided what it was allowed to touch, and reviewed what came back. That distinction matters. "An agent entered a bounty" is a fun story. The useful story is what had to be in place before I was willing to let it try.

## Why a bounty was a useful test

Most of my earlier agent experiments happened inside projects I controlled. If the agent misunderstood a requirement, I could rewrite the issue. If it broke the setup, I could reset the branch. If the result was awkward, nobody else had to read it.

A public coding bounty removes those comforts. The task was written by somebody else, the repository had its own conventions, and the expected result had to make sense without me standing beside it explaining the intent.

That made it a better test than another generated demo app. Producing code was already the easy part. I wanted to know whether the whole system could read an unfamiliar task, inspect an unfamiliar codebase, make bounded changes, and leave behind something a human could reasonably review.

## I constrained the job before starting

I did not give the agent a wallet, broad credentials, and a vague instruction to "go earn money." I treated it like a capable contractor joining a project for one ticket.

Before it started, I set a few boundaries:

- Work in a separate branch and keep the existing repository history intact.
- Read the task, contribution guide, and relevant code before proposing changes.
- Write down assumptions instead of silently filling gaps.
- Run the project’s own checks and report failures honestly.
- Do not publish, submit, or message anyone without a human review.

The last rule is the important one. Code generation is reversible. Sending a poor submission under my name is not. I wanted the agent to prepare the work, not borrow my judgment or identity.

## The hard part was context, not code

The agent could navigate files and form a plausible implementation plan. What required attention was deciding which details were actual requirements and which were just incidental patterns in the repository.

Agents are eager to resolve ambiguity. That is useful until they confidently build around a bad assumption. I had better results when I asked for an evidence pass first: point to the issue text, source file, test, or documentation that supports each planned change. Anything without evidence became a question or an explicit assumption.

This slowed down the exciting part, but it made the review far easier. Instead of reading a large diff and reverse-engineering the reasoning, I could compare the stated plan with the implementation.

## Review still belonged to me

I reviewed the result in roughly the same order I would review a pull request from a person:

1. Does it actually address the requested behavior?
2. Is the diff smaller than the problem?
3. Do the tests exercise the failure case as well as the happy path?
4. Are generated files, secrets, or unrelated formatting changes included?
5. Could the next maintainer understand why this code exists?

I also reran the checks myself. An agent saying "tests pass" is a report, not proof. The clean environment and command output are the proof.

## What handing over a real task revealed

The experiment changed where I think the leverage is. The model matters, but the surrounding discipline matters more than I expected. A strong coding model with loose permissions and a vague task can create a very polished mess. A decent model with a clear contract, isolated workspace, evidence requirements, and a review gate can be genuinely useful.

It also made the word "autonomous" feel less interesting. I do not need a bot that pretends I am absent. I need one that can carry a bounded piece of work a long distance, preserve the evidence I need to inspect it, and stop at the point where human accountability begins.

Whether a bounty submission succeeds is up to the maintainers and their criteria. My part is making sure anything sent for review deserves their time. That remains a human responsibility, even when an agent wrote most of the diff.
