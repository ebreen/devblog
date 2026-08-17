import * as THREE from "three";
import { createCityscape, type Cityscape } from "./cityscape";
import { makeMonitorTexture, makePaperTexture, makeRugTexture } from "./textures";

export type RectCollider = { minX: number; maxX: number; minZ: number; maxZ: number };

export type BlinkingLed = {
  material: THREE.MeshStandardMaterial;
  phase: number;
  speed: number;
};

export type RoomWorld = {
  scene: THREE.Scene;
  colliders: RectCollider[];
  bounds: RectCollider;
  leds: BlinkingLed[];
  printerPaper: THREE.Mesh;
  printerPaperHomeX: number;
  roomba: THREE.Group;
  cityscape: Cityscape;
};

const colors = {
  floor: 0x191410,
  wall: 0x121212,
  trim: 0x1f1f1f,
  darkWood: 0x241d16,
  metal: 0x191a1c,
  slat: 0x101113,
  fabric: 0x2b2926,
  accent: 0xd6b45f,
  paperWhite: 0xe9e5da
};

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function box(
  width: number,
  height: number,
  depth: number,
  color: number,
  roughness = 0.92
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, roughness })
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function ledMesh(size: number, leds: BlinkingLed[], random: () => number, color = colors.accent): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({
    color: 0x111111,
    emissive: color,
    emissiveIntensity: 1
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size / 2), material);
  leds.push({ material, phase: random() * Math.PI * 2, speed: 1.5 + random() * 4 });
  return mesh;
}

function buildShell(scene: THREE.Scene, cityscape: Cityscape): void {
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(14.4, 0.2, 10.4),
    new THREE.MeshStandardMaterial({ color: colors.floor, roughness: 0.96 })
  );
  floor.position.y = -0.1;
  floor.receiveShadow = true;
  scene.add(floor);

  const wallMaterial = new THREE.MeshStandardMaterial({ color: colors.wall, roughness: 0.95 });
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.3, 10.4), wallMaterial);
  leftWall.position.set(-7.1, 1.65, 0);
  leftWall.receiveShadow = true;
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.3, 10.4), wallMaterial);
  rightWall.position.set(7.1, 1.65, 0);
  rightWall.receiveShadow = true;
  scene.add(leftWall, rightWall);

  for (const side of [-1, 1]) {
    const baseboard = box(0.07, 0.14, 10.4, colors.trim);
    baseboard.position.set(side * 6.97, 0.07, 0);
    scene.add(baseboard);
  }

  // The whole back wall is glass: sill, top beam, mullions, and a faint pane.
  const sill = box(14.4, 0.18, 0.2, colors.metal);
  sill.position.set(0, 0.09, -5.05);
  const beam = box(14.4, 0.16, 0.2, colors.metal);
  beam.position.set(0, 3.2, -5.05);
  scene.add(sill, beam);
  for (let i = 0; i <= 5; i += 1) {
    const mullion = box(0.1, 3.3, 0.14, colors.metal);
    mullion.position.set(-7.05 + i * 2.82, 1.65, -5.05);
    scene.add(mullion);
  }
  const pane = new THREE.Mesh(
    new THREE.PlaneGeometry(14.2, 3.0),
    new THREE.MeshBasicMaterial({
      color: 0x93a7c4,
      transparent: true,
      opacity: 0.05,
      depthWrite: false
    })
  );
  pane.position.set(0, 1.66, -5.02);
  scene.add(pane);

  const city = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 10.5),
    new THREE.MeshBasicMaterial({ map: cityscape.texture, toneMapped: false })
  );
  city.position.set(0, 2.1, -9.2);
  scene.add(city);

  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 3),
    new THREE.MeshStandardMaterial({ map: makeRugTexture(), roughness: 1 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.3, 0.012, 1);
  rug.receiveShadow = true;
  scene.add(rug);
}

