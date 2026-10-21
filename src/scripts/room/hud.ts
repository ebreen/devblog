import type { Hotspot, HotspotLink } from "./hotspots";
import { planLeft, planTop, stationKey } from "./hotspots";

export type StatusTone = "up" | "degraded" | "down" | "note";
export type StatusLine = { text: string; tone: StatusTone };

export type PlacardContent = {
  hotspot: Hotspot;
  links: HotspotLink[];
};

export type HudCallbacks = {
  onStart(): void;
  onTravel(station: number): void;
  onSound(): void;
  onClose(): void;
};

export type TagProjection = {
  id: Hotspot["id"];
  x: number;
  y: number;
  distance: number;
  visible: boolean;
};

export type Hud = {
  setMode(mode: "intro" | "walk"): void;
  setLooking(looking: boolean): void;
  setSound(on: boolean): void;
  showPrompt(text: string): void;
  hidePrompt(): void;
  openPlacard(content: PlacardContent): void;
  showStatus(lines: StatusLine[], note: string): void;
  closePlacard(): void;
  isPlacardOpen(): boolean;
  placardId(): Hotspot["id"] | null;
  updateTags(tags: TagProjection[], target: Hotspot["id"] | null, show: boolean): void;
  updatePlan(x: number, z: number, yaw: number, roombaX: number, roombaZ: number): void;
  setActiveStation(station: number | null): void;
  setTime(text: string): void;
  showFallback(): void;
  markLoaded(): void;
  flash(text: string): void;
};

function requireChild<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`room hud element missing: ${selector}`);
  }
  return element;
}

function keycap(text: string): HTMLElement {
  const kbd = document.createElement("kbd");
  kbd.textContent = text;
  return kbd;
}

