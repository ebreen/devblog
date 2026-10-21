import * as THREE from "three";

/**
 * Canvas textures for the room. Everything is drawn at 2x so labels and
 * screens stay crisp at full render resolution; the drawing code works in
 * the nominal (1x) coordinate space.
 */

function createCanvas(width: number, height: number, scale = 2): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("2d canvas context unavailable");
  }
  context.scale(scale, scale);
  return [canvas, context];
}

type TextureOptions = { pixel?: boolean; repeat?: [number, number] };

function toTexture(canvas: HTMLCanvasElement, options: TextureOptions = {}): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (options.pixel) {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
  } else {
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = 8;
  }
  if (options.repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(options.repeat[0], options.repeat[1]);
  }
  return texture;
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shade(hex: string, amount: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const clamp = (n: number): number => Math.max(0, Math.min(255, Math.round(n)));
  const r = clamp(((value >> 16) & 255) * (1 + amount));
  const g = clamp(((value >> 8) & 255) * (1 + amount));
  const b = clamp((value & 255) * (1 + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Oiled oak herringbone. Planks are 1 x 4 units; the staircase H_n/V_n is
 * repeated by (4, -4), which tiles the plane with a 8 x 8 unit period, so a
 * 512px canvas with 32px units wraps seamlessly.
 */
export function makeFloorTexture(): THREE.CanvasTexture {
  const size = 512;
  const [canvas, ctx] = createCanvas(size, size, 1);
  const random = createRandom(77);
  const unit = 32;
  const tones = ["#5a4029", "#634630", "#523a25", "#6b4c33", "#5e432c", "#4c3522"];
  ctx.fillStyle = "#2a1d12";
  ctx.fillRect(0, 0, size, size);

  const plank = (x: number, y: number, w: number, h: number, horizontal: boolean): void => {
    const tone = tones[Math.floor(random() * tones.length)];
    const grad = horizontal ? ctx.createLinearGradient(x, y, x + w, y) : ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, shade(tone, -0.06 + random() * 0.04));
    grad.addColorStop(0.5, shade(tone, 0.04 + random() * 0.05));
    grad.addColorStop(1, shade(tone, -0.08 + random() * 0.04));
    ctx.fillStyle = grad;
    ctx.fillRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);
    // Grain: long faint strokes along the plank.
    ctx.strokeStyle = "rgba(30, 18, 8, 0.22)";
    ctx.lineWidth = 0.7;
    const strokes = 5 + Math.floor(random() * 4);
    for (let i = 0; i < strokes; i += 1) {
      ctx.beginPath();
      if (horizontal) {
        const gy = y + 3 + random() * (h - 6);
        ctx.moveTo(x + 2, gy);
        ctx.bezierCurveTo(x + w * 0.3, gy + (random() - 0.5) * 3, x + w * 0.7, gy + (random() - 0.5) * 3, x + w - 2, gy);
      } else {
        const gx = x + 3 + random() * (w - 6);
        ctx.moveTo(gx, y + 2);
        ctx.bezierCurveTo(gx + (random() - 0.5) * 3, y + h * 0.3, gx + (random() - 0.5) * 3, y + h * 0.7, gx, y + h - 2);
      }
      ctx.stroke();
    }
    // Sheen highlight.
    ctx.fillStyle = "rgba(255, 220, 170, 0.035)";
    if (horizontal) {
      ctx.fillRect(x + 1, y + 1, w - 2, 3);
    } else {
      ctx.fillRect(x + 1, y + 1, 3, h - 2);
    }
  };

  for (let k = -6; k <= 6; k += 1) {
    for (let n = -20; n <= 40; n += 1) {
      const ox = (n + k * 4) * unit;
      const oy = (n - k * 4) * unit;
      if (ox > size + unit * 4 || oy > size + unit * 5 || ox < -unit * 5 || oy < -unit * 6) {
        continue;
      }
      plank(ox, oy, unit * 4, unit, true);
      plank(ox, oy + unit, unit, unit * 4, false);
    }
  }

  return toTexture(canvas, { repeat: [5.6, 5] });
}

/** Soft limewash plaster: very low-contrast mottling and fine grain. */
export function makePlasterTexture(): THREE.CanvasTexture {
  const size = 256;
  const [canvas, ctx] = createCanvas(size, size, 1);
  const random = createRandom(11);
  ctx.fillStyle = "#e6e2da";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 700; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const r = 3 + random() * 12;
    const light = random() > 0.5;
    ctx.fillStyle = light ? `rgba(255, 255, 255, ${0.01 + random() * 0.02})` : `rgba(120, 110, 96, ${0.008 + random() * 0.016})`;
    for (const [dx, dy] of [
      [0, 0],
      [size, 0],
      [-size, 0],
      [0, size],
      [0, -size]
    ]) {
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (let i = 0; i < 6000; i += 1) {
    ctx.fillStyle = random() > 0.5 ? "rgba(255,255,255,0.025)" : "rgba(80,70,60,0.025)";
    ctx.fillRect(random() * size, random() * size, 1, 1);
  }
  return toTexture(canvas, { repeat: [4, 2] });
}

/** Deep ultramarine wool rug with tonal bands, tufting noise, and a cream border. */
export function makeRugTexture(): THREE.CanvasTexture {
  const width = 512;
  const height = 364;
  const [canvas, ctx] = createCanvas(width, height, 1);
  const random = createRandom(5);
  ctx.fillStyle = "#13246e";
  ctx.fillRect(0, 0, width, height);

  const bands = ["#14287a", "#1a3190", "#102062", "#1e3aa2", "#142a80", "#22409f", "#112366"];
  const bandHeight = (height - 40) / bands.length;
  for (let i = 0; i < bands.length; i += 1) {
    ctx.fillStyle = bands[i];
    for (let x = 20; x < width - 20; x += 2) {
      const wobble = Math.sin(x * 0.03 + i * 1.7) * 4 + Math.sin(x * 0.11 + i) * 1.2;
      ctx.fillRect(x, 20 + i * bandHeight + wobble, 2, bandHeight + 6);
    }
  }
  for (let i = 0; i < 9000; i += 1) {
    const x = random() * width;
    const y = random() * height;
    ctx.fillStyle = random() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,20,0.12)";
    ctx.fillRect(x, y, 1.2, 1.2);
  }
  ctx.strokeStyle = "#d9d0bb";
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, width - 24, height - 24);
  ctx.strokeStyle = "rgba(217, 208, 187, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(24, 24, width - 48, height - 48);
  return toTexture(canvas);
}

