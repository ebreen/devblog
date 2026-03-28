---
title: "Three Months of AI That Changed How I Think About Software"
date: "2026-02-27"
tags:
  - ai
  - agents
  - engineering
  - open-source
readingTime: "12 min read"
---

I've been meaning to write this for a while now. The last three months have been the most disorienting, exciting, and productive stretch of my career as a systems engineer — and almost none of it has been because of the systems I manage at work. It's been AI. Specifically, the absolute avalanche of model releases and tooling that's dropped since November 2025.

I need to get these thoughts down before the next wave hits and I forget what it felt like when things started clicking.

## The Moment It Changed: Claude Opus 4.5

I'd been poking at AI coding tools on and off for most of 2025. They were cool, sometimes useful, often frustrating. The models could write code, sure, but getting them to actually *do work* — as in, plan a multi-step task, call the right tools, and not lose the plot halfway through — was painful. Agentic AI, as people were calling it, sounded great in theory. In practice? Not really usable. Not for me, anyway.

Then on November 24, 2025, Anthropic dropped Claude Opus 4.5, and something genuinely shifted.

It wasn't just that it was smarter. It was that, for the first time, a model could handle long-horizon planning, sustained tool use, and agentic tasks without falling apart. Anthropic themselves pitched it as the best model in the world for coding, agents, and computer use — and honestly, it lived up to that. The thing just *got it*. You could point it at a complex, multi-system problem, and it would figure out the fix, build a plan, and execute. I'd tried this kind of workflow a dozen times before with earlier models and it always devolved into babysitting. Opus 4.5 was the first time I could kick off a task, step away, and come back to something actually usable.

That was the unlock. That was the moment I went from "AI is a neat toy" to "okay, I need to restructure how I work."

## Agent Harnesses: Where the Real Magic Happens

Claude Code was my first real agent harness. Terminal-based, tightly integrated with Anthropic's models, and genuinely good at sustained coding sessions. If you're on an Anthropic subscription and you haven't tried it, you're sleeping on it.

But here's the thing — I'm a tinkerer. I wanted to try other models. The open-source space was exploding with capable models, and I wanted to run them through the same kind of agentic workflows. So I started exploring alternatives.

**OpenCode** became my go-to for model flexibility. It's an open-source agent that supports 75+ models from every major provider. I could swap between Claude, Kimi K2 Thinking, MiniMax M2.5, GLM models — whatever I wanted to throw at a problem. The freedom to BYOK (bring your own key) without switching tools entirely was a game-changer.

**Factory Droid** impressed me with its enterprise-grade approach, and honestly, I've been finding myself using it more and more. It runs in your terminal like Claude Code, but supports both Anthropic and OpenAI models in one place. The subscription is genuinely generous with the amount of tokens you get, and they have this "multiplier" system where different models cost different amounts from your token pool — some cheaper, some more expensive — so you can easily switch between a heavy-hitter like Opus for planning and a faster model for execution without doing mental math on API bills. Not being locked to a single company's models is a huge deal. Their approach to specialized "Droids" for different tasks (coding, debugging, reviewing) maps well to how I think about breaking down work.

## Open-Source Models Caught Up (Kind of)

Here's where it gets really interesting. Starting in November, the open-source model releases came fast and furious, and the quality jump was dramatic.

**Kimi K2 Thinking** (November 6, 2025) from Moonshot AI was early in this wave. A trillion-parameter MoE model with solid reasoning capabilities — it was one of the first open-weight models that felt genuinely competitive on coding tasks. Then on January 27 they followed up with **Kimi K2.5**, which added native multimodal capabilities and an "Agent Swarm" feature that could coordinate up to 100 sub-agents in parallel. Wild stuff.

**Z.ai** (formerly Zhipu AI) had an incredible run. It started back in July 2025 with **GLM-4.5**, their native agentic LLM that offered one-click compatibility with the Claude Code framework — that was an early signal that open-source models were taking agentic workflows seriously. Then they dropped **GLM-4.7** on December 22, which was the first open-source model I used that could reliably do "think-then-act" execution in agent frameworks like Claude Code and OpenCode. It ranked #1 among open-source models on agentic coding benchmarks at the time. Then, just two weeks ago on February 11, they released **GLM-5** — a 744B parameter beast that topped open-source leaderboards across reasoning, coding, and agentic tasks. Their paper was literally titled "From Vibe Coding to Agentic Engineering," which captures the shift perfectly.

**MiniMax M2.5** dropped February 12, scoring 80.2% on SWE-bench Verified — within striking distance of Opus 4.5's 80.9% — while costing roughly a tenth to a twentieth of the price. The efficiency is absurd.

Now, here's the honest take: these open-source models are *incredible* at raw coding. On benchmarks, they're neck and neck with the closed models from Anthropic and OpenAI. But where they still struggled — and this is the key insight that drove most of my tooling choices — was in **following tool calls and instructions reliably**. They could write the code, but they'd stumble when asked to use tools in sequence, maintain context across long agent sessions, or follow complex multi-step plans without going off the rails.

This is exactly the gap that frameworks like GSD and Superpowers exist to fill.