function buildDesk(scene: THREE.Scene, leds: BlinkingLed[], random: () => number): void {
  const desk = new THREE.Group();
  desk.position.set(-2.6, 0, -3.9);

  const top = box(2.8, 0.07, 1.0, colors.darkWood);
  top.position.y = 0.75;
  desk.add(top);
  for (const [lx, lz] of [
    [-1.32, -0.42],
    [1.32, -0.42],
    [-1.32, 0.42],
    [1.32, 0.42]
  ]) {
    const leg = box(0.07, 0.72, 0.07, colors.metal);
    leg.position.set(lx, 0.36, lz);
    desk.add(leg);
  }

  // Monitors face the window; the side ones are angled so a sliver of screen
  // catches the camera.
  const screens = [
    { x: -0.82, angle: Math.PI - 0.55, lines: ["~/projects", "$ ls", "pixelwitness/", "cloudmount/", "shield-airplay/", "$ _"] },
    { x: 0, angle: Math.PI, lines: ["$ uptime", " 23:41, up 47 days", "$ ssh rack", "welcome back."] },
    { x: 0.82, angle: Math.PI + 0.55, lines: ["# todo", "- fix the roomba", "- write blog post", "- touch grass (later)"] }
  ];
  for (const config of screens) {
    const monitor = new THREE.Group();
    monitor.position.set(config.x, 0.785, -0.18);
    monitor.rotation.y = config.angle;

    const foot = box(0.3, 0.03, 0.2, colors.metal);
    const pole = box(0.05, 0.24, 0.05, colors.metal);
    pole.position.y = 0.13;
    const panel = box(0.62, 0.42, 0.04, colors.slat);
    panel.position.y = 0.36;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.56, 0.36),
      new THREE.MeshBasicMaterial({ map: makeMonitorTexture(config.lines) })
    );
    screen.position.set(0, 0.36, 0.025);
    monitor.add(foot, pole, panel, screen);
    desk.add(monitor);
  }

  const keyboard = box(0.6, 0.03, 0.2, colors.slat);
  keyboard.position.set(0, 0.8, 0.22);
  desk.add(keyboard);

  const tower = box(0.28, 0.6, 0.52, colors.metal);
  tower.position.set(1.05, 0.3, 0.1);
  desk.add(tower);
  const towerLed = ledMesh(0.035, leds, random);
  towerLed.position.set(1.05, 0.5, 0.38);
  desk.add(towerLed);

  // Warm glow spilling from the screens onto the chair.
  const screenGlow = new THREE.PointLight(0xd6b45f, 2.4, 3);
  screenGlow.position.set(0, 1.2, 0.6);
  desk.add(screenGlow);

  scene.add(desk);

  const chair = new THREE.Group();
  chair.position.set(-2.6, 0, -2.85);
  const seat = box(0.52, 0.07, 0.52, colors.fabric);
  seat.position.y = 0.46;
  const backrest = box(0.52, 0.58, 0.07, colors.fabric);
  backrest.position.set(0, 0.78, 0.24);
  const post = box(0.06, 0.44, 0.06, colors.metal);
  post.position.y = 0.22;
  const foot = box(0.44, 0.04, 0.44, colors.metal);
  foot.position.y = 0.02;
  chair.add(seat, backrest, post, foot);
  scene.add(chair);
}

function buildRack(scene: THREE.Scene, leds: BlinkingLed[], random: () => number): void {
  const rack = new THREE.Group();
  rack.position.set(-6.55, 0, -2.2);

  const body = box(0.9, 2.1, 1.2, colors.metal);
  body.position.y = 1.05;
  rack.add(body);

  for (let i = 0; i < 6; i += 1) {
    const slat = box(0.03, 0.22, 1.06, colors.slat);
    slat.position.set(0.465, 0.32 + i * 0.29, 0);
    rack.add(slat);
    for (let l = 0; l < 3; l += 1) {
      const led = ledMesh(0.03, leds, random, l === 2 && i % 2 === 0 ? 0x98938a : colors.accent);
      led.rotation.y = Math.PI / 2;
      led.position.set(0.485, 0.32 + i * 0.29 + 0.05, 0.38 - l * 0.12);
      rack.add(led);
    }
  }

  const glow = new THREE.PointLight(0xd6b45f, 1.8, 3.4);
  glow.position.set(0.9, 1.1, 0);
  rack.add(glow);

  scene.add(rack);
}

