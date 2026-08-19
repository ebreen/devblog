import * as THREE from "three";

/**
 * Night view from a 10th-floor window over Bjørvika and the Oslofjord.
 * The water sits ~11 units below the room, landmarks rise from it at
 * distance, and everything bright is painted into canvas textures so
 * windows, signs, and reflections read as small crisp lights instead
 * of big flat blocks.
 */

export type Cityscape = {
  group: THREE.Group;
  update(time: number): void;
};

const WATER_Y = -10;
const WATER_NEAR_Z = -13.6;
const WATER_FAR_Z = -69;
const WATER_LEFT_X = -47;
const WATER_RIGHT_X = 49;
const WATER_TEX_W = 1024;
const WATER_TEX_H = 512;
const MOON_X = 3;
const WATER_REDRAW_INTERVAL = 0.05;

const WARM_WINDOW_COLORS = ["#ffd591", "#ffe3b3", "#f7c97e", "#ffcf7d"];
const COOL_WINDOW_COLORS = ["#cfe0ff", "#dbe7ff", "#9fb6de", "#b9cdf2"];

type Twinkle = {
  material: THREE.MeshBasicMaterial;
  phase: number;
  speed: number;
  depth: number;
};

type Beacon = {
  material: THREE.MeshBasicMaterial;
  base: THREE.Color;
  rate: number;
  phase: number;
};

type Reflection = {
  x: number;
  color: string;
  strength: number;
  width: number;
  reach: number;
  phase: number;
};

type TowerSkin = {
  cols: number;
  floors: number;
  warmth: number;
  lit: number;
  shopfront?: boolean;
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

function cityTexture(canvas: HTMLCanvasElement, smooth = false): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = smooth ? THREE.LinearFilter : THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  return texture;
}

function facadeMesh(
  width: number,
  height: number,
  depth: number,
  texture: THREE.CanvasTexture,
  roof: THREE.MeshBasicMaterial,
  twinkles: Twinkle[],
  random: () => number
): THREE.Mesh {
  const side = new THREE.MeshBasicMaterial({ map: texture });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), [
    side,
    side,
    roof,
    roof,
    side,
    side
  ]);
  twinkles.push({
    material: side,
    phase: random() * Math.PI * 2,
    speed: 0.35 + random() * 0.6,
    depth: 0.05 + random() * 0.05
  });
  return mesh;
}

function worldToWaterX(x: number): number {
  return ((x - WATER_LEFT_X) / (WATER_RIGHT_X - WATER_LEFT_X)) * WATER_TEX_W;
}

function worldToWaterY(z: number): number {
  const v = (z - WATER_FAR_Z) / (WATER_NEAR_Z - WATER_FAR_Z);
  return (1 - v) * WATER_TEX_H;
}

/** Lit-window facade: small warm/cool windows, dark floors, shopfronts. */
function makeTowerSkin(random: () => number, skin: TowerSkin): THREE.CanvasTexture {
  const width = 96;
  const floorPx = 10;
  const height = skin.floors * floorPx + 10;
  const ctx = makeContext(width, height);

  ctx.fillStyle = "#0a0c11";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#0d1017";
  for (let x = 0; x < width; x += 12) {
    ctx.fillRect(x, 0, 5, height);
  }
  ctx.fillStyle = "#161a22";
  ctx.fillRect(0, 0, width, 3);

  const cellW = (width - 8) / skin.cols;
  for (let floor = 0; floor < skin.floors; floor += 1) {
    const y = 5 + floor * floorPx;
    const floorDark = random() < 0.09;
    for (let col = 0; col < skin.cols; col += 1) {
      if (floorDark || random() > skin.lit) {
        continue;
      }
      const warm = random() < skin.warmth;
      const palette = warm ? WARM_WINDOW_COLORS : COOL_WINDOW_COLORS;
      ctx.fillStyle = palette[Math.floor(random() * palette.length)];
      ctx.globalAlpha = random() < 0.2 ? 0.28 : 0.6 + random() * 0.4;
      const wx = 4 + col * cellW + 1;
      ctx.fillRect(wx, y, Math.max(2, cellW - 3), 6);
      if (random() < 0.03) {
        ctx.fillStyle = random() < 0.5 ? "#7fd4c9" : "#ff6b5e";
        ctx.fillRect(wx, y, Math.max(2, cellW - 3), 6);
      }
    }
  }
  ctx.globalAlpha = 1;

  if (skin.shopfront) {
    const y = height - 9;
    let x = 3;
    while (x < width - 8) {
      const w = 6 + Math.floor(random() * 9);
      ctx.fillStyle = random() < 0.75 ? "#ffdf9e" : "#ffe9c4";
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x, y, w, 7);
      if (random() < 0.22) {
        ctx.fillStyle = ["#7fd4c9", "#ff6b5e", "#c7a4ff"][Math.floor(random() * 3)];
        ctx.fillRect(x + 1, y - 3, Math.min(w - 2, 8), 2);
      }
      x += w + 3 + Math.floor(random() * 5);
    }
    ctx.globalAlpha = 1;
  }

  return cityTexture(ctx.canvas);
}