/** Terminal: warm mono text on near-black, prompt lines in paper white, block cursor. */
export function makeMonitorTexture(lines: string[], title = "zsh — ~/projects"): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256, 160);
  ctx.fillStyle = "#0b0b0c";
  ctx.fillRect(0, 0, 256, 160);
  ctx.fillStyle = "#18181a";
  ctx.fillRect(0, 0, 256, 14);
  for (const [i, color] of ["#d6503c", "#d6b45f", "#5c9a5a"].entries()) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(9 + i * 9, 7, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#7d7971";
  ctx.font = "7px monospace";
  ctx.textAlign = "center";
  ctx.fillText(title, 128, 10);
  ctx.textAlign = "left";

  ctx.font = "11px monospace";
  const lineHeight = 15;
  let y = 32;
  for (const line of lines) {
    if (line.startsWith("$")) {
      ctx.fillStyle = "#d6b45f";
      ctx.fillText("$", 12, y);
      ctx.fillStyle = "#efece3";
      ctx.fillText(line.slice(1), 19, y);
    } else {
      ctx.fillStyle = line.endsWith("*") ? "#d6b45f" : "#a9a398";
      ctx.fillText(line.replace(/\*$/, ""), 12, y);
    }
    y += lineHeight;
  }
  ctx.fillStyle = "#d6b45f";
  ctx.fillRect(19, y - 10, 6, 12);
  return toTexture(canvas);
}

/**
 * The printed CV: name, contact, profile, experience with dated entries,
 * education. Body copy is grey bars; the headers stay readable.
 */