export function createHud(stage: HTMLElement, hotspots: Hotspot[], callbacks: HudCallbacks): Hud {
  const page = stage.closest<HTMLElement>(".room-page") ?? stage;
  const intro = requireChild<HTMLElement>(stage, "[data-visning]");
  const startButton = requireChild<HTMLButtonElement>(stage, "[data-visning-start]");
  const prompt = requireChild<HTMLElement>(stage, ".room-prompt");
  const placard = requireChild<HTMLElement>(stage, ".placard");
  const placardTitle = requireChild<HTMLElement>(placard, ".placard-title");
  const placardKey = requireChild<HTMLElement>(placard, ".placard-key");
  const placardLines = requireChild<HTMLElement>(placard, ".placard-lines");
  const placardStatus = requireChild<HTMLElement>(placard, ".placard-status");
  const placardFeed = requireChild<HTMLElement>(placard, ".placard-feed");
  const placardFeedHeading = requireChild<HTMLElement>(placard, ".placard-feed-heading");
  const placardFeedList = requireChild<HTMLElement>(placard, ".placard-feed ul");
  const placardCta = requireChild<HTMLAnchorElement>(placard, ".placard-cta");
  const placardClose = requireChild<HTMLButtonElement>(placard, ".placard-close");
  const tagLayer = requireChild<HTMLElement>(stage, ".room-tags");
  const plan = requireChild<HTMLElement>(stage, ".room-plan");
  const you = requireChild<HTMLElement>(plan, ".plan-you");
  const roombaDot = requireChild<HTMLElement>(plan, ".plan-roomba");
  const soundButtons = Array.from(page.querySelectorAll<HTMLButtonElement>("[data-room-sound]"));
  const lookHint = requireChild<HTMLElement>(stage, ".room-look-hint");
  const loading = requireChild<HTMLElement>(stage, ".room-loading");
  const fallback = requireChild<HTMLElement>(stage, ".room-fallback");
  const flashEl = requireChild<HTMLElement>(stage, ".room-flash");
  const timeEls = Array.from(page.querySelectorAll<HTMLElement>("[data-oslo-time]"));
  const stationButtons = Array.from(plan.querySelectorAll<HTMLButtonElement>("[data-station]"));

  let open: Hotspot["id"] | null = null;
  let flashTimer: number | null = null;

  // Floating tags: one per hotspot, positioned every frame.
  const tags = new Map<Hotspot["id"], HTMLElement>();
  for (const hotspot of hotspots) {
    const tag = document.createElement("span");
    tag.className = "room-tag";
    tag.dataset.id = hotspot.id;
    if (hotspot.station) {
      tag.append(keycap(stationKey(hotspot.station)));
    }
    const name = document.createElement("span");
    name.textContent = hotspot.name;
    tag.append(name);
    tag.hidden = true;
    tagLayer.append(tag);
    tags.set(hotspot.id, tag);
  }

  startButton.addEventListener("click", () => callbacks.onStart());
  placardClose.addEventListener("click", () => callbacks.onClose());
  for (const button of soundButtons) {
    button.addEventListener("click", () => callbacks.onSound());
  }
  for (const button of stationButtons) {
    button.addEventListener("click", () => {
      const station = Number(button.dataset.station);
      if (Number.isFinite(station)) {
        callbacks.onTravel(station);
      }
    });
  }

  return {
    setMode(mode): void {
      stage.dataset.mode = mode;
      intro.hidden = mode !== "intro";
      intro.setAttribute("aria-hidden", mode === "intro" ? "false" : "true");
    },
    setLooking(looking: boolean): void {
      stage.classList.toggle("is-looking", looking);
      lookHint.hidden = looking || open !== null || stage.dataset.mode !== "walk";
    },
    setSound(on: boolean): void {
      for (const button of soundButtons) {
        button.setAttribute("aria-pressed", on ? "true" : "false");
        const label = button.querySelector<HTMLElement>("[data-sound-label]");
        if (label) {
          label.textContent = on ? "sound on" : "sound off";
        }
      }
    },
    showPrompt(text: string): void {
      if (prompt.dataset.text === text && !prompt.hidden) {
        return;
      }
      prompt.dataset.text = text;
      prompt.textContent = "";
      prompt.append(keycap("e"), document.createTextNode(text));
      prompt.hidden = false;
    },
    hidePrompt(): void {
      prompt.hidden = true;
    },
    openPlacard({ hotspot, links }): void {
      open = hotspot.id;
      placardTitle.textContent = hotspot.title;
      placardKey.textContent = "";
      placardKey.hidden = !hotspot.station;
      if (hotspot.station) {
        placardKey.append(keycap(stationKey(hotspot.station)));
      }
      placardLines.textContent = "";
      for (const text of hotspot.lines) {
        const p = document.createElement("p");
        p.textContent = text;
        placardLines.append(p);
      }
      placardStatus.hidden = true;
      placardStatus.textContent = "";

      placardFeedList.textContent = "";
      if (links.length > 0) {
        placardFeedHeading.textContent = hotspot.feedHeading ?? "also through here";
        for (const link of links) {
          const li = document.createElement("li");
          const a = document.createElement("a");
          a.href = link.href;
          a.textContent = link.label;
          if (/^https?:/.test(link.href)) {
            a.target = "_blank";
            a.rel = "noreferrer";
          }
          li.append(a);
          if (link.meta) {
            const meta = document.createElement("span");
            meta.textContent = link.meta;
            li.append(meta);
          }
          placardFeedList.append(li);
        }
        placardFeed.hidden = false;
      } else {
        placardFeed.hidden = true;
      }

      if (hotspot.link) {
        placardCta.href = hotspot.link.href;
        placardCta.querySelector<HTMLElement>("[data-cta-label]")!.textContent = hotspot.link.label;
        placardCta.hidden = false;
      } else {
        placardCta.hidden = true;
      }

      placard.hidden = false;
      placard.dataset.id = hotspot.id;
      stage.classList.add("has-placard");
      lookHint.hidden = true;
      prompt.hidden = true;
      const focusTarget = hotspot.link ? placardCta : placardClose;
      focusTarget.focus({ preventScroll: true });
    },
    showStatus(lines: StatusLine[], note: string): void {
      if (!open) {
        return;
      }
      placardStatus.textContent = "";
      const list = document.createElement("ul");
      for (const line of lines) {
        const li = document.createElement("li");
        li.className = `status-${line.tone}`;
        const dot = document.createElement("span");
        dot.className = "status-dot";
        dot.setAttribute("aria-hidden", "true");
        li.append(dot, document.createTextNode(line.text));
        list.append(li);
      }
      const noteEl = document.createElement("p");
      noteEl.className = "status-note";
      noteEl.textContent = note;
      placardStatus.append(list, noteEl);
      placardStatus.hidden = false;
    },
    closePlacard(): void {
      placard.hidden = true;
      open = null;
      stage.classList.remove("has-placard");
    },
    isPlacardOpen(): boolean {
      return open !== null;
    },
    placardId(): Hotspot["id"] | null {
      return open;
    },
    updateTags(projections, target, show): void {
      for (const projection of projections) {
        const tag = tags.get(projection.id);
        if (!tag) {
          continue;
        }
        if (!show || !projection.visible) {
          if (!tag.hidden) {
            tag.hidden = true;
          }
          continue;
        }
        tag.hidden = false;
        tag.style.transform = `translate(${projection.x.toFixed(1)}px, ${projection.y.toFixed(1)}px) translate(-50%, -100%)`;
        const fade = Math.max(0, Math.min(1, (4.4 - projection.distance) / 1.6));
        tag.style.opacity = (projection.id === target ? 1 : fade * 0.82).toFixed(2);
        tag.classList.toggle("is-target", projection.id === target);
      }
    },
    updatePlan(x, z, yaw, roombaX, roombaZ): void {
      you.style.left = planLeft(x);
      you.style.top = planTop(z);
      you.style.transform = `translate(-50%, -50%) rotate(${(-yaw).toFixed(3)}rad)`;
      roombaDot.style.left = planLeft(roombaX);
      roombaDot.style.top = planTop(roombaZ);
    },
    setActiveStation(station: number | null): void {
      for (const button of stationButtons) {
        const active = station !== null && Number(button.dataset.station) === station;
        button.classList.toggle("is-active", active);
        if (active) {
          button.setAttribute("aria-current", "location");
        } else {
          button.removeAttribute("aria-current");
        }
      }
    },
    setTime(text: string): void {
      for (const el of timeEls) {
        el.textContent = text;
      }
    },
    showFallback(): void {
      loading.hidden = true;
      fallback.hidden = false;
      intro.hidden = true;
      plan.hidden = true;
      stage.dataset.mode = "fallback";
    },
    markLoaded(): void {
      loading.classList.add("is-done");
      stage.classList.add("is-ready");
    },
    flash(text: string): void {
      flashEl.textContent = text;
      flashEl.hidden = false;
      flashEl.classList.remove("is-out");
      if (flashTimer !== null) {
        window.clearTimeout(flashTimer);
      }
      flashTimer = window.setTimeout(() => {
        flashEl.classList.add("is-out");
      }, 1800);
    }
  };
}

