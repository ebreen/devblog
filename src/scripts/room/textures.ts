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

/** Dark rug with a subtle double gold border. */
export function makeRugTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256, 176);
  ctx.fillStyle = "#14100d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(214, 180, 95, 0.4)";
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  ctx.strokeStyle = "rgba(214, 180, 95, 0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  return toTexture(canvas);
}