export function makeResumeTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256, 360);
  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(0, 0, 256, 360);

  ctx.fillStyle = "#17150f";
  ctx.font = "24px Georgia, serif";
  ctx.fillText("Eirik Breen", 20, 38);
  ctx.fillStyle = "#3a362f";
  ctx.font = "9px Georgia, serif";
  ctx.fillText("Senior Systems Consultant · Oslo", 20, 53);
  ctx.fillStyle = "#6f6a64";
  ctx.font = "7px monospace";
  ctx.fillText("me@eirikbreen.com · eirikbreen.com", 20, 65);

  ctx.fillStyle = "#17150f";
  ctx.fillRect(20, 73, 216, 1.5);

  const bar = (x: number, y: number, w: number): void => {
    ctx.fillRect(x, y, w, 2.2);
  };
  const heading = (text: string, y: number): void => {
    ctx.fillStyle = "#2d2a24";
    ctx.font = "7px monospace";
    ctx.fillText(text.toUpperCase().split("").join(" "), 20, y);
    ctx.fillStyle = "#b9b3a6";
    ctx.fillRect(20, y + 3, 216, 0.6);
  };

  heading("profile", 90);
  ctx.fillStyle = "#b3ad9f";
  for (const [y, w] of [
    [101, 216],
    [107, 212],
    [113, 204],
    [119, 160]
  ]) {
    bar(20, y, w);
  }

  heading("experience", 138);
  const role = (title: string, dates: string, y: number, bars: Array<[number, number]>): void => {
    ctx.fillStyle = "#17150f";
    ctx.font = "9px Georgia, serif";
    ctx.fillText(title, 20, y);
    ctx.fillStyle = "#8f897c";
    ctx.font = "7px monospace";
    ctx.textAlign = "right";
    ctx.fillText(dates, 236, y);
    ctx.textAlign = "left";
    ctx.fillStyle = "#b3ad9f";
    for (const [by, bw] of bars) {
      bar(26, by, bw);
    }
  };
  role("Senior Systems Consultant", "2023 –", 152, [
    [158, 202],
    [164, 210],
    [170, 184],
    [176, 198],
    [182, 146]
  ]);
  ctx.fillStyle = "#d6b45f";
  ctx.fillRect(20, 145, 2, 8);
  role("Senior Operations Technician", "2021 – 23", 200, [
    [206, 200],
    [212, 182],
    [218, 150]
  ]);
  role("ICT Operations Engineer, HDO", "2018 – 21", 236, [
    [242, 190],
    [248, 166]
  ]);

  heading("education", 274);
  ctx.fillStyle = "#17150f";
  ctx.font = "9px Georgia, serif";
  ctx.fillText("Trade certificate, ICT", 20, 288);
  ctx.fillStyle = "#b3ad9f";
  bar(26, 294, 172);
  bar(26, 300, 136);

  ctx.fillStyle = "#8f897c";
  ctx.font = "6px monospace";
  ctx.textAlign = "center";
  ctx.fillText("eirikbreen.com", 128, 346);
  ctx.textAlign = "left";

  return toTexture(canvas);
}

/** Paused TV frame: a fjord documentary, progress bar, timestamp. */
export function makeTvTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256, 144);
  const sky = ctx.createLinearGradient(0, 0, 0, 88);
  sky.addColorStop(0, "#16203a");
  sky.addColorStop(1, "#2a3a58");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 256, 88);

  ctx.fillStyle = "#d8dce4";
  ctx.beginPath();
  ctx.arc(198, 26, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#0c1220";
  ctx.beginPath();
  ctx.moveTo(0, 88);
  ctx.lineTo(0, 52);
  ctx.lineTo(52, 70);
  ctx.lineTo(96, 40);
  ctx.lineTo(150, 74);
  ctx.lineTo(200, 56);
  ctx.lineTo(256, 78);
  ctx.lineTo(256, 88);
  ctx.closePath();
  ctx.fill();

  const water = ctx.createLinearGradient(0, 88, 0, 144);
  water.addColorStop(0, "#1c2c44");
  water.addColorStop(1, "#101a2c");
  ctx.fillStyle = water;
  ctx.fillRect(0, 88, 256, 56);
  ctx.fillStyle = "rgba(216, 220, 228, 0.5)";
  ctx.fillRect(190, 92, 16, 2);
  ctx.fillRect(186, 100, 24, 2);
  ctx.fillRect(180, 112, 34, 2);
  ctx.fillStyle = "rgba(214, 180, 95, 0.8)";
  ctx.fillRect(38, 96, 3, 3);

  ctx.fillStyle = "rgba(238, 236, 227, 0.85)";
  ctx.fillRect(116, 56, 7, 24);
  ctx.fillRect(131, 56, 7, 24);

  ctx.fillStyle = "rgba(152, 147, 138, 0.5)";
  ctx.fillRect(16, 130, 224, 2);
  ctx.fillStyle = "#d6b45f";
  ctx.fillRect(16, 130, 101, 2);
  ctx.fillStyle = "#d8d4c8";
  ctx.font = "9px monospace";
  ctx.fillText("fjordliv — 45:12", 16, 122);

  return toTexture(canvas);
}