function buildShelf(scene: THREE.Scene, random: () => number): void {
  const shelf = new THREE.Group();
  shelf.position.set(6.65, 0, -2);

  const backPanel = box(0.06, 2.25, 2.3, colors.darkWood);
  backPanel.position.set(0.2, 1.12, 0);
  shelf.add(backPanel);
  for (const sz of [-1.12, 1.12]) {
    const side = box(0.46, 2.25, 0.05, colors.darkWood);
    side.position.set(0, 1.12, sz);
    shelf.add(side);
  }

  const bookColors = [0x4f4a42, 0x5c544a, 0x3f4a55, 0x554438, 0x6b5d4f, 0x98938a, 0xd6b45f];
  for (let level = 0; level < 4; level += 1) {
    const surfaceY = 0.28 + level * 0.55;
    const plank = box(0.42, 0.045, 2.2, colors.darkWood);
    plank.position.set(0, surfaceY, 0);
    shelf.add(plank);

    let bz = -1.02;
    while (bz < 0.95) {
      if (random() < 0.16) {
        bz += 0.14 + random() * 0.1;
        continue;
      }
      const thickness = 0.045 + random() * 0.05;
      const height = 0.24 + random() * 0.13;
      const color = bookColors[Math.floor(random() * bookColors.length)];
      const book = box(0.3, height, thickness, color);
      book.position.set(-0.02, surfaceY + height / 2 + 0.023, bz + thickness / 2);
      shelf.add(book);
      bz += thickness + 0.012;
    }
  }

  scene.add(shelf);
}

function buildPrinter(
  scene: THREE.Scene,
  leds: BlinkingLed[],
  random: () => number
): { paper: THREE.Mesh; homeX: number } {
  const station = new THREE.Group();
  station.position.set(6.5, 0, 0.9);

  const cabinet = box(0.8, 0.72, 0.95, colors.darkWood);
  cabinet.position.y = 0.36;
  const body = box(0.52, 0.26, 0.6, colors.slat);
  body.position.y = 0.85;
  const lid = box(0.4, 0.06, 0.44, colors.metal);
  lid.position.y = 1.0;
  const slot = box(0.4, 0.03, 0.04, 0x050505);
  slot.position.set(-0.27, 0.9, 0);
  station.add(cabinet, body, lid, slot);

  const led = ledMesh(0.03, leds, random);
  led.rotation.y = -Math.PI / 2;
  led.position.set(-0.27, 0.96, 0.18);
  station.add(led);

  scene.add(station);

  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.56),
    new THREE.MeshBasicMaterial({ map: makePaperTexture(), side: THREE.DoubleSide })
  );
  paper.rotation.x = -Math.PI / 2;
  paper.rotation.z = Math.PI / 2;
  paper.position.set(6.2, 0.9, 0.9);
  paper.visible = false;
  scene.add(paper);

  return { paper, homeX: 6.2 };
}

function buildCoffee(scene: THREE.Scene, leds: BlinkingLed[], random: () => number): void {
  const corner = new THREE.Group();
  corner.position.set(-6.4, 0, 1.6);

  const table = box(0.8, 0.72, 0.8, colors.darkWood);
  table.position.y = 0.36;
  const machine = box(0.32, 0.42, 0.32, colors.slat);
  machine.position.set(-0.08, 0.93, 0);
  const spout = box(0.08, 0.06, 0.12, colors.metal);
  spout.position.set(-0.08, 0.82, 0.16);
  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.09, 12),
    new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.7 })
  );
  mug.castShadow = true;
  mug.position.set(0.24, 0.77, 0.14);
  corner.add(table, machine, spout, mug);

  const led = ledMesh(0.028, leds, random);
  led.position.set(-0.08, 1.05, 0.165);
  corner.add(led);

  scene.add(corner);
}

function buildDoorAndMail(scene: THREE.Scene): void {
  const door = new THREE.Group();
  const panel = box(0.08, 2.08, 0.98, colors.darkWood);
  panel.position.set(6.95, 1.04, 3.5);
  const frameTop = box(0.1, 0.08, 1.14, colors.trim);
  frameTop.position.set(6.94, 2.12, 3.5);
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 10, 10),
    new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.4, metalness: 0.4 })
  );
  knob.position.set(6.88, 1.02, 3.12);
  door.add(panel, frameTop, knob);
  scene.add(door);

  const tray = new THREE.Group();
  const shelfBox = box(0.14, 0.06, 0.44, colors.darkWood);
  shelfBox.position.set(6.92, 1.12, 2.25);
  const lip = box(0.03, 0.1, 0.44, colors.darkWood);
  lip.position.set(6.86, 1.18, 2.25);
  const paper = box(0.1, 0.025, 0.34, colors.paperWhite);
  paper.position.set(6.91, 1.17, 2.25);
  tray.add(shelfBox, lip, paper);
  scene.add(tray);
}