## Frameworks That Make Open-Source Models Actually Work

**GSD (Get Shit Done)** is a meta-prompting and spec-driven development system that sits on top of your agent harness. The core idea is brilliantly simple: instead of letting the model manage its own context (which leads to what people call "context rot" — quality degradation as the session gets longer), GSD orchestrates the work by spawning fresh sub-agents for each task, each with a clean 200K token context window.

For open-source models that are great at coding but shaky at long-horizon planning? GSD compensates for exactly that weakness. You use a strong model for planning (where decisions matter), and can route execution to a cheaper, faster model that just needs to follow instructions. The framework supports Claude Code, OpenCode, Gemini CLI, Codex, and more. It's open-source, MIT-licensed, and evolving fast.

**Superpowers**, by Jesse Vincent, takes a different but complementary approach. It's an agentic skills framework — a library of composable skills that teach your agent engineering best practices: TDD, subagent-driven development, structured brainstorming, git worktree workflows. Where GSD solves the context management problem, Superpowers solves the "the model technically *can* do this, but it doesn't know *how* I want it done" problem. It injects methodology. And it works across Claude Code, Codex, and OpenCode.

Together, these frameworks let me take a model like Kimi K2.5 or GLM-5 — which has the raw coding chops but lacks the structured planning discipline of Opus — and get genuinely production-quality work out of it. That's the real unlock of the last few months: **it's not just about the models anymore, it's about the harness and framework layer.**

## MCP Servers: Extending the Agent's Reach

The other piece of the puzzle is MCP (Model Context Protocol) servers. These are standardized interfaces that let your AI agent interact with external tools and services. And they've gotten *really* good.

Here's a screenshot from my personal setup while I was experimenting with iOS development:

![MCP Servers Connected](/images/mcp-servers.png)

That's seven MCP servers connected to my agent: app-insight-mcp, apple-docs, claude-teams, context7, figma, supabase, and **xcodebuildmcp**. That last one deserves special mention.

**XcodeBuildMCP** is, frankly, one of the most impressive things I've seen in this space. It's an MCP server (built by Cameron Cooke, now maintained under Sentry's GitHub org) that gives your AI agent full control over Xcode. Building, testing, running on simulators, debugging with LLDB, UI automation — the whole deal. I watched my agent write Swift code, build the project, read the compiler errors, fix them, rebuild, and iterate until the tests passed. All autonomously. No Xcode window needed.

The combination of a capable model + a good agent harness + domain-specific MCP servers is something that wasn't really possible three months ago. Now it's table stakes for anyone doing serious agentic work. Skills and MCP servers together have significantly increased my productivity and fundamentally changed my workflow.

## The Pace Is Honestly Overwhelming

Let me put the timeline in perspective. In roughly 90 days:

- **Jul 2025**: GLM-4.5 — Z.ai's first native agentic model with Claude Code compatibility
- **Nov 6**: Kimi K2 Thinking drops
- **Nov 24**: Claude Opus 4.5 launches — the agentic AI wake-up call
- **Dec 22**: GLM-4.7 — first open-source model with reliable think-then-act in agent frameworks
- **Jan 27**: Kimi K2.5 with Agent Swarm
- **Feb 5**: Anthropic ships Claude Opus 4.6
- **Feb 11**: GLM-5 launches — new #1 open-source model
- **Feb 12**: MiniMax M2.5 — Opus-tier coding at a fraction of the cost

And that's just the models. The harnesses, frameworks, MCP servers, skills — all of it is moving at the same pace. New tools are dropping weekly. Existing tools are getting major updates every few days. The GSD repo alone has had dozens of releases since it gained traction.

## How I'm Keeping Up (Barely)

It's getting increasingly hard to keep up with the latest news and drops. But I've found two sources that have been invaluable:

**Reddit's r/LocalLLaMA** subreddit is, hands down, the best single source for staying on top of open-source model releases, quantization experiments, deployment guides, and community benchmarks. The discussion quality is high and the community is incredibly fast at evaluating new drops.

**X.com** (and yes, I despise Twitter — but it is what it is) has been the other essential source. The AI engineering community on X is where news breaks first. Model announcements, framework launches, benchmark results, hot takes — it's all there in real-time, often hours or days before it hits blogs or YouTube.

I genuinely would not have started learning about all of this since December 2025 were it not for these sources. They've been the difference between being caught off guard by these changes and being able to ride the wave.

---

We're living through something weird. The gap between "AI can technically do this" and "AI can reliably do this in production" is closing faster than anyone expected. Three months ago I was skeptical. Today I'm restructuring my side projects around agentic workflows. I don't know what the next three months will bring, but if it's anything like the last three — I should probably start writing these posts more often.

Next up: the OpenClaw series. It started as Clawdbot, became MoltClaw, and now it's just OpenClaw. The name changes alone are worth a separate post at this point. 

Spoiler: I played around with OpenClaw during January and February, one of my bots entered a SuperTeam Earn Coding Bounty solo — barely any push needed from me. Another bot? Made its only job earn money or die within 30 days. More soon.

*— Eirik*