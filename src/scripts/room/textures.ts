import * as THREE from "three";

function createCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("2d canvas context unavailable");
  }
  return [canvas, context];
}

function toTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

/** Warm herringbone wood floor, tiled. */
export function makeFloorTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256, 256);
  ctx.fillStyle = "#1d150e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const planks = ["#3a2d20", "#443426", "#332818", "#3f3122"];
  const cell = 32;
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const px = col * cell;
      const py = row * cell;
      ctx.fillStyle = planks[(col * 13 + row * 7) % planks.length];
      if ((col + row) % 2 === 0) {
        ctx.fillRect(px, py + 1, cell, cell - 2);
      } else {
        ctx.fillRect(px + 1, py, cell - 2, cell);
      }
    }
  }

  const texture = toTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 2.4);
  return texture;
}

/** Terminal-style screen: gold mono text on near-black, block cursor at the end. */
export function makeMonitorTexture(lines: string[]): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256, 160);
  ctx.fillStyle = "#0b0b0b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = "15px monospace";

  const lineHeight = 21;
  let y = 26;
  for (const line of lines) {
    ctx.fillStyle = line.startsWith("$") ? "#efece3" : "#d6b45f";
    ctx.fillText(line, 14, y);
    y += lineHeight;
  }
  ctx.fillStyle = "#d6b45f";
  ctx.fillRect(14, y - 12, 9, 15);

  return toTexture(canvas);
}

/**
 * The printed CV, drawn to match the real FlowCV resume: name, contact line,
 * Profil, Erfaring with dated entries, Utdanning. Body text becomes thin
 * grey bars, real headers stay readable.
 */
export function makeResumeTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256, 360);
  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#17150f";
  ctx.font = "bold 24px Georgia, serif";
  ctx.fillText("Eirik Breen", 20, 36);
  ctx.fillStyle = "#6f6a64";
  ctx.font = "9px monospace";
  ctx.fillText("me@eirikbreen.com · 0486 oslo", 20, 52);
  ctx.fillText("www.eirikbreen.com", 20, 63);

  ctx.fillStyle = "#d6b45f";
  ctx.fillRect(20, 72, 216, 2);

  const bar = (x: number, y: number, w: number): void => {
    ctx.fillRect(x, y, w, 2.5);
  };

  ctx.fillStyle = "#2d2a24";
  ctx.font = "bold 12px Georgia, serif";
  ctx.fillText("Profil", 20, 92);
  ctx.fillStyle = "#b3ad9f";
  for (const [y, w] of [
    [100, 216],
    [107, 216],
    [114, 204],
    [121, 168]
  ]) {
    bar(20, y, w);
  }

  ctx.fillStyle = "#2d2a24";
  ctx.font = "bold 12px Georgia, serif";
  ctx.fillText("Erfaring", 20, 142);
  ctx.fillStyle = "#4a463e";
  ctx.font = "bold 8px monospace";
  ctx.fillText("Orange Business (Basefarm)", 20, 156);
  ctx.fillStyle = "#8f897c";
  ctx.font = "8px monospace";
  ctx.fillText("2023– senior systems consultant", 20, 166);
  ctx.fillStyle = "#b3ad9f";
  for (const [y, w] of [
    [174, 208],
    [181, 216],
    [188, 190],
    [195, 204],
    [202, 152]
  ]) {
    bar(26, y, w - 6);
  }
  ctx.fillStyle = "#8f897c";
  ctx.font = "8px monospace";
  ctx.fillText("2021–23 senior operations technician", 20, 218);
  ctx.fillStyle = "#b3ad9f";
  for (const [y, w] of [
    [226, 206],
    [233, 188],
    [240, 156]
  ]) {
    bar(26, y, w - 6);
  }
  ctx.fillStyle = "#8f897c";
  ctx.font = "8px monospace";
  ctx.fillText("2018–21 driftsingeniør ikt, hdo", 20, 256);
  ctx.fillStyle = "#b3ad9f";
  for (const [y, w] of [
    [264, 196],
    [271, 172]
  ]) {
    bar(26, y, w - 6);
  }

  ctx.fillStyle = "#2d2a24";
  ctx.font = "bold 12px Georgia, serif";
  ctx.fillText("Utdanning", 20, 296);
  ctx.fillStyle = "#8f897c";
  ctx.font = "8px monospace";
  ctx.fillText("fagbrev ikt-servicemedarbeider", 20, 310);
  ctx.fillStyle = "#b3ad9f";
  bar(26, 318, 178);
  bar(26, 325, 142);

  ctx.fillStyle = "#8f897c";
  ctx.font = "7px monospace";
  ctx.fillText("— 1 of 2 —", 104, 348);

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
  ctx.fillRect(16, 130, 224, 3);
  ctx.fillStyle = "#d6b45f";
  ctx.fillRect(16, 130, 101, 3);
  ctx.fillStyle = "#d8d4c8";
  ctx.font = "10px monospace";
  ctx.fillText("fjordliv — 45:12", 16, 122);

  return toTexture(canvas);
}

