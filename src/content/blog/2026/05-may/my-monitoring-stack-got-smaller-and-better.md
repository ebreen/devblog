---
title: "My Monitoring Stack Got Smaller and Better"
date: "2026-05-24"
tags:
  - monitoring
  - homelab
  - observability
  - operations
readingTime: "4 min read"
---

My homelab monitoring setup used to grow every time I learned about a new failure mode. I added another exporter, another dashboard, another notification, and usually another container to maintain.

It looked serious. It was also becoming its own small production system, except nobody was on call except me and most of the alerts arrived when I was trying to do something else.

The stack got better when I stopped asking, "What else can I collect?" and started asking, "What decision will this signal help me make?"

## I had monitoring-shaped clutter

The problem was not any single tool. Prometheus-style metrics, logs, dashboards, and external availability checks all solve real problems. The problem was that I had enabled pieces because they were available, then kept them without deciding what they were for.

That produced familiar symptoms:

- Dashboards I opened only when rearranging dashboards.
- Alerts for conditions that recovered without intervention.
- Host metrics with no threshold tied to an action.
- Logs retained because storage was cheap, not because I used them.
- Several views answering slightly different versions of "is it up?"

I could explain how the system worked, but not always why each part existed. For a personal lab, that is a warning sign. Monitoring should reduce uncertainty. Mine was adding maintenance and noise.

## I started from the questions

I wrote down the questions I actually ask when something feels wrong:

1. Can I reach the service from outside the machine running it?
2. Is the host healthy enough to keep running it?
3. Did the application report a useful error?
4. Did a scheduled job, especially a backup, complete?

Everything in the new setup has to answer one of those questions. Availability checks cover the user-visible edge. A small set of host and service metrics shows resource pressure and restarts. Centralized logs exist for the applications where local container output is not enough. Scheduled jobs report their own success or failure.

That is less comprehensive than collecting everything. It is much closer to how I troubleshoot.

## Alerts need an owner and an action

I removed alerts that were merely interesting. A brief CPU spike is interesting. A filesystem approaching a point where writes will fail is actionable. One asks me to observe the machine being busy; the other asks me to clean up storage or expand it.

My rule now is simple: if an alert wakes me up or interrupts my day, I should know what I am expected to do next. If I cannot write that action beside the alert, it belongs on a dashboard or nowhere at all.

I also prefer alerts at service boundaries. "The application cannot complete its health check" tells me more than a generic process count. Internal metrics are still useful during diagnosis, but they are not all paging conditions.

## Fewer dashboards made the remaining ones useful

I kept a boring overview: reachability, recent failures, host pressure, storage, certificate state, and backup status. It is a page, not a wall of graphs. I can open it and quickly decide whether the problem is broad, isolated, or already understood.

Deeper views still exist where the service justifies them. The difference is that they are diagnostic tools, not permanent decoration. I would rather follow a clear link from an alert to a focused view than scroll through a universal dashboard full of unrelated panels.

This also made configuration easier to keep in Git. The useful checks, alert rules, and dashboards are small enough to review. Changes are intentional instead of being a trail of experiments I am afraid to delete.

## The test is failure, not ingestion

A green monitoring stack proves that the monitoring stack is green. It does not prove that it will notice a real problem.

So I test the paths I care about. I stop a non-critical service and confirm the external check changes state. I verify that a failed scheduled job produces a notification. I check that the notification points me toward the right host or log view. Then I restore the service and make sure recovery is visible without creating another round of noise.

The smaller setup gives me fewer things to admire, but more confidence in the things that remain. That is the trade I wanted. My homelab does not need maximum observability. It needs enough evidence to tell me what broke, where to look, and whether I need to act now or can finish my coffee first.
