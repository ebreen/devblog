import * as THREE from "three";

/**
 * Night view from a 10th-floor window looking south over Bjørvika:
 * MUNCH to the east, the Opera House sliding into the fjord, Barcode
 * towers in the near field, islands and Nesodden beyond.
 */

const BACKDROP_WIDTH = 2048;
const BACKDROP_HEIGHT = 1024;

export type Cityscape = {
  texture: THREE.CanvasTexture;
  group: THREE.Group;
  update(time: number): void;
};

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function makeContext(width: number, height: number): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("2d canvas context unavailable");
  }
  return context;
}

function toFacadeTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function marble(color: number, roughness = 0.38): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.08,
    emissive: 0xb8c4d4,
    emissiveIntensity: 0.12
  });
}

function darkMetal(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.18,
    emissive: color,
    emissiveIntensity: 0.04
  });
}

function boxMesh(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function drawBackdrop(ctx: CanvasRenderingContext2D, random: () => number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, 620);
  sky.addColorStop(0, "#070b14");
  sky.addColorStop(0.45, "#10182a");
  sky.addColorStop(0.78, "#1a2438");
  sky.addColorStop(1, "#151d2c");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, BACKDROP_WIDTH, BACKDROP_HEIGHT);

  for (let i = 0; i < 260; i += 1) {
    const x = random() * BACKDROP_WIDTH;
    const y = random() * 520;
    ctx.fillStyle = `rgba(236, 232, 220, ${0.12 + random() * 0.55})`;
    ctx.fillRect(x, y, random() < 0.1 ? 2 : 1, 1);
  }

  const moonX = 1580;
  const moonY = 168;
  const halo = ctx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 90);
  halo.addColorStop(0, "rgba(236, 232, 220, 0.22)");
  halo.addColorStop(1, "rgba(236, 232, 220, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(moonX - 90, moonY - 90, 180, 180);
  ctx.fillStyle = "#e8e4d6";
  ctx.beginPath();
  ctx.arc(moonX, moonY, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(150, 148, 138, 0.45)";
  ctx.beginPath();
  ctx.arc(moonX - 8, moonY - 6, 6, 0, Math.PI * 2);
  ctx.arc(moonX + 9, moonY + 7, 4, 0, Math.PI * 2);
  ctx.fill();

  // Nesodden / far fjord shore, low and long.
  ctx.fillStyle = "#080c14";
  ctx.beginPath();
  ctx.moveTo(0, 640);
  ctx.lineTo(0, 598);
  for (let x = 0; x <= BACKDROP_WIDTH; x += 48) {
    ctx.lineTo(x, 576 + Math.sin(x * 0.01) * 10 + random() * 8);
  }
  ctx.lineTo(BACKDROP_WIDTH, 640);
  ctx.closePath();
  ctx.fill();

  for (let i = 0; i < 40; i += 1) {
    ctx.fillStyle = `rgba(214, 180, 95, ${0.08 + random() * 0.2})`;
    ctx.fillRect(40 + random() * 1960, 582 + random() * 14, 2, 2);
  }

  // Inner-fjord islands: Hovedøya, Lindøya, Nakholmen as low dark humps.
  const islands: Array<[number, number, number, number]> = [
    [620, 628, 210, 16],
    [980, 634, 150, 12],
    [1280, 630, 180, 14],
    [420, 636, 90, 9]
  ];
  for (const [x, y, width, height] of islands) {
    ctx.fillStyle = "#060910";
    ctx.beginPath();
    ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(214, 180, 95, 0.16)";
    ctx.fillRect(x - width * 0.2, y - 4, 2, 2);
    ctx.fillRect(x + width * 0.15, y - 2, 2, 2);
  }

  const water = ctx.createLinearGradient(0, 640, 0, BACKDROP_HEIGHT);
  water.addColorStop(0, "#0a121e");
  water.addColorStop(0.45, "#0c1522");
  water.addColorStop(1, "#081018");
  ctx.fillStyle = water;
  ctx.fillRect(0, 640, BACKDROP_WIDTH, BACKDROP_HEIGHT - 640);

  const moonPath = ctx.createLinearGradient(moonX, 640, moonX, 900);
  moonPath.addColorStop(0, "rgba(210, 216, 224, 0.16)");
  moonPath.addColorStop(1, "rgba(210, 216, 224, 0)");
  ctx.fillStyle = moonPath;
  ctx.fillRect(moonX - 18, 640, 36, 220);
}

function drawWindowGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cols: number,
  rows: number,
  random: () => number,
  litChance: number
): void {
  ctx.fillStyle = "#14171c";
  ctx.fillRect(0, 0, width, height);
  const padX = width * 0.08;
  const padY = height * 0.06;
  const cellW = (width - padX * 2) / cols;
  const cellH = (height - padY * 2) / rows;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (random() > litChance) {
        ctx.fillStyle = "rgba(8, 9, 12, 0.9)";
        ctx.fillRect(padX + col * cellW + 1, padY + row * cellH + 1, cellW - 2, cellH - 2);
        continue;
      }
      ctx.fillStyle = random() < 0.18 ? "rgba(236, 232, 220, 0.55)" : "rgba(214, 180, 95, 0.5)";
      ctx.fillRect(padX + col * cellW + 1, padY + row * cellH + 1, cellW - 2, cellH - 2);
    }
  }
}