/** MUNCH facade: vertical perforated-metal stripes with wide window bands. */
function makeMunchSkin(random: () => number, openness: number): THREE.CanvasTexture {
  const width = 128;
  const height = 288;
  const ctx = makeContext(width, height);

  ctx.fillStyle = "#1b1f25";
  ctx.fillRect(0, 0, width, height);
  for (let x = 0; x < width; x += 4) {
    ctx.fillStyle = x % 8 === 0 ? "#21262e" : "#14181e";
    ctx.fillRect(x, 0, 2, height);
  }

  const floors = 13;
  const floorPx = height / floors;
  for (let floor = 0; floor < floors; floor += 1) {
    const y = Math.floor(floor * floorPx) + 6;
    let x = 8;
    while (x < width - 16) {
      const w = 10 + Math.floor(random() * 11);
      if (random() < openness) {
        const warm = random() < 0.3;
        ctx.fillStyle = warm ? "#ffd9a0" : "#cfe0ff";
        ctx.globalAlpha = 0.5 + random() * 0.45;
        ctx.fillRect(x, y, w, 9);
      }
      x += w + 10 + Math.floor(random() * 9);
    }
  }
  ctx.globalAlpha = 1;

  return cityTexture(ctx.canvas);
}

function makeMunchSign(): THREE.CanvasTexture {
  const ctx = makeContext(64, 16);
  ctx.clearRect(0, 0, 64, 16);
  ctx.fillStyle = "#f2efe7";
  ctx.font = "bold 11px monospace";
  ctx.fillText("MUNCH", 4, 12);
  return cityTexture(ctx.canvas);
}

/** Opera glass hall: warm interior glow behind slim mullions. */
function makeGlassHall(): THREE.CanvasTexture {
  const ctx = makeContext(96, 40);
  const glow = ctx.createLinearGradient(0, 0, 0, 40);
  glow.addColorStop(0, "#a87f3e");
  glow.addColorStop(0.45, "#ffd591");
  glow.addColorStop(1, "#ffe6b8");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 96, 40);
  ctx.fillStyle = "#fff3d8";
  ctx.fillRect(14, 16, 18, 20);
  ctx.fillRect(52, 12, 12, 24);
  ctx.fillStyle = "#241d12";
  for (let x = 0; x < 96; x += 8) {
    ctx.fillRect(x, 0, 2, 40);
  }
  ctx.fillRect(0, 19, 96, 2);
  ctx.fillRect(0, 0, 96, 2);
  return cityTexture(ctx.canvas);
}

