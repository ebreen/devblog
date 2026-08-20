---
title: "My monitoring stack got smaller and better"
date: "2026-05-24"
tags:
  - monitoring
  - homelab
  - observability
  - operations
readingTime: "4 min read"
---

My homelab monitoring used to grow every time I learned about a new failure mode. Another exporter, another dashboard, another notification, usually another container.

It looked serious. It was also turning into a small production system, except nobody was on call except me, and most of the alerts arrived while I was doing something else.

The stack got better when I stopped asking what else I could collect, and started asking which decision a signal would change.

## Monitoring-shaped clutter

The problem was not any single tool. Prometheus-style metrics, logs, dashboards, and external availability checks all solve real problems. I had turned pieces on because they were there, then kept them without deciding what they were for.

That showed up as:

- Dashboards I opened only when rearranging dashboards.
- Alerts for conditions that recovered without me.
- Host metrics with no threshold tied to an action.
- Logs retained because disk was cheap, not because I read them.
- Several views answering slightly different versions of "is it up?"

I could explain how the system worked. I could not always say why each part existed. For a lab I run alone, that is the warning. Monitoring should cut uncertainty. Mine was adding chores and noise.

## Start from the questions

I wrote down the questions I actually ask when something feels wrong:

1. Can I reach the service from outside the machine running it?
2. Is the host healthy enough to keep running it?
3. Did the application report a useful error?
4. Did a scheduled job, especially a backup, complete?

Everything in the new setup has to answer one of those. Availability checks cover the user-visible edge. A small set of host and service metrics shows resource pressure and restarts. Centralized logs exist for the apps where local container output is not enough. Scheduled jobs report their own success or failure.

That is less complete than collecting everything. It is much closer to how I troubleshoot.

## Alerts need an owner and a next step

I removed alerts that were merely interesting. A brief CPU spike is interesting. A filesystem approaching the point where writes fail is a job. One asks me to watch the machine being busy. The other asks me to delete things or add disk.

If an alert interrupts my day, I should already know the next action. If I cannot write that action next to the alert, it belongs on a dashboard or nowhere.

I also page at service boundaries. "The application cannot complete its health check" tells me more than a generic process count. Internal metrics still help during diagnosis. They are not all paging conditions.

## One overview, the rest on demand

I kept a boring overview: reachability, recent failures, host pressure, storage, certificate state, backup status. It is a page, not a wall of graphs. I can open it and tell whether the problem is broad, isolated, or already understood.

Deeper views still exist where the service justifies them. They are diagnostic tools, not decoration. I would rather follow a link from an alert to a focused view than scroll a universal dashboard of unrelated panels.

This also made the config easier to keep in Git. The useful checks, alert rules, and dashboards are small enough to review. Changes are deliberate. I am no longer afraid to delete last month's experiment.

## The test is a failure, not a green dashboard

A dashboard full of green proves the monitoring stack is up. It does not prove the stack will notice a real failure.

So I test the paths I care about. I stop a non-critical service and confirm the external check changes state. I fail a scheduled job and check that a notification fires, and that it points at the right host or log view. Then I restore the service and make sure recovery is visible without another round of noise.

I have fewer graphs. I trust the remaining ones more. The homelab does not need maximum observability. It needs enough evidence to say what broke, where to look, and whether I have to act before I finish what I was doing.
