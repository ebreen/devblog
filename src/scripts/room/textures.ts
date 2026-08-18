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

/** A freshly printed CV page: heading plus rows of grey "text" lines. */
export function makePaperTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(128, 168);
  ctx.fillStyle = "#efece3";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#191919";
  ctx.font = "bold 13px Georgia, serif";
  ctx.fillText("eirik breen", 12, 24);
  ctx.fillStyle = "#98938a";
  ctx.font = "9px monospace";
  ctx.fillText("cv — oslo", 12, 38);

  ctx.fillStyle = "#d6b45f";
  ctx.fillRect(12, 46, 104, 2);

  ctx.fillStyle = "#b7b1a5";
  for (let row = 0; row < 9; row += 1) {
    const y = 60 + row * 11;
    const width = row % 4 === 3 ? 62 : 104;
    ctx.fillRect(12, y, width, 3);
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

/** Striped lounge rug: soft wavy bands in cream, brown, and dark taupe. */
export function makeRugTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256, 176);
  const bands = ["#d8cdb8", "#6b5d4f", "#4a3c2d", "#a3937b", "#3a2f24", "#d8cdb8", "#8a7a63", "#4a3c2d"];
  const bandHeight = canvas.height / bands.length;

  for (let i = 0; i < bands.length; i += 1) {
    ctx.fillStyle = bands[i];
    for (let x = 0; x < canvas.width; x += 4) {
      const wobble = Math.sin(x * 0.05 + i * 1.9) * 3;
      ctx.fillRect(x, i * bandHeight + wobble, 4, bandHeight + 3);
    }
  }

  return toTexture(canvas);
}