function drawSky(ctx: CanvasRenderingContext2D, random: () => number): void {
  const width = 2048;
  const height = 896;
  const horizon = 556;

  const sky = ctx.createLinearGradient(0, 0, 0, horizon + 40);
  sky.addColorStop(0, "#04060d");
  sky.addColorStop(0.45, "#0a1020");
  sky.addColorStop(0.72, "#141c30");
  sky.addColorStop(1, "#202a42");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, horizon);

  for (let i = 0; i < 360; i += 1) {
    const x = random() * width;
    const y = random() * (horizon - 60);
    const bright = random();
    ctx.fillStyle = `rgba(238, 234, 224, ${0.12 + bright * 0.6})`;
    ctx.fillRect(x, y, bright > 0.92 ? 2 : 1, 1);
    if (bright > 0.975) {
      ctx.fillStyle = "rgba(238, 234, 224, 0.28)";
      ctx.fillRect(x - 2, y, 5, 1);
      ctx.fillRect(x, y - 2, 1, 5);
    }
  }

  for (let i = 0; i < 4; i += 1) {
    const y = 110 + random() * 300;
    const x = random() * width;
    const w = 320 + random() * 420;
    const cloud = ctx.createRadialGradient(x, y, 8, x, y, w / 2);
    cloud.addColorStop(0, "rgba(34, 46, 68, 0.14)");
    cloud.addColorStop(1, "rgba(34, 46, 68, 0)");
    ctx.fillStyle = cloud;
    ctx.fillRect(x - w / 2, y - 26, w, 52);
  }

  const moonX = 1064;
  const moonY = 178;
  const outerHalo = ctx.createRadialGradient(moonX, moonY, 20, moonX, moonY, 130);
  outerHalo.addColorStop(0, "rgba(206, 216, 234, 0.2)");
  outerHalo.addColorStop(1, "rgba(206, 216, 234, 0)");
  ctx.fillStyle = outerHalo;
  ctx.fillRect(moonX - 130, moonY - 130, 260, 260);
  const innerHalo = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 58);
  innerHalo.addColorStop(0, "rgba(224, 232, 244, 0.3)");
  innerHalo.addColorStop(1, "rgba(224, 232, 244, 0)");
  ctx.fillStyle = innerHalo;
  ctx.fillRect(moonX - 58, moonY - 58, 116, 116);
  ctx.fillStyle = "#ece7d8";
  ctx.beginPath();
  ctx.arc(moonX, moonY, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(168, 164, 152, 0.5)";
  ctx.beginPath();
  ctx.arc(moonX - 10, moonY - 8, 8, 0, Math.PI * 2);
  ctx.arc(moonX + 12, moonY + 9, 5, 0, Math.PI * 2);
  ctx.arc(moonX + 2, moonY + 16, 4, 0, Math.PI * 2);
  ctx.fill();

  // City glow bleeding into the sky: warm over sentrum (right), cool east.
  const glowWest = ctx.createRadialGradient(1520, horizon, 30, 1520, horizon, 360);
  glowWest.addColorStop(0, "rgba(84, 62, 34, 0.5)");
  glowWest.addColorStop(1, "rgba(84, 62, 34, 0)");
  ctx.fillStyle = glowWest;
  ctx.fillRect(1160, horizon - 360, 720, 360);
  const glowEast = ctx.createRadialGradient(430, horizon, 30, 430, horizon, 300);
  glowEast.addColorStop(0, "rgba(46, 54, 76, 0.5)");
  glowEast.addColorStop(1, "rgba(46, 54, 76, 0)");
  ctx.fillStyle = glowEast;
  ctx.fillRect(130, horizon - 300, 600, 300);

  // Spires and blocks silhouetted against the glow.
  ctx.fillStyle = "#05070d";
  ctx.fillRect(1490, horizon - 44, 8, 44);
  ctx.fillRect(1487, horizon - 52, 14, 10);
  ctx.fillRect(1494, horizon - 62, 2, 12);
  ctx.fillRect(1560, horizon - 30, 26, 30);
  ctx.fillRect(1620, horizon - 38, 18, 38);
  ctx.fillStyle = "rgba(255, 213, 145, 0.5)";
  ctx.fillRect(1494, horizon - 56, 2, 2);
  ctx.fillRect(1566, horizon - 24, 2, 2);

  // Ekeberg ridge sliding down from the left.
  ctx.fillStyle = "#04060b";
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  ctx.lineTo(0, horizon - 150);
  ctx.lineTo(180, horizon - 118);
  ctx.lineTo(420, horizon - 58);
  ctx.lineTo(640, horizon - 16);
  ctx.lineTo(700, horizon);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 22; i += 1) {
    const t = random();
    const x = t * 640;
    const ridgeY = horizon - 150 + t * 140;
    ctx.fillStyle = `rgba(255, 213, 145, ${0.1 + random() * 0.3})`;
    ctx.fillRect(x, ridgeY + random() * 26, 2, 2);
  }

  // Akershus fortress floodlit on its headland, west across the harbor.
  ctx.fillStyle = "#0a0a09";
  ctx.fillRect(1680, horizon - 40, 190, 40);
  ctx.fillStyle = "rgba(214, 189, 128, 0.4)";
  ctx.fillRect(1692, horizon - 32, 42, 26);
  ctx.fillRect(1770, horizon - 36, 30, 30);
  ctx.fillStyle = "#0a0a09";
  ctx.fillRect(1700, horizon - 52, 10, 20);
  ctx.fillRect(1782, horizon - 50, 8, 18);
  ctx.fillStyle = "rgba(255, 224, 170, 0.65)";
  ctx.fillRect(1703, horizon - 48, 2, 2);
  ctx.fillRect(1784, horizon - 46, 2, 2);

  // Far shore band right at the horizon, dotted with lights.
  ctx.fillStyle = "#04060a";
  ctx.fillRect(0, horizon - 8, width, 26);
  for (let i = 0; i < 90; i += 1) {
    const x = random() * width;
    ctx.fillStyle = `rgba(255, 216, 156, ${0.1 + random() * 0.3})`;
    ctx.fillRect(x, horizon - 4 + random() * 12, random() < 0.1 ? 2 : 1, 2);
  }
  ctx.fillStyle = "#ff5348";
  ctx.fillRect(320, horizon - 14, 2, 3);
  ctx.fillRect(1712, horizon - 60, 2, 3);

  // Painted far fjord below the horizon, meeting the 3d water.
  const farSea = ctx.createLinearGradient(0, horizon + 12, 0, height);
  farSea.addColorStop(0, "#0a1220");
  farSea.addColorStop(1, "#071018");
  ctx.fillStyle = farSea;
  ctx.fillRect(0, horizon + 12, width, height - horizon - 12);
  ctx.fillStyle = "rgba(210, 218, 230, 0.1)";
  ctx.fillRect(moonX - 12, horizon + 12, 24, 120);

  // Painted islands on the far water: Hovedøya and friends.
  const islands: Array<[number, number, number]> = [
    [560, horizon + 46, 150],
    [880, horizon + 34, 96],
    [1250, horizon + 52, 130]
  ];
  for (const [x, y, w] of islands) {
    ctx.fillStyle = "#05070c";
    ctx.beginPath();
    ctx.ellipse(x, y, w, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 216, 156, 0.3)";
    ctx.fillRect(x - w * 0.3, y - 3, 2, 2);
    ctx.fillRect(x + w * 0.2, y - 2, 2, 2);
  }

  // Dither the smooth gradients so they do not band at low bit depth.
  for (let i = 0; i < 2400; i += 1) {
    const x = random() * width;
    const y = random() * height;
    ctx.fillStyle = random() < 0.5 ? "rgba(255, 255, 255, 0.012)" : "rgba(0, 0, 0, 0.02)";
    ctx.fillRect(x, y, 1, 1);
  }
}

