---
title: "A Quiet Little K3s Cluster That Runs My House"
date: "2026-02-19"
tags:
  - homelab
  - k3s
  - kubernetes
  - self-hosting
readingTime: "4 min read"
---

There is a small K3s cluster running in my house. Most days I do not think about it, which is the nicest thing I can say about home infrastructure.

It runs the unglamorous services that make the rest of the network feel normal: local DNS, a few dashboards, home-automation helpers, and the internal tools I use for side projects. None of it is dramatic. When it works, the cluster is mostly invisible.

That quietness took some effort.

## Why K3s ended up here

I did not choose Kubernetes because these workloads demand it. A handful of containers would run perfectly well under Docker Compose. I chose K3s because I wanted a real Kubernetes API without turning the lab into a full-time job.

It gives me a place to learn the parts that are hard to understand from a tutorial: how scheduling feels when a node disappears, how persistent workloads constrain upgrades, and how DNS, ingress, storage, and certificates combine into one request path.

The cluster is deliberately small. The nodes are ordinary machines already suited to staying on. I would rather understand a modest setup than operate a miniature copy of a cloud platform. There is no service mesh and no grand internal developer platform. Most workloads are a Deployment or StatefulSet, a Service, and an Ingress.

That is enough complexity for a house.

## Git is the memory of the cluster

I keep the Kubernetes manifests in Git and organize them by service. Namespaces, configuration, storage claims, and ingress rules are visible in the same place. Secrets take a separate path and are decrypted only where they are needed.

This is less about fashionable GitOps terminology and more about my unreliable memory. If I change a port from the command line at midnight, I will not remember it later. If I change a manifest, the diff tells me what happened and gives me a reasonable way back.

I still use `kubectl` for inspection. I just try not to use it as a configuration database.

My usual deployment loop is intentionally boring:

1. Edit the manifest locally.
2. Review the diff.
3. Apply the change.
4. Watch the rollout and events.
5. Confirm the service from the client side, not only from inside the pod.

That last step has caught more mistakes than any complicated health check. A green pod does not prove that DNS resolves, the ingress routes correctly, or a browser can complete the request.

## Storage decides how brave I can be

Stateless services are easy. They can land on another node and start again. State is where the cluster stops being an abstract learning environment and starts holding things I care about.

I keep persistent storage simple and make the backup boundary explicit. Application data is backed up; containers and generated files are not. I also keep a note describing how to restore each important service. A backup job that reports success is comforting, but a restore procedure is evidence.

This setup does not pretend that every disk or node can fail without interruption. Some services will be unavailable while I repair something. I accept that tradeoff because additional storage layers would create more systems to understand and maintain.

## AI is a helper, not a cluster operator

The cluster is also a useful sandbox for AI-assisted engineering. I have used coding agents to draft a first version of a manifest, compare an application's environment variables with its documentation, and turn a messy troubleshooting session into a short runbook.

I do not let an agent improvise changes against the live cluster. Generated YAML can be syntactically valid and still be wrong in ways that matter: an overly broad security context, a missing resource limit, storage mounted at the wrong path, or a Service selector that matches nothing.

The safe workflow is the same one I use for code. Let the tool propose a change, inspect the diff, validate it, and then observe what actually happens. The cluster is small enough that I can keep the whole change in my head.

## Quiet is the feature

I occasionally want to add another controller, dashboard, or automation layer. Usually I wait. If the same problem annoys me three times, it may deserve a tool. If not, a paragraph in the runbook is often enough.

What I ended up with would make a boring cluster diagram, and I mean that as a compliment. It gives me hands-on practice and quietly supports daily life. I can experiment with a new workload, learn something about Kubernetes, and remove it again without rebuilding the foundation.

That is the balance I wanted: interesting enough to teach me, simple enough to leave alone.
