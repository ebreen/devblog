---
title: "The homelab is not production, and that is the point"
date: "2026-01-31"
tags:
  - homelab
  - infrastructure
  - self-hosting
  - ai
readingTime: "4 min read"
---

I sometimes catch myself treating my homelab like a tiny datacenter. I start thinking about redundant control planes, elaborate monitoring, and whether every service needs a clean disaster-recovery story.

Then I remember that the rack is in my house, I am the entire operations team, and nobody has an SLA with my photo server.

I still do not build carelessly. I just optimize for something other than uptime.

## Production has a different job

At work, boring infrastructure is usually good infrastructure. Changes need review. Failure domains matter. Recovery procedures should be written down and tested. The person fixing an incident might not be the person who designed the system.

My homelab has a different job. It should teach me things.

Sometimes that means running a service in a container when a plain systemd unit would be easier. Sometimes it means replacing a perfectly functional setup because I want to understand Kubernetes networking. I can make those choices because a failed experiment costs me an evening, not somebody else's business.

The useful distinction is between deliberate experimentation and accidental chaos. I still want to know why something broke. I just do not need to prevent every possible breakage before it happens.

## The parts I still take seriously

There are a few production habits I refuse to leave at the office:

- Configuration lives in Git whenever practical.
- Important data has a backup outside the machine that stores it.
- Secrets do not belong in repositories or container images.
- Updates are small enough that I can understand what changed.
- Recovery starts with notes, not with trying to remember what I did six months ago.

These habits make experiments cheaper. If I can rebuild a node from configuration, I am more willing to break it. If the data is safe, reinstalling an operating system is annoying rather than frightening.

I do not back up everything. Container images can be pulled again. Cached media metadata can be regenerated. The Git repository is already elsewhere. I focus on the state that cannot be recreated: personal files, application databases, and the handful of configuration values that are intentionally kept outside Git.

## Failure is part of the lab

The lab has taught me more through failure than through clean installs. A DNS change once looked like an application problem. A nearly full disk made unrelated containers behave strangely. A certificate issue sent me into the wrong logs for longer than I care to admit.

Those incidents were useful because I could slow down. I could inspect the network path, read the events, and form a theory before touching anything. There was no pressure to apply the first plausible fix.

That is also where AI tools fit. I use them to help read unfamiliar logs, draft a diagnostic command, or explain a controller I have not worked with before. They are useful for exploration. They do not get unsupervised access to the cluster. A confident suggestion that changes firewall rules is still a suggestion. I want the command, the reason, and the rollback path before I run it.

## A lab should stay inviting

Downtime is not the biggest risk. The bigger one is building something so elaborate that I stop wanting to maintain it.

I have removed tools that were interesting but added more operational weight than insight. I have consolidated services, accepted single points of failure, and left some tasks manual because automating them would take longer than doing them occasionally.

My current rule is simple. If I cannot say what a layer teaches me or which chore it removes, it goes. "This is how a real platform team might do it" is not enough by itself.

The homelab can be unfinished. It can go down during an upgrade. It can contain a temporary workaround with a note beside it. That freedom is why it stays useful.

At work I apply what I already know. At home I find out the gaps.