export type TouchControls = {
  readMove(): { x: number; z: number };
  consumeInteract(): boolean;
};

export function createTouchControls(stage: HTMLElement): TouchControls {
  const zone = requireChild<HTMLElement>(stage, ".room-joystick");
  const nub = requireChild<HTMLElement>(stage, ".room-joystick-nub");
  const button = requireChild<HTMLElement>(stage, ".room-interact-button");

  const move = { x: 0, z: 0 };
  let interactQueued = false;
  let activePointer: number | null = null;
  let originX = 0;
  let originY = 0;

  const reset = (): void => {
    activePointer = null;
    move.x = 0;
    move.z = 0;
    nub.style.transform = "translate(-50%, -50%)";
  };

  zone.addEventListener("pointerdown", (event) => {
    activePointer = event.pointerId;
    const rect = zone.getBoundingClientRect();
    originX = rect.left + rect.width / 2;
    originY = rect.top + rect.height / 2;
    zone.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  zone.addEventListener("pointermove", (event) => {
    if (event.pointerId !== activePointer) {
      return;
    }
    const limit = 40;
    let dx = event.clientX - originX;
    let dy = event.clientY - originY;
    const length = Math.hypot(dx, dy);
    if (length > limit) {
      dx = (dx / length) * limit;
      dy = (dy / length) * limit;
    }
    move.x = dx / limit;
    move.z = dy / limit;
    nub.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  });

  zone.addEventListener("pointerup", reset);
  zone.addEventListener("pointercancel", reset);

  button.addEventListener("click", () => {
    interactQueued = true;
  });

  return {
    readMove(): { x: number; z: number } {
      return move;
    },
    consumeInteract(): boolean {
      const queued = interactQueued;
      interactQueued = false;
      return queued;
    }
  };
}