/** Handwritten-style neon sign with a soft tube glow, on transparency. */
export function makeNeonTexture(word: string, color: string): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256, 96);
  ctx.clearRect(0, 0, 256, 96);
  ctx.font = "italic 52px 'Snell Roundhand', 'Segoe Script', 'Brush Script MT', cursive";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.shadowColor = color;
  ctx.shadowBlur = 22;
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.strokeText(word, 128, 50);
  ctx.strokeText(word, 128, 50);

  ctx.shadowBlur = 6;
  ctx.strokeStyle = "#fff6ec";
  ctx.lineWidth = 1.6;
  ctx.strokeText(word, 128, 50);

  return toTexture(canvas);
}

/** Lit marquee poster leaning against the wall: bulb border, OSLO JAZZ. */
export function makeMarqueeTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(128, 176);
  ctx.fillStyle = "#161009";
  ctx.fillRect(0, 0, 128, 176);
  ctx.fillStyle = "#241a10";
  ctx.fillRect(8, 8, 112, 160);

  ctx.fillStyle = "#ffd591";
  for (let x = 6; x <= 122; x += 14) {
    ctx.beginPath();
    ctx.arc(x, 4, 2, 0, Math.PI * 2);
    ctx.arc(x, 172, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let y = 16; y <= 160; y += 14) {
    ctx.beginPath();
    ctx.arc(4, y, 2, 0, Math.PI * 2);
    ctx.arc(124, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#f2ead6";
  ctx.font = "bold 30px Georgia, serif";
  ctx.fillText("OSLO", 64, 62);
  ctx.fillStyle = "#d6b45f";
  ctx.font = "italic 22px Georgia, serif";
  ctx.fillText("jazz", 64, 90);
  ctx.fillStyle = "#98938a";
  ctx.font = "8px monospace";
  ctx.fillText("hver torsdag", 64, 116);
  ctx.fillStyle = "#d6503c";
  ctx.beginPath();
  ctx.moveTo(52, 132);
  ctx.lineTo(76, 132);
  ctx.lineTo(64, 150);
  ctx.closePath();
  ctx.fill();

  return toTexture(canvas);
}

/** Small checkered throw-cushion weave. */
export function makeCheckerTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(64, 64);
  const cell = 8;
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? "#e6dfcc" : "#23201a";
      ctx.fillRect(col * cell, row * cell, cell, cell);
    }
  }
  return toTexture(canvas);
}

/** A retro platformer, paused since 1am. Deliberately pixelated. */
export function makeGameTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(128, 80, 1);
  ctx.fillStyle = "#0d0d12";
  ctx.fillRect(0, 0, 128, 80);

  ctx.fillStyle = "rgba(214, 180, 95, 0.85)";
  const platforms: Array<[number, number, number]> = [
    [5, 69, 46],
    [64, 60, 30],
    [102, 48, 21],
    [29, 42, 24],
    [75, 31, 20]
  ];
  for (const [x, y, width] of platforms) {
    ctx.fillRect(x, y, width, 3);
  }
  ctx.fillStyle = "#efece3";
  ctx.fillRect(35, 35, 5, 7);
  ctx.fillStyle = "#d6503c";
  ctx.fillRect(89, 22, 1, 9);
  ctx.fillRect(90, 22, 5, 4);

  ctx.fillStyle = "rgba(239, 236, 227, 0.9)";
  ctx.font = "8px monospace";
  ctx.fillText("PAUSED", 49, 13);
  ctx.fillStyle = "#98938a";
  ctx.font = "6px monospace";
  ctx.fillText("since 01:14", 46, 21);

  return toTexture(canvas, { pixel: true });
}