function drawWaterBase(ctx: CanvasRenderingContext2D): void {
  const base = ctx.createLinearGradient(0, 0, 0, WATER_TEX_H);
  base.addColorStop(0, "#081120");
  base.addColorStop(0.5, "#0a141f");
  base.addColorStop(1, "#0b1016");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, WATER_TEX_W, WATER_TEX_H);
}

function buildOpera(twinkles: Twinkle[]): THREE.Group {
  const opera = new THREE.Group();
  const marble = new THREE.MeshStandardMaterial({
    color: 0xe9e6dc,
    roughness: 0.4,
    metalness: 0.05,
    emissive: 0x9aa6b8,
    emissiveIntensity: 0.08
  });

  const plaza = new THREE.Mesh(new THREE.BoxGeometry(13, 0.35, 6.5), marble);
  plaza.position.y = 0.18;
  opera.add(plaza);

  const wedgeLow = new THREE.Mesh(new THREE.BoxGeometry(11, 0.3, 5.2), marble);
  wedgeLow.position.set(-0.4, 0.85, -0.2);
  wedgeLow.rotation.z = 0.1;
  opera.add(wedgeLow);

  const wedgeMid = new THREE.Mesh(new THREE.BoxGeometry(7, 0.28, 4.2), marble);
  wedgeMid.position.set(-1.4, 1.7, -0.5);
  wedgeMid.rotation.z = 0.16;
  opera.add(wedgeMid);

  const plateau = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.24, 3.4), marble);
  plateau.position.set(-3, 2.5, -0.6);
  plateau.rotation.z = 0.09;
  opera.add(plateau);

  const flyTower = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.2, 2.8), marble);
  flyTower.position.set(0.9, 2.9, -1.3);
  opera.add(flyTower);

  const hallMaterial = new THREE.MeshBasicMaterial({ map: makeGlassHall() });
  const hall = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2, 0.35), hallMaterial);
  hall.position.set(0.6, 1.25, 2.45);
  hall.name = "opera-hall";
  twinkles.push({ material: hallMaterial, phase: 1.7, speed: 0.5, depth: 0.06 });
  opera.add(hall);

  const walkway = new THREE.Mesh(
    new THREE.BoxGeometry(10.5, 0.05, 0.09),
    new THREE.MeshBasicMaterial({ color: 0xaeb8c8 })
  );
  walkway.position.set(-0.5, 1.06, 2.42);
  walkway.rotation.z = 0.1;
  opera.add(walkway);

  const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xffd591 });
  const dotGeometry = new THREE.BoxGeometry(0.12, 0.06, 0.12);
  for (const dx of [-5, -2.5, 0, 2.5, 5]) {
    const dot = new THREE.Mesh(dotGeometry, dotMaterial);
    dot.position.set(dx, 0.4, 2.9);
    opera.add(dot);
  }

  const flood = new THREE.SpotLight(0xf3efe3, 7, 34, 0.62, 0.5, 1.1);
  flood.position.set(-7, 10, 9);
  flood.target.position.set(0, 0.6, 0);
  opera.add(flood, flood.target);

  return opera;
}

function buildMunch(
  random: () => number,
  roof: THREE.MeshBasicMaterial,
  twinkles: Twinkle[]
): THREE.Group {
  const munch = new THREE.Group();

  const shaft = facadeMesh(5.4, 10.5, 4.2, makeMunchSkin(random, 0.5), roof, twinkles, random);
  shaft.position.y = 5.25;
  munch.add(shaft);

  const crown = facadeMesh(6.4, 3.2, 4.7, makeMunchSkin(random, 0.78), roof, twinkles, random);
  crown.position.set(-1.5, 11.7, 0);
  crown.rotation.z = 0.06;
  munch.add(crown);

  const crownEdge = new THREE.Mesh(
    new THREE.BoxGeometry(6.4, 0.08, 0.1),
    new THREE.MeshBasicMaterial({ color: 0x9fb6de })
  );
  crownEdge.position.set(-1.5, 13.34, 2.3);
  crownEdge.rotation.z = 0.06;
  munch.add(crownEdge);

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 0.6),
    new THREE.MeshBasicMaterial({ map: makeMunchSign(), transparent: true })
  );
  sign.position.set(-1.5, 12.4, 2.37);
  munch.add(sign);

  const beaconMaterial = new THREE.MeshBasicMaterial({ color: 0xff4438 });
  const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), beaconMaterial);
  beacon.position.set(-1.5, 13.42, 0);
  munch.add(beacon);

  return munch;
}

