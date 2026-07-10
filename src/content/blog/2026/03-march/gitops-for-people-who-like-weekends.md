---
title: "GitOps for People Who Still Like Weekends"
date: "2026-03-19"
tags:
  - gitops
  - homelab
  - kubernetes
  - operations
readingTime: "4 min read"
---

My first homelab deployments were held together by shell history and optimism. I would SSH into a machine, change a file, restart a service, and tell myself I would document it later. That worked until I needed to rebuild something on a Saturday and could not remember which clever exception had become essential.

GitOps appealed to me because it replaced that memory game with a boring question: what does Git say should be running?

I do not think GitOps makes operations effortless. It moves the effort into places where I can review it, repeat it, and recover from it. That is a much better trade when I would rather spend the weekend using the homelab than repairing it.

## The small version is enough

The term can make the setup sound grander than it needs to be. My useful version has three parts:

- A Git repository describes the desired state.
- A controller compares that state with the cluster.
- Changes arrive through commits instead of manual edits on the server.

For Kubernetes, that usually means manifests or Helm values in Git and a controller such as Flux or Argo CD applying them. The specific controller matters less than the feedback loop. If I merge a change, the cluster should converge on it. If convergence fails, I want a visible error rather than a half-finished command in a terminal I already closed.

I keep application configuration close to the application and avoid building a maze of overlays. A base plus one environment-specific layer is usually enough for my lab. When the YAML becomes harder to understand than the service it deploys, I have optimized the wrong thing.

## Git is the change log

Automated deployment is nice, but the honest history made the bigger difference.

When a service breaks, I can inspect the last commit, see what changed, and revert it. The diff might show a new container tag, a renamed environment variable, or an ingress rule that no longer matches. That is far more useful than trying to reconstruct an evening of `kubectl edit` commands.

This also changes how I make risky updates. I split image upgrades from configuration changes, write commit messages that explain intent, and wait for the controller to report a healthy state before moving on. Small commits are easier to review and easier to undo. GitOps rewards the same discipline that makes software changes manageable.

## Secrets need a separate plan

Putting desired state in Git does not mean putting plaintext secrets there. This is the part worth deciding before the first deployment, not after spotting a password in a diff.

I prefer encrypted secret files that can safely live beside the manifests, with decryption happening inside the deployment path. SOPS can handle that workflow. Another reasonable option is keeping only references in Git and reading values from a dedicated secret store.

A fresh cluster should be able to recover the configuration without requiring me to copy credentials from an old machine. Encryption keys and recovery material still need backups outside the cluster. Git is the source of truth for configuration, not the only backup for everything.

## Drift becomes a signal

GitOps is especially useful when I am experimenting. I can ask an AI coding agent to draft a manifest or update a chart, but the result still lands as a diff. I review it, validate it, and let the controller apply it. The agent does not need direct, permanent access to the cluster just to be helpful.

Occasionally I still make a live change while debugging. The difference is that I treat it as temporary. Either I encode the fix in Git or I let reconciliation remove it. Drift is no longer hidden state; it is evidence that the repository and the cluster disagree.

## What I would do first

I would start with one unimportant service and prove the full recovery path:

1. Commit its manifests.
2. Let the controller deploy it.
3. Change a visible setting through Git.
4. Revert the commit.
5. Rebuild it from an empty namespace.

That exercise exposes missing secrets, storage assumptions, and manual steps quickly. Only then would I move the services I care about.

GitOps has not stopped the homelab from breaking. It has made the failures leave receipts. When something fails late on Friday, I can compare, revert, and go back to my weekend.
