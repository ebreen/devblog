import * as THREE from "three";

/**
 * Animated night view of Oslo toward the fjord, seen from a high-rise window.
 * Drawn on a 2d canvas and used as a texture on a large plane behind the glass.
 * Layers, top to bottom: sky + stars + moon, the far side of the fjord, the
 * water (with a moon streak and a ferry), the waterfront skyline, and nearer
 * rooftops with streets full of moving car lights.
 */

const WIDTH = 1024;
const HEIGHT = 448;

const RIDGE_Y = 196;
const WATER_TOP = 214;
const WATER_BOTTOM = 282;
const CITY_BASE = 362;

type BuildingWindow = { x: number; y: number };

type Building = {
  x: number;
  width: number;
  height: number;
  windows: BuildingWindow[];
};

type Road = { y: number; slope: number };

type Car = {
  road: number;
  t: number;
  speed: number;
  dir: 1 | -1;
};

export type Cityscape = {
  texture: THREE.CanvasTexture;
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

function buildSkyline(random: () => number): Building[] {
  const buildings: Building[] = [];
  let x = -10;
  while (x < WIDTH + 10) {
    const width = 26 + Math.floor(random() * 34);
    const height = 34 + Math.floor(random() * 66);
    const windows: BuildingWindow[] = [];
    for (let wx = 5; wx < width - 6; wx += 7) {
      for (let wy = 8; wy < height - 6; wy += 9) {
        if (random() < 0.42) {
          windows.push({ x: x + wx, y: CITY_BASE - height + wy });
        }
      }
    }
    buildings.push({ x, width, height, windows });
    x += width + Math.floor(random() * 8);
  }
  return buildings;
}

function drawBase(ctx: CanvasRenderingContext2D, random: () => number, buildings: Building[]): void {
  const sky = ctx.createLinearGradient(0, 0, 0, RIDGE_Y + 30);
  sky.addColorStop(0, "#0a101d");
  sky.addColorStop(1, "#0e1526");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, RIDGE_Y);

  for (let i = 0; i < 110; i += 1) {
    const x = random() * WIDTH;
    const y = random() * (RIDGE_Y - 26);
    ctx.fillStyle = `rgba(239, 236, 227, ${0.18 + random() * 0.5})`;
    ctx.fillRect(x, y, random() < 0.12 ? 2 : 1, 1);
  }

  ctx.fillStyle = "rgba(239, 236, 227, 0.12)";
  ctx.beginPath();
  ctx.arc(838, 62, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8e4d8";
  ctx.beginPath();
  ctx.arc(838, 62, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(160, 158, 148, 0.5)";
  ctx.beginPath();
  ctx.arc(831, 56, 5, 0, Math.PI * 2);
  ctx.arc(845, 68, 3.4, 0, Math.PI * 2);
  ctx.fill();

  // Far side of the fjord: a dark ridge with a handful of faint lights.
  ctx.fillStyle = "#060910";
  ctx.beginPath();
  ctx.moveTo(0, WATER_TOP);
  for (let x = 0; x <= WIDTH; x += 64) {
    ctx.lineTo(x, RIDGE_Y - random() * 14);
  }
  ctx.lineTo(WIDTH, WATER_TOP);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 26; i += 1) {
    ctx.fillStyle = `rgba(214, 180, 95, ${0.12 + random() * 0.3})`;
    ctx.fillRect(random() * WIDTH, RIDGE_Y - 4 - random() * 8, 1.5, 1.5);
  }

  const water = ctx.createLinearGradient(0, WATER_TOP, 0, WATER_BOTTOM);
  water.addColorStop(0, "#0a111d");
  water.addColorStop(1, "#0c1420");
  ctx.fillStyle = water;
  ctx.fillRect(0, WATER_TOP, WIDTH, WATER_BOTTOM - WATER_TOP);

  // Waterfront skyline between the water and the near rooftops.
  ctx.fillStyle = "#04060c";
  ctx.fillRect(0, WATER_BOTTOM, WIDTH, CITY_BASE - WATER_BOTTOM);
  for (const building of buildings) {
    ctx.fillStyle = "#03040a";
    ctx.fillRect(building.x, CITY_BASE - building.height, building.width, building.height);
  }

  // Nearer rooftops in the foreground, seen from above.
  ctx.fillStyle = "#020307";
  ctx.fillRect(0, CITY_BASE, WIDTH, HEIGHT - CITY_BASE);
  for (let i = 0; i < 30; i += 1) {
    const x = random() * WIDTH;
    const y = CITY_BASE + 6 + random() * (HEIGHT - CITY_BASE - 20);
    const w = 30 + random() * 70;
    const h = 10 + random() * 22;
    ctx.fillStyle = i % 3 === 0 ? "#05070d" : "#04050a";
    ctx.fillRect(x, y, w, h);
  }
}

export function createCityscape(): Cityscape {
  const random = createRandom(20260817);
  const buildings = buildSkyline(random);

  const base = makeContext(WIDTH, HEIGHT);
  drawBase(base, random, buildings);

  const ctx = makeContext(WIDTH, HEIGHT);
  const texture = new THREE.CanvasTexture(ctx.canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;

  const allWindows: BuildingWindow[] = buildings.flatMap((building) => building.windows);
  const windowLit = allWindows.map(() => random() < 0.8);
  let nextTwinkle = 0;

  const roads: Road[] = [
    { y: 388, slope: -6 },
    { y: 412, slope: 4 },
    { y: 436, slope: 0 }
  ];

  const cars: Car[] = [];
  for (let i = 0; i < 34; i += 1) {
    cars.push({
      road: i % roads.length,
      t: random(),
      speed: 0.016 + random() * 0.05,
      dir: random() < 0.5 ? 1 : -1
    });
  }

  const beacons = [
    { x: 236, y: WATER_BOTTOM - 88, rate: 1.6 },
    { x: 654, y: WATER_BOTTOM - 72, rate: 2.3 }
  ];

  let lastTime = 0;

  function update(time: number): void {
    const dt = Math.min(0.2, Math.max(0, time - lastTime));
    lastTime = time;

    ctx.drawImage(base.canvas, 0, 0);

    // Lit building windows, with the occasional one flipping on or off.
    if (time > nextTwinkle) {
      nextTwinkle = time + 0.7;
      for (let i = 0; i < 3; i += 1) {
        const index = Math.floor(Math.random() * windowLit.length);
        windowLit[index] = !windowLit[index];
      }
    }
    for (let i = 0; i < allWindows.length; i += 1) {
      if (!windowLit[i]) continue;
      const w = allWindows[i];
      ctx.fillStyle = i % 7 === 0 ? "rgba(239, 236, 227, 0.75)" : "rgba(214, 180, 95, 0.7)";
      ctx.fillRect(w.x, w.y, 3, 4);
    }

    // Moon streak shimmering on the fjord.
    for (let i = 0; i < 14; i += 1) {
      const y = WATER_TOP + 4 + i * 4.6;
      const sway = Math.sin(time * 1.4 + i * 1.7) * (3 + i * 0.6);
      const width = 8 + Math.sin(time * 2.1 + i) * 4 + i * 1.4;
      ctx.fillStyle = `rgba(212, 216, 222, ${0.1 - i * 0.005})`;
      ctx.fillRect(838 + sway - width / 2, y, width, 2);
    }

    // A ferry crossing toward the fjord islands, with a dim wake.
    const ferryX = ((time * 11) % (WIDTH + 160)) - 80;
    const ferryY = WATER_TOP + 34;
    ctx.fillStyle = "rgba(214, 180, 95, 0.25)";
    ctx.fillRect(ferryX - 16, ferryY + 3, 16, 1.5);
    ctx.fillStyle = "#0a0d14";
    ctx.fillRect(ferryX, ferryY - 2, 14, 4);
    ctx.fillStyle = "#d6b45f";
    ctx.fillRect(ferryX + 2, ferryY - 1, 2, 2);
    ctx.fillRect(ferryX + 9, ferryY - 1, 2, 2);

    // Aviation beacons on the tallest cranes.
    for (const beacon of beacons) {
      ctx.strokeStyle = "#05070d";
      ctx.beginPath();
      ctx.moveTo(beacon.x, beacon.y + 60);
      ctx.lineTo(beacon.x, beacon.y);
      ctx.lineTo(beacon.x + 26, beacon.y + 8);
      ctx.stroke();
      if (Math.sin(time * beacon.rate) > 0.55) {
        ctx.fillStyle = "#d6503c";
        ctx.fillRect(beacon.x - 2, beacon.y - 2, 4, 4);
      }
    }

    // Car lights on the streets below: gold one way, red the other.
    for (const car of cars) {
      car.t += car.speed * car.dir * dt;
      if (car.t > 1.1) car.t = -0.1;
      if (car.t < -0.1) car.t = 1.1;
      const road = roads[car.road];
      const x = car.t * WIDTH;
      const y = road.y + (x / WIDTH) * road.slope + (car.dir === 1 ? 0 : 4);
      ctx.fillStyle = car.dir === 1 ? "rgba(239, 230, 201, 0.9)" : "rgba(214, 80, 60, 0.85)";
      ctx.fillRect(x, y, 4, 2);
      ctx.fillStyle = car.dir === 1 ? "rgba(239, 230, 201, 0.25)" : "rgba(214, 80, 60, 0.25)";
      ctx.fillRect(x - car.dir * 4, y, 4, 2);
    }

    texture.needsUpdate = true;
  }

  update(0);

  return { texture, update };
}