function buildDeichman(
  random: () => number,
  roof: THREE.MeshBasicMaterial,
  twinkles: Twinkle[]
): THREE.Group {
  const deichman = new THREE.Group();
  const base = facadeMesh(
    5,
    5.6,
    4,
    makeTowerSkin(random, { cols: 7, floors: 6, warmth: 0.25, lit: 0.55 }),
    roof,
    twinkles,
    random
  );
  base.position.y = 2.8;
  deichman.add(base);

  const cantilever = facadeMesh(
    6.2,
    1.5,
    4.4,
    makeTowerSkin(random, { cols: 8, floors: 1, warmth: 0.2, lit: 0.85 }),
    roof,
    twinkles,
    random
  );
  cantilever.position.set(0.9, 5.05, 0);
  deichman.add(cantilever);

  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(6.2, 0.05, 0.07),
    new THREE.MeshBasicMaterial({ color: 0x7c92b4 })
  );
  edge.position.set(0.9, 5.82, 2.2);
  deichman.add(edge);

  return deichman;
}

function buildCrane(beacons: Beacon[]): THREE.Group {
  const crane = new THREE.Group();
  const steel = new THREE.MeshBasicMaterial({ color: 0x0a0c10 });
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.22, 7, 0.22), steel);
  mast.position.y = 3.5;
  const jib = new THREE.Mesh(new THREE.BoxGeometry(5, 0.16, 0.16), steel);
  jib.position.set(1.8, 6.9, 0);
  const counterJib = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.14, 0.14), steel);
  counterJib.position.set(-1.1, 6.9, 0);
  const cable = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.4, 0.04), steel);
  cable.position.set(3.6, 5.7, 0);

  const beaconMaterial = new THREE.MeshBasicMaterial({ color: 0xff4438 });
  const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), beaconMaterial);
  beacon.position.set(0, 7.08, 0);
  beacons.push({
    material: beaconMaterial,
    base: new THREE.Color(0xff4438),
    rate: 1.4 + Math.random() * 1.2,
    phase: Math.random() * Math.PI * 2
  });

  crane.add(mast, jib, counterJib, cable, beacon);
  return crane;
}

function buildFerry(scale: number): THREE.Group {
  const ferry = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.26, 0.5),
    new THREE.MeshBasicMaterial({ color: 0x0b0d11 })
  );
  hull.position.y = 0.14;
  const windows = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.15, 0.44),
    new THREE.MeshBasicMaterial({ color: 0xffd9a0 })
  );
  windows.position.set(-0.1, 0.36, 0);
  const cabinTop = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.08, 0.4),
    new THREE.MeshBasicMaterial({ color: 0x14171c })
  );
  cabinTop.position.set(-0.1, 0.48, 0);
  const navPort = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.07, 0.07),
    new THREE.MeshBasicMaterial({ color: 0xff5348 })
  );
  navPort.position.set(0.72, 0.3, 0.16);
  const navStarboard = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.07, 0.07),
    new THREE.MeshBasicMaterial({ color: 0x6fe08c })
  );
  navStarboard.position.set(0.72, 0.3, -0.16);
  const mastLight = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.06, 0.06),
    new THREE.MeshBasicMaterial({ color: 0xf2efe7 })
  );
  mastLight.position.set(-0.5, 0.62, 0);
  ferry.add(hull, windows, cabinTop, navPort, navStarboard, mastLight);
  ferry.scale.setScalar(scale);
  return ferry;
}