function makeTowerTexture(cols: number, rows: number, random: () => number): THREE.CanvasTexture {
  const ctx = makeContext(128, 256);
  drawWindowGrid(ctx, 128, 256, cols, rows, random, 0.62);
  return toFacadeTexture(ctx.canvas);
}

function makeMunchTexture(random: () => number): THREE.CanvasTexture {
  const ctx = makeContext(160, 320);
  ctx.fillStyle = "#2a3036";
  ctx.fillRect(0, 0, 160, 320);
  ctx.fillStyle = "#1a1e24";
  for (let y = 0; y < 320; y += 7) {
    ctx.fillRect(0, y, 160, 2);
  }
  drawWindowGrid(ctx, 160, 320, 7, 18, random, 0.48);
  return toFacadeTexture(ctx.canvas);
}

function buildOpera(): THREE.Group {
  const opera = new THREE.Group();
  const stone = marble(0xf2eee4, 0.28);
  const stoneCool = marble(0xe4e8ee, 0.36);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x1c242c,
    emissive: 0xe0c56a,
    emissiveIntensity: 0.7,
    roughness: 0.15,
    metalness: 0.35,
    transparent: true,
    opacity: 0.94
  });

  const plaza = boxMesh(12.4, 0.14, 8.2, stone);
  plaza.position.y = 0.07;
  opera.add(plaza);

  const lowSlope = boxMesh(11.2, 0.2, 6.2, stone);
  lowSlope.position.set(-0.2, 0.42, 0.2);
  lowSlope.rotation.x = -0.2;
  opera.add(lowSlope);

  const midSlope = boxMesh(7.4, 0.18, 4.4, stoneCool);
  midSlope.position.set(-0.8, 1.15, -0.45);
  midSlope.rotation.x = -0.32;
  midSlope.rotation.z = 0.05;
  opera.add(midSlope);

  const peak = boxMesh(4.2, 0.16, 2.8, stone);
  peak.position.set(-1.4, 1.95, -0.9);
  peak.rotation.x = -0.24;
  opera.add(peak);

  const iceEdge = boxMesh(6.2, 0.12, 3.4, stoneCool);
  iceEdge.position.set(2.2, 0.28, 2.3);
  iceEdge.rotation.x = 0.2;
  iceEdge.rotation.y = -0.14;
  opera.add(iceEdge);

  const hall = boxMesh(4.2, 1.45, 2.6, glass);
  hall.position.set(0.15, 0.9, -1.7);
  hall.name = "opera-hall";
  opera.add(hall);

  const flood = new THREE.SpotLight(0xf3efe3, 18, 22, 0.7, 0.45, 1);
  flood.position.set(-2.4, 6.2, 3.4);
  flood.target.position.set(0, 0.8, 0);
  opera.add(flood, flood.target);

  const lobbyGlow = new THREE.PointLight(0xe0c56a, 7, 16);
  lobbyGlow.position.set(0.2, 1.3, -1.2);
  opera.add(lobbyGlow);

  return opera;
}

function buildMunch(facade: THREE.CanvasTexture): THREE.Group {
  const munch = new THREE.Group();
  const skin = darkMetal(0x2c3238);
  const skinDark = darkMetal(0x1b1f24);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x9aa3ad,
    map: facade,
    roughness: 0.35,
    metalness: 0.22,
    emissive: 0xd6b45f,
    emissiveIntensity: 0.22
  });

  const shaft = boxMesh(2.15, 5.4, 2.45, skin);
  shaft.position.y = 2.7;
  munch.add(shaft);

  const face = new THREE.Mesh(new THREE.PlaneGeometry(2, 5.1), glass);
  face.position.set(0, 2.7, 1.24);
  munch.add(face);

  const crown = boxMesh(2.65, 3.1, 2.7, skinDark);
  crown.position.set(0.85, 6.85, 0.2);
  munch.add(crown);

  const crownFace = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.8), glass);
  crownFace.position.set(0.85, 6.85, 1.56);
  munch.add(crownFace);

  const crownLight = new THREE.PointLight(0xc8d0d8, 3.4, 14);
  crownLight.position.set(0.6, 7.4, 1.8);
  munch.add(crownLight);

  return munch;
}

function buildBarcode(random: () => number): THREE.Group {
  const row = new THREE.Group();
  const heights = [4.2, 5.8, 3.6, 6.4, 4.8, 3.2, 5.1];
  let x = 0;
  for (let i = 0; i < heights.length; i += 1) {
    const height = heights[i];
    const width = 0.72 + random() * 0.28;
    const depth = 1.1 + random() * 0.4;
    const texture = makeTowerTexture(4, 12 + Math.floor(random() * 6), random);
    const material = new THREE.MeshStandardMaterial({
      color: i % 2 === 0 ? 0x6a727c : 0x4f565e,
      map: texture,
      roughness: 0.32,
      metalness: 0.5,
      emissive: 0xb89a4e,
      emissiveIntensity: 0.08
    });
    const tower = boxMesh(width, height, depth, material);
    tower.position.set(x, height / 2, (random() - 0.5) * 0.6);
    row.add(tower);
    x += width + 0.38;
  }
  return row;
}