export type ArtVariant = "fjord" | "moon" | "grid" | "sun";

/** Small abstract framed prints for the walls. */
export function makeArtTexture(variant: ArtVariant): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(88, 120);
  ctx.fillStyle = variant === "sun" ? "#e8e1d0" : "#101318";
  ctx.fillRect(0, 0, 88, 120);

  switch (variant) {
    case "fjord": {
      ctx.strokeStyle = "rgba(214, 180, 95, 0.8)";
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 6; i += 1) {
        const y = 30 + i * 13;
        ctx.beginPath();
        ctx.moveTo(10, y);
        ctx.bezierCurveTo(30, y - 8, 58, y + 8, 78, y);
        ctx.stroke();
      }
      break;
    }
    case "moon": {
      ctx.fillStyle = "rgba(239, 236, 227, 0.88)";
      ctx.beginPath();
      ctx.arc(44, 46, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#101318";
      ctx.beginPath();
      ctx.arc(52, 40, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(214, 180, 95, 0.7)";
      ctx.fillRect(14, 88, 60, 2);
      break;
    }
    case "grid": {
      ctx.strokeStyle = "rgba(152, 147, 138, 0.6)";
      ctx.lineWidth = 0.8;
      for (let x = 12; x <= 76; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 14);
        ctx.lineTo(x, 106);
        ctx.stroke();
      }
      for (let y = 14; y <= 106; y += 16) {
        ctx.beginPath();
        ctx.moveTo(12, y);
        ctx.lineTo(76, y);
        ctx.stroke();
      }
      ctx.fillStyle = "#d6b45f";
      ctx.fillRect(44, 46, 16, 16);
      break;
    }
    case "sun": {
      ctx.fillStyle = "#c4502f";
      ctx.beginPath();
      ctx.arc(44, 54, 22, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#1d2a52";
      ctx.fillRect(10, 56, 68, 34);
      ctx.fillStyle = "#e8e1d0";
      for (let i = 0; i < 4; i += 1) {
        ctx.fillRect(10, 62 + i * 8, 68, 2);
      }
      ctx.fillStyle = "#3a362f";
      ctx.font = "6px monospace";
      ctx.fillText("bjørvika", 12, 108);
      break;
    }
    default: {
      const exhaustive: never = variant;
      throw new Error(`unhandled art variant: ${String(exhaustive)}`);
    }
  }

  return toTexture(canvas);
}

/** Record label: red paper with a hole and a line of print. */
export function makeRecordTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(128, 128);
  ctx.fillStyle = "#0b0b0c";
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 0.6;
  for (let r = 26; r < 63; r += 2.2) {
    ctx.beginPath();
    ctx.arc(64, 64, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#b8402c";
  ctx.beginPath();
  ctx.arc(64, 64, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f2ead6";
  ctx.font = "6px monospace";
  ctx.textAlign = "center";
  ctx.fillText("side a", 64, 54);
  ctx.fillText("late, slow", 64, 80);
  ctx.fillStyle = "#0b0b0c";
  ctx.beginPath();
  ctx.arc(64, 64, 2, 0, Math.PI * 2);
  ctx.fill();
  return toTexture(canvas);
}

/** A desk clock face, redrawn once a minute with Oslo time. */
export function makeClockTexture(): { texture: THREE.CanvasTexture; set(text: string): void } {
  const [canvas, ctx] = createCanvas(96, 40);
  const texture = toTexture(canvas);
  const set = (text: string): void => {
    ctx.fillStyle = "#0c0b0a";
    ctx.fillRect(0, 0, 96, 40);
    ctx.fillStyle = "#ff9a52";
    ctx.font = "24px 'SFMono-Regular', Menlo, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#ff7a2e";
    ctx.shadowBlur = 6;
    ctx.fillText(text, 48, 21);
    ctx.shadowBlur = 0;
    texture.needsUpdate = true;
  };
  set("--:--");
  return { texture, set };
}

/** Book spine colours: dusty cloth bindings plus the odd gold paperback. */
export const BOOK_COLORS = [0x3f4a55, 0x554438, 0x4f4a42, 0x6b5d4f, 0x2f3a33, 0x7a3b2e, 0xc9bfa8, 0x8a7a5c, 0xd6b45f, 0x1e2a44];