export function createCityscape(): Cityscape {
  const random = createRandom(20260818);
  const group = new THREE.Group();
  const twinkles: Twinkle[] = [];
  const beacons: Beacon[] = [];
  const reflections: Reflection[] = [];
  const roofMaterial = new THREE.MeshBasicMaterial({ color: 0x0b0d11 });

  // Sky dome backdrop.
  const skyCtx = makeContext(2048, 896);
  drawSky(skyCtx, random);
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(150, 66),
    new THREE.MeshBasicMaterial({ map: cityTexture(skyCtx.canvas, true) })
  );
  sky.position.set(0, 8, -71);
  group.add(sky);

  // Animated fjord surface.
  const waterBaseCtx = makeContext(WATER_TEX_W, WATER_TEX_H);
  drawWaterBase(waterBaseCtx);
  const waterCtx = makeContext(WATER_TEX_W, WATER_TEX_H);
  const waterTexture = new THREE.CanvasTexture(waterCtx.canvas);
  waterTexture.colorSpace = THREE.SRGBColorSpace;
  waterTexture.magFilter = THREE.LinearFilter;
  waterTexture.minFilter = THREE.LinearFilter;
  waterTexture.generateMipmaps = false;
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(WATER_RIGHT_X - WATER_LEFT_X, WATER_NEAR_Z - WATER_FAR_Z),
    new THREE.MeshBasicMaterial({ map: waterTexture })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(
    (WATER_LEFT_X + WATER_RIGHT_X) / 2,
    WATER_Y,
    (WATER_NEAR_Z + WATER_FAR_Z) / 2
  );
  group.add(water);

  // Quay below the window with street lamps and traffic.
  const quay = new THREE.Mesh(
    new THREE.BoxGeometry(100, 0.5, 2.8),
    new THREE.MeshBasicMaterial({ color: 0x0e1116 })
  );
  quay.position.set(0, -9.75, -12.2);
  group.add(quay);

  const promenadeEdge = new THREE.Mesh(
    new THREE.BoxGeometry(100, 0.05, 0.1),
    new THREE.MeshBasicMaterial({ color: 0x3d3526 })
  );
  promenadeEdge.position.set(0, -9.48, -13.5);
  group.add(promenadeEdge);

  const poleGeometry = new THREE.BoxGeometry(0.07, 1.15, 0.07);
  const poleMaterial = new THREE.MeshBasicMaterial({ color: 0x0a0c10 });
  const headGeometry = new THREE.BoxGeometry(0.16, 0.12, 0.16);
  const headMaterial = new THREE.MeshBasicMaterial({ color: 0xffd591 });
  for (let x = -30; x <= 30; x += 4) {
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.set(x, -8.93, -13.2);
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(x, -8.3, -13.2);
    group.add(pole, head);
  }

  type Car = { mesh: THREE.Mesh; lane: number; offset: number; speed: number; dir: 1 | -1 };
  const carGeometry = new THREE.BoxGeometry(0.24, 0.09, 0.11);
  const busGeometry = new THREE.BoxGeometry(0.56, 0.14, 0.13);
  const goldMaterial = new THREE.MeshBasicMaterial({ color: 0xffd98a });
  const redMaterial = new THREE.MeshBasicMaterial({ color: 0xff5040 });
  const cars: Car[] = [];
  for (let i = 0; i < 26; i += 1) {
    const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
    const isBus = i % 9 === 0;
    const mesh = new THREE.Mesh(isBus ? busGeometry : carGeometry, dir === 1 ? goldMaterial : redMaterial);
    mesh.position.y = -9.44;
    cars.push({
      mesh,
      lane: dir === 1 ? -11.9 : -12.6,
      offset: random() * 80,
      speed: 3.4 + random() * 4.2,
      dir
    });
    group.add(mesh);
  }

  // Waterfront mid-rises left and right, leaving the fjord open mid-frame.
  const midriseSpots: Array<[number, number, number, number]> = [
    [-25, -21, 5.2, 4.6],
    [-19.5, -20.5, 4.4, 3.8],
    [-14.5, -21.5, 4.8, 5.2],
    [13, -21, 4.6, 4.2],
    [18, -20.5, 5, 3.6],
    [23.5, -21.5, 4.2, 5]
  ];
  for (const [x, z, w, h] of midriseSpots) {
    const block = facadeMesh(
      w,
      h,
      3.4,
      makeTowerSkin(random, {
        cols: 6,
        floors: Math.max(3, Math.round(h * 1.1)),
        warmth: 0.75,
        lit: 0.5,
        shopfront: true
      }),
      roofMaterial,
      twinkles,
      random
    );
    block.position.set(x, WATER_Y + h / 2, z);
    group.add(block);
    reflections.push({
      x,
      color: "255, 213, 145",
      strength: 0.22,
      width: w * 6,
      reach: 0.3,
      phase: random() * Math.PI * 2
    });
  }

  // Barcode-like towers framing the view.
  const towerSpots: Array<[number, number, number, number]> = [
    [-24, -29, 3.4, 12],
    [-20.5, -28, 3, 9.5],
    [-17, -29.5, 3.2, 11],
    [-14, -28.5, 2.8, 8.5],
    [17, -29, 3, 9],
    [20.5, -28.5, 3.4, 10.5],
    [24, -29.5, 2.6, 7.5]
  ];
  for (const [x, z, w, h] of towerSpots) {
    const tower = facadeMesh(
      w,
      h,
      2.6,
      makeTowerSkin(random, {
        cols: 5 + Math.floor(random() * 3),
        floors: Math.round(h * 1.6),
        warmth: 0.45,
        lit: 0.58
      }),
      roofMaterial,
      twinkles,
      random
    );
    tower.position.set(x, WATER_Y + h / 2, z);
    group.add(tower);
    if (random() < 0.5) {
      const crownLight = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.94, 0.06, 0.08),
        new THREE.MeshBasicMaterial({ color: random() < 0.5 ? 0x9fb6de : 0xd9b878 })
      );
      crownLight.position.set(x, WATER_Y + h + 0.03, z + 1.22);
      group.add(crownLight);
    }
    reflections.push({
      x,
      color: random() < 0.5 ? "255, 213, 145" : "180, 202, 240",
      strength: 0.3,
      width: w * 5,
      reach: 0.42,
      phase: random() * Math.PI * 2
    });
  }

  // Landmarks.
  const opera = buildOpera(twinkles);
  opera.position.set(8, WATER_Y, -30);
  opera.rotation.y = 0.1;
  group.add(opera);
  reflections.push({ x: 8.6, color: "255, 224, 170", strength: 0.85, width: 52, reach: 0.55, phase: 0.4 });
  reflections.push({ x: 4.5, color: "236, 231, 216", strength: 0.35, width: 26, reach: 0.4, phase: 2.1 });

  const munch = buildMunch(random, roofMaterial, twinkles);
  munch.position.set(-10, WATER_Y, -34);
  munch.rotation.y = -0.06;
  group.add(munch);
  reflections.push({ x: -10, color: "190, 208, 240", strength: 0.6, width: 40, reach: 0.5, phase: 1.2 });

  const deichman = buildDeichman(random, roofMaterial, twinkles);
  deichman.position.set(-3.5, WATER_Y, -28);
  group.add(deichman);
  reflections.push({ x: -3.2, color: "196, 214, 244", strength: 0.3, width: 26, reach: 0.36, phase: 3.3 });

  // Moonlight column on the water, plus faint ambient sheets that keep
  // the mid-fjord from reading as a void.
  reflections.push({ x: MOON_X, color: "214, 222, 232", strength: 0.5, width: 30, reach: 0.95, phase: 0 });
  reflections.push({ x: -22, color: "150, 170, 205", strength: 0.16, width: 66, reach: 0.32, phase: 2.4 });
  reflections.push({ x: 26, color: "212, 190, 148", strength: 0.14, width: 72, reach: 0.3, phase: 0.9 });

  // Harbor cranes to the east.
  const craneA = buildCrane(beacons);
  craneA.position.set(27, WATER_Y, -36);
  const craneB = buildCrane(beacons);
  craneB.position.set(30.5, WATER_Y, -38);
  craneB.rotation.y = 0.7;
  group.add(craneA, craneB);

  // A low dark island with a couple of cabin lights.
  const island = new THREE.Mesh(
    new THREE.BoxGeometry(7, 0.9, 3.2),
    new THREE.MeshBasicMaterial({ color: 0x05070c })
  );
  island.position.set(-18, -9.6, -50);
  group.add(island);
  const cabinMaterial = new THREE.MeshBasicMaterial({ color: 0xffd591 });
  for (const dx of [-1.8, 0.4, 1.9]) {
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.14), cabinMaterial);
    cabin.position.set(-18 + dx, -9.06, -50 + (dx % 1.1));
    group.add(cabin);
  }

  // Boats: two ferries crossing, one docked, one floating sauna.
  const ferryA = buildFerry(1);
  const ferryB = buildFerry(0.55);
  group.add(ferryA, ferryB);

  const docked = buildFerry(0.8);
  docked.position.set(10.5, WATER_Y, -15.2);
  docked.rotation.y = 0.5;
  group.add(docked);
  reflections.push({ x: 10.5, color: "255, 217, 160", strength: 0.24, width: 14, reach: 0.14, phase: 4.2 });

  const sauna = new THREE.Group();
  const saunaHut = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.55, 0.9),
    new THREE.MeshBasicMaterial({ color: 0x171310 })
  );
  saunaHut.position.y = 0.35;
  const saunaWindow = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.16, 0.05),
    new THREE.MeshBasicMaterial({ color: 0xffb45e })
  );
  saunaWindow.position.set(0.18, 0.36, 0.46);
  const saunaChimney = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.3, 0.08),
    new THREE.MeshBasicMaterial({ color: 0x0a0c10 })
  );
  saunaChimney.position.set(-0.24, 0.75, 0);
  sauna.add(saunaHut, saunaWindow, saunaChimney);
  sauna.position.set(5.5, WATER_Y, -14.4);
  group.add(sauna);
  reflections.push({ x: 5.5, color: "255, 180, 94", strength: 0.2, width: 8, reach: 0.1, phase: 5.1 });

  // The She Lies sculpture, a marble iceberg on the water by the opera.
  const sheLies = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.1, 0.7),
    new THREE.MeshStandardMaterial({
      color: 0xdfe8f2,
      roughness: 0.2,
      metalness: 0.1,
      emissive: 0x8fa0b8,
      emissiveIntensity: 0.2
    })
  );
  sheLies.position.set(14, -9.5, -26);
  sheLies.rotation.set(0.35, 0.7, -0.22);
  group.add(sheLies);
  reflections.push({ x: 14, color: "214, 226, 240", strength: 0.2, width: 8, reach: 0.12, phase: 2.8 });

  // A late plane sliding across the sky.
  const plane = new THREE.Group();
  const fuselage = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.06, 0.06),
    new THREE.MeshBasicMaterial({ color: 0xd8dce2 })
  );
  const planeBeaconMaterial = new THREE.MeshBasicMaterial({ color: 0xff4438 });
  const planeBeacon = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), planeBeaconMaterial);
  planeBeacon.position.x = -0.12;
  plane.add(fuselage, planeBeacon);
  plane.position.set(-60, 16, -58);
  group.add(plane);
  beacons.push({ material: planeBeaconMaterial, base: new THREE.Color(0xff4438), rate: 3.2, phase: 0 });

  // Cool moonlight over the whole diorama.
  const moonLight = new THREE.DirectionalLight(0xc9d4e4, 1.1);
  moonLight.position.set(18, 26, -30);
  moonLight.target.position.set(0, -6, -28);
  group.add(moonLight, moonLight.target);

  let lastWaterDraw = -1;

  function drawWater(time: number): void {
    waterCtx.drawImage(waterBaseCtx.canvas, 0, 0);

    for (const column of reflections) {
      const cx = worldToWaterX(column.x);
      const segments = 26;
      const segmentH = (WATER_TEX_H * column.reach) / segments;
      for (let i = 0; i < segments; i += 1) {
        const y = i * segmentH;
        const fade = 1 - (i / segments) * 0.7;
        const sway = Math.sin(time * 1.1 + column.phase + i * 0.85) * (2 + i * 0.5);
        const flicker = 0.55 + 0.45 * Math.sin(time * 1.7 + column.phase * 2 + i * 1.4);
        const width = column.width * (0.35 + (i / segments) * 0.85) * (0.8 + 0.2 * flicker) * 0.12;
        waterCtx.fillStyle = `rgba(${column.color}, ${(column.strength * fade * flicker * 0.6).toFixed(3)})`;
        waterCtx.fillRect(cx + sway - width / 2, y, width, segmentH * 0.72);
      }
    }

    // Moon glitter: sparkles inside a cone widening toward the viewer.
    const moonCx = worldToWaterX(MOON_X);
    for (let i = 0; i < 90; i += 1) {
      const t = Math.random();
      const y = t * WATER_TEX_H;
      const cone = 5 + t * 70;
      const x = moonCx + (Math.random() - 0.5) * cone * 2;
      waterCtx.fillStyle = `rgba(222, 228, 238, ${0.08 + Math.random() * 0.22})`;
      waterCtx.fillRect(x, y, Math.random() < 0.2 ? 3 : 2, 1);
    }

    // General shimmer.
    for (let i = 0; i < 100; i += 1) {
      const y = Math.random() * WATER_TEX_H;
      waterCtx.fillStyle = `rgba(150, 168, 196, ${0.02 + Math.random() * 0.05})`;
      waterCtx.fillRect(Math.random() * WATER_TEX_W, y, 30 + Math.random() * 90, 1);
    }

    // Ferry wakes.
    for (const boat of [ferryA, ferryB]) {
      const bx = worldToWaterX(boat.position.x);
      const by = worldToWaterY(boat.position.z);
      const heading = boat.rotation.y > Math.PI / 2 ? 1 : -1;
      for (let i = 0; i < 12; i += 1) {
        const alpha = 0.14 * (1 - i / 12);
        waterCtx.fillStyle = `rgba(210, 220, 232, ${alpha.toFixed(3)})`;
        waterCtx.fillRect(bx + heading * i * 6, by + 2, 5, 1.5);
        waterCtx.fillRect(bx + heading * i * 6, by - 1 - i * 0.4, 4, 1);
        waterCtx.fillRect(bx + heading * i * 6, by + 5 + i * 0.4, 4, 1);
      }
    }

    waterTexture.needsUpdate = true;
  }

  function update(time: number): void {
    for (const car of cars) {
      const range = 80;
      const travel = (car.offset + time * car.speed) % range;
      const x = car.dir === 1 ? -40 + travel : 40 - travel;
      car.mesh.position.set(x, -9.44, car.lane);
    }

    ferryA.position.set(((time * 2.3) % 92) - 46, WATER_Y, -24 + Math.sin(time * 0.3) * 1.2);
    ferryA.rotation.y = Math.PI;
    ferryB.position.set(46 - ((time * 1.5) % 92), WATER_Y, -44 + Math.sin(time * 0.22 + 2) * 1.5);
    ferryB.rotation.y = 0;

    sauna.position.y = WATER_Y + Math.sin(time * 0.8) * 0.05;
    sheLies.rotation.y = 0.7 + Math.sin(time * 0.12) * 0.06;
    sheLies.position.y = -9.5 + Math.sin(time * 0.5) * 0.04;

    plane.position.x = -60 + ((time * 2.1) % 130);

    for (const twinkle of twinkles) {
      const level = 1 + Math.sin(time * twinkle.speed + twinkle.phase) * twinkle.depth;
      twinkle.material.color.setScalar(level);
    }

    for (const beacon of beacons) {
      const on = Math.sin(time * beacon.rate + beacon.phase) > 0.35;
      beacon.material.color.copy(beacon.base).multiplyScalar(on ? 1 : 0.08);
    }

    if (time - lastWaterDraw >= WATER_REDRAW_INTERVAL) {
      lastWaterDraw = time;
      drawWater(time);
    }
  }

  update(0);

  return { group, update };
}