/** Handwritten-style neon sign with a soft tube glow, on transparency. */
export function makeNeonTexture(word: string, color: string): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256, 96);
  ctx.clearRect(0, 0, 256, 96);
  ctx.font = "italic bold 54px 'Segoe Script', 'Comic Sans MS', cursive";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.shadowColor = color;
  ctx.shadowBlur = 26;
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.strokeText(word, 128, 50);
  ctx.strokeText(word, 128, 50);

  ctx.shadowBlur = 8;
  ctx.strokeStyle = "#fff6ec";
  ctx.lineWidth = 2;
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
    ctx.fillRect(x - 2, 2, 4, 4);
    ctx.fillRect(x - 2, 170, 4, 4);
  }
  for (let y = 16; y <= 160; y += 14) {
    ctx.fillRect(2, y - 2, 4, 4);
    ctx.fillRect(122, y - 2, 4, 4);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#f2ead6";
  ctx.font = "bold 30px Georgia, serif";
  ctx.fillText("OSLO", 64, 62);
  ctx.fillStyle = "#d6b45f";
  ctx.font = "bold 20px Georgia, serif";
  ctx.fillText("JAZZ", 64, 92);
  ctx.fillStyle = "#98938a";
  ctx.font = "9px monospace";
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

/** A retro platformer, paused since 1am: gold platforms, a little hero, a flag. */
export function makeGameTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256, 160);
  ctx.fillStyle = "#0d0d12";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(214, 180, 95, 0.85)";
  const platforms: Array<[number, number, number]> = [
    [10, 138, 92],
    [128, 120, 60],
    [204, 96, 42],
    [58, 84, 48],
    [150, 62, 40]
  ];
  for (const [x, y, width] of platforms) {
    ctx.fillRect(x, y, width, 6);
  }

  ctx.fillStyle = "#efece3";
  ctx.fillRect(70, 70, 10, 14);
  ctx.fillStyle = "#d6503c";
  ctx.fillRect(178, 44, 3, 18);
  ctx.fillRect(181, 44, 10, 7);

  ctx.fillStyle = "rgba(239, 236, 227, 0.9)";
  ctx.font = "bold 13px monospace";
  ctx.fillText("paused", 106, 26);
  ctx.fillStyle = "#98938a";
  ctx.font = "9px monospace";
  ctx.fillText("since 01:14", 100, 40);

  return toTexture(canvas);
}

export type ArtVariant = "fjord" | "moon" | "grid";

/** Small abstract framed prints for the walls. */
export function makeArtTexture(variant: ArtVariant): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(88, 120);
  ctx.fillStyle = "#101318";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  switch (variant) {
    case "fjord": {
      ctx.strokeStyle = "rgba(214, 180, 95, 0.75)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i += 1) {
        const y = 34 + i * 15;
        ctx.beginPath();
        ctx.moveTo(10, y);
        ctx.bezierCurveTo(30, y - 8, 58, y + 8, 78, y);
        ctx.stroke();
      }
      break;
    }
    case "moon": {
      ctx.fillStyle = "rgba(239, 236, 227, 0.85)";
      ctx.beginPath();
      ctx.arc(44, 46, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#101318";
      ctx.beginPath();
      ctx.arc(52, 40, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(214, 180, 95, 0.7)";
      ctx.fillRect(14, 88, 60, 3);
      break;
    }
    case "grid": {
      ctx.strokeStyle = "rgba(152, 147, 138, 0.6)";
      ctx.lineWidth = 1;
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
    default: {
      const exhaustive: never = variant;
      throw new Error(`unhandled art variant: ${String(exhaustive)}`);
    }
  }

  return toTexture(canvas);
}

/** Deep blue lounge rug: soft wavy tonal bands with a pale fringe. */
export function makeRugTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256, 176);
  const bands = ["#2a48ac", "#3a5cc8", "#1f357e", "#4a6fd6", "#28429e", "#5a80e2", "#243c94", "#3a5cc8"];
  const bandHeight = canvas.height / bands.length;

  for (let i = 0; i < bands.length; i += 1) {
    ctx.fillStyle = bands[i];
    for (let x = 0; x < canvas.width; x += 4) {
      const wobble = Math.sin(x * 0.05 + i * 1.9) * 3;
      ctx.fillRect(x, i * bandHeight + wobble, 4, bandHeight + 3);
    }
  }

  ctx.fillStyle = "#d9d2c0";
  ctx.fillRect(0, 0, canvas.width, 4);
  ctx.fillRect(0, canvas.height - 4, canvas.width, 4);

  return toTexture(canvas);
}