function buildNearRoofs(random: () => number): THREE.Group {
  const roofs = new THREE.Group();
  const tar = darkMetal(0x16181c);
  for (let i = 0; i < 10; i += 1) {
    const width = 1.4 + random() * 2.2;
    const depth = 1.1 + random() * 1.6;
    const height = 0.35 + random() * 0.5;
    const roof = boxMesh(width, height, depth, tar);
    roof.position.set(-9 + i * 2.05 + random() * 0.3, height / 2, (random() - 0.5) * 1.4);
    roofs.add(roof);
    if (random() < 0.55) {
      const glow = boxMesh(0.12, 0.08, 0.12, new THREE.MeshBasicMaterial({ color: 0xd6b45f }));
      glow.position.set(roof.position.x, height + 0.08, roof.position.z);
      roofs.add(glow);
    }
  }
  return roofs;
}

function buildFerry(): THREE.Group {
  const ferry = new THREE.Group();
  const hull = boxMesh(1.15, 0.18, 0.34, darkMetal(0x12151a));
  hull.position.y = 0.1;
  const cabin = boxMesh(0.55, 0.2, 0.26, darkMetal(0x2a2e34));
  cabin.position.set(-0.12, 0.28, 0);
  const lightA = boxMesh(0.06, 0.06, 0.06, new THREE.MeshBasicMaterial({ color: 0xd6b45f }));
  lightA.position.set(0.42, 0.2, 0.1);
  const lightB = boxMesh(0.06, 0.06, 0.06, new THREE.MeshBasicMaterial({ color: 0xd6b45f }));
  lightB.position.set(0.42, 0.2, -0.1);
  ferry.add(hull, cabin, lightA, lightB);
  return ferry;
}

export function createCityscape(): Cityscape {
  const random = createRandom(20260817);
  const group = new THREE.Group();

  const backdropCtx = makeContext(BACKDROP_WIDTH, BACKDROP_HEIGHT);
  drawBackdrop(backdropCtx, random);
  const texture = toFacadeTexture(backdropCtx.canvas);
  texture.needsUpdate = true;

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(92, 46),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
  );
  backdrop.position.set(0, 9.2, -46);
  group.add(backdrop);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(78, 40),
    new THREE.MeshStandardMaterial({
      color: 0x0d1826,
      roughness: 0.18,
      metalness: 0.62,
      emissive: 0x243044,
      emissiveIntensity: 0.28
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(1, -1.45, -24);
  group.add(water);

  const moon = new THREE.DirectionalLight(0xd5dce6, 1.8);
  moon.position.set(16, 20, -6);
  moon.target.position.set(0.4, 0.4, -14);
  group.add(moon, moon.target);

  const opera = buildOpera();
  opera.position.set(-1.8, -1.45, -13.8);
  opera.rotation.y = 0.12;
  group.add(opera);

  const munch = buildMunch(makeMunchTexture(random));
  munch.position.set(3.4, -1.45, -12.6);
  munch.rotation.y = -0.06;
  group.add(munch);

  const barcode = buildBarcode(random);
  barcode.position.set(-11.4, -1.15, -10.8);
  barcode.rotation.y = 0.1;
  group.add(barcode);

  const eastTowers = buildBarcode(random);
  eastTowers.scale.setScalar(0.68);
  eastTowers.position.set(10.2, -1.2, -11.6);
  eastTowers.rotation.y = -0.22;
  group.add(eastTowers);

  const roofs = buildNearRoofs(random);
  roofs.position.set(0.4, -1.35, -8.2);
  group.add(roofs);

  const ferry = buildFerry();
  ferry.position.set(-8, -1.38, -22);
  group.add(ferry);

  const sheLies = boxMesh(0.7, 0.9, 0.55, marble(0xcdd3da, 0.2));
  sheLies.position.set(4.8, -0.95, -18.6);
  sheLies.rotation.set(0.4, 0.6, -0.25);
  group.add(sheLies);

  const operaHall = opera.getObjectByName("opera-hall");

  function update(time: number): void {
    ferry.position.x = ((time * 1.15) % 36) - 18;
    ferry.position.z = -21.5 + Math.sin(time * 0.35) * 0.8;
    ferry.rotation.y = Math.atan2(-Math.cos(time * 0.35) * 0.8, 1.15);
    if (operaHall instanceof THREE.Mesh && operaHall.material instanceof THREE.MeshStandardMaterial) {
      operaHall.material.emissiveIntensity = 0.48 + Math.sin(time * 0.7) * 0.08;
    }
  }

  update(0);

  return { texture, group, update };
}