function buildPlant(scene: THREE.Scene): void {
  const plant = new THREE.Group();
  plant.position.set(5.5, 0, -4.3);
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.14, 0.26, 10),
    new THREE.MeshStandardMaterial({ color: colors.darkWood, roughness: 0.95 })
  );
  pot.castShadow = true;
  pot.position.y = 0.13;
  plant.add(pot);
  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x3d4a35, roughness: 0.95 });
  for (const [x, y, z, h] of [
    [0, 0.5, 0, 0.5],
    [0.09, 0.42, 0.06, 0.34],
    [-0.08, 0.44, -0.05, 0.38],
    [0.02, 0.38, -0.1, 0.28]
  ]) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, 0.06), leafMaterial);
    leaf.castShadow = true;
    leaf.position.set(x, y, z);
    leaf.rotation.z = x * 2;
    leaf.rotation.x = z * 2;
    plant.add(leaf);
  }
  scene.add(plant);
}

function buildRoomba(scene: THREE.Scene, leds: BlinkingLed[], random: () => number): THREE.Group {
  const roomba = new THREE.Group();
  roomba.position.set(1.6, 0, 1.8);
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.09, 18),
    new THREE.MeshStandardMaterial({ color: colors.metal, roughness: 0.85 })
  );
  body.castShadow = true;
  body.position.y = 0.045;
  const bumper = box(0.06, 0.06, 0.3, colors.slat);
  bumper.position.set(0.2, 0.05, 0);
  const led = ledMesh(0.03, leds, random);
  led.position.set(0, 0.1, 0);
  roomba.add(body, bumper, led);
  scene.add(roomba);
  return roomba;
}

function buildLights(scene: THREE.Scene): void {
  scene.add(new THREE.HemisphereLight(0x2e3442, 0x0b0a09, 0.85));

  // Cold moon-and-city light coming in through the glass wall.
  const moon = new THREE.DirectionalLight(0x8fa3c8, 1.35);
  moon.position.set(2, 5.5, -4.5);
  moon.target.position.set(-0.5, 0, 2);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.left = -9;
  moon.shadow.camera.right = 9;
  moon.shadow.camera.top = 9;
  moon.shadow.camera.bottom = -9;
  moon.shadow.camera.near = 0.5;
  moon.shadow.camera.far = 20;
  moon.shadow.bias = -0.002;
  scene.add(moon, moon.target);

  const lamp = new THREE.PointLight(0xd6b45f, 9, 6.5);
  lamp.position.set(-4.1, 1.6, -3.7);
  scene.add(lamp);

  const fill = new THREE.PointLight(0xffe2b8, 2.4, 15);
  fill.position.set(0.5, 3.3, 1.8);
  scene.add(fill);
}

export function buildWorld(): RoomWorld {
  const random = createRandom(4321);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  const cityscape = createCityscape();
  const leds: BlinkingLed[] = [];

  buildShell(scene, cityscape);
  buildDesk(scene, leds, random);
  buildRack(scene, leds, random);
  buildShelf(scene, random);
  const printer = buildPrinter(scene, leds, random);
  buildCoffee(scene, leds, random);
  buildDoorAndMail(scene);
  buildPlant(scene);
  const roomba = buildRoomba(scene, leds, random);
  buildLights(scene);

  const colliders: RectCollider[] = [
    { minX: -4.1, maxX: -1.1, minZ: -4.5, maxZ: -3.35 }, // desk
    { minX: -2.95, maxX: -2.25, minZ: -3.2, maxZ: -2.55 }, // chair
    { minX: -7, maxX: -6.0, minZ: -2.9, maxZ: -1.5 }, // rack
    { minX: -6.9, maxX: -5.9, minZ: 1.1, maxZ: 2.1 }, // coffee table
    { minX: 6.3, maxX: 7, minZ: -3.25, maxZ: -0.75 }, // shelf
    { minX: 6.0, maxX: 7, minZ: 0.35, maxZ: 1.45 }, // printer cabinet
    { minX: 5.2, maxX: 5.8, minZ: -4.6, maxZ: -4.0 } // plant
  ];

  const bounds: RectCollider = { minX: -6.6, maxX: 6.6, minZ: -4.5, maxZ: 4.7 };

  return {
    scene,
    colliders,
    bounds,
    leds,
    printerPaper: printer.paper,
    printerPaperHomeX: printer.homeX,
    roomba,
    cityscape
  };
}
