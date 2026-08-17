export type StatusTone = "accent" | "muted" | "faint";

export type StatusLine = { text: string; tone: StatusTone };

export type DialogContent = {
  title: string;
  lines: string[];
  link?: { href: string; label: string };
};

export type Hud = {
  showPrompt(text: string): void;
  hidePrompt(): void;
  showDialog(content: DialogContent): void;
  showDialogStatus(lines: StatusLine[], note: string): void;
  hideDialog(): void;
  isDialogOpen(): boolean;
};

function requireChild<T extends Element>(root: HTMLElement, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`room hud element missing: ${selector}`);
  }
  return element;
}

export function createHud(stage: HTMLElement): Hud {
  const prompt = requireChild<HTMLElement>(stage, ".room-prompt");
  const dialog = requireChild<HTMLElement>(stage, ".room-dialog");
  const title = requireChild<HTMLElement>(stage, ".room-dialog-title");
  const lines = requireChild<HTMLElement>(stage, ".room-dialog-lines");
  const status = requireChild<HTMLElement>(stage, ".room-dialog-status");
  const linkRow = requireChild<HTMLElement>(stage, ".room-dialog-linkrow");
  const link = requireChild<HTMLAnchorElement>(stage, ".room-dialog-link");

  let open = false;

  return {
    showPrompt(text: string): void {
      prompt.textContent = "";
      const key = document.createElement("span");
      key.className = "room-prompt-key";
      key.textContent = "e";
      prompt.append(key, ` — ${text}`);
      prompt.hidden = false;
    },
    hidePrompt(): void {
      prompt.hidden = true;
    },
    showDialog(content: DialogContent): void {
      title.textContent = content.title;
      lines.textContent = "";
      for (const text of content.lines) {
        const p = document.createElement("p");
        p.textContent = text;
        lines.append(p);
      }
      status.hidden = true;
      status.textContent = "";
      if (content.link) {
        link.href = content.link.href;
        link.textContent = content.link.label;
        linkRow.hidden = false;
      } else {
        linkRow.hidden = true;
      }
      dialog.hidden = false;
      open = true;
      if (content.link) {
        link.focus({ preventScroll: true });
      }
    },
    showDialogStatus(statusLines: StatusLine[], note: string): void {
      if (!open) {
        return;
      }
      status.textContent = "";
      for (const line of statusLines) {
        const p = document.createElement("p");
        p.className = `room-status-${line.tone}`;
        p.textContent = line.text;
        status.append(p);
      }
      const noteEl = document.createElement("p");
      noteEl.className = "room-status-note";
      noteEl.textContent = note;
      status.append(noteEl);
      status.hidden = false;
    },
    hideDialog(): void {
      dialog.hidden = true;
      open = false;
    },
    isDialogOpen(): boolean {
      return open;
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
    const limit = 44;
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
