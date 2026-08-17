import * as THREE from "three";
import { createCityscape, type Cityscape } from "./cityscape";
import {
  makeArtTexture,
  makeGameTexture,
  makeMonitorTexture,
  makePaperTexture,
  makeRugTexture
} from "./textures";

export type RectCollider = { minX: number; maxX: number; minZ: number; maxZ: number };

export type BlinkingLed = {
  material: THREE.MeshStandardMaterial;
  phase: number;
  speed: number;
};

export type LightRig = {
  ambient: THREE.AmbientLight;
  hemisphere: THREE.HemisphereLight;
  fills: THREE.PointLight[];
  fillIntensities: number[];
};

export type RoomWorld = {
  scene: THREE.Scene;
  colliders: RectCollider[];
  bounds: RectCollider;
  leds: BlinkingLed[];
  printerPaper: THREE.Mesh;
  printerPaperHomeX: number;
  printerPaperTravelX: number;
  roomba: THREE.Group;
  cityscape: Cityscape;
  lighting: LightRig;
};

const colors = {
  floor: 0x342a1f,
  wall: 0x242424,
  trim: 0x1f1f1f,
  darkWood: 0x241d16,
  warmWood: 0x33281c,
  metal: 0x191a1c,
  slat: 0x101113,
  fabric: 0x35302a,
  cushionGold: 0xb59a55,
  cushionDark: 0x4a4238,
  curtain: 0x3a2f24,
  shade: 0x6a5636,
  leaf: 0x3d4a35,
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

function cylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  color: number,
  segments = 12
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    new THREE.MeshStandardMaterial({ color, roughness: 0.9 })
  );
  mesh.castShadow = true;
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

function lampShade(radiusTop: number, radiusBottom: number, height: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 12, 1, true),
    new THREE.MeshStandardMaterial({
      color: colors.shade,
      emissive: colors.accent,
      emissiveIntensity: 0.4,
      roughness: 1,
      side: THREE.DoubleSide
    })
  );
  mesh.castShadow = true;
  return mesh;
}

function buildShell(scene: THREE.Scene, cityscape: Cityscape): void {
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(8.4, 0.2, 7.4),
    new THREE.MeshStandardMaterial({ color: colors.floor, roughness: 0.96 })
  );
  floor.position.y = -0.1;
  floor.receiveShadow = true;
  scene.add(floor);

  const wallMaterial = new THREE.MeshStandardMaterial({ color: colors.wall, roughness: 0.95 });
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.3, 7.4), wallMaterial);
    wall.position.set(side * 4.1, 1.65, 0);
    wall.receiveShadow = true;
    scene.add(wall);

    const baseboard = box(0.07, 0.14, 7.4, colors.trim);
    baseboard.position.set(side * 3.97, 0.07, 0);
    scene.add(baseboard);
  }

  // The whole back wall is glass: sill, top beam, mullions, and a faint pane.
  const sill = box(8.4, 0.18, 0.2, colors.metal);
  sill.position.set(0, 0.09, -3.55);
  const beam = box(8.4, 0.16, 0.2, colors.metal);
  beam.position.set(0, 3.2, -3.55);
  scene.add(sill, beam);
  for (let i = 0; i <= 4; i += 1) {
    const mullion = box(0.1, 3.3, 0.14, colors.metal);
    mullion.position.set(-4.2 + i * 2.1, 1.65, -3.55);
    scene.add(mullion);
  }
  const pane = new THREE.Mesh(
    new THREE.PlaneGeometry(8.2, 3.0),
    new THREE.MeshBasicMaterial({
      color: 0x93a7c4,
      transparent: true,
      opacity: 0.05,
      depthWrite: false
    })
  );
  pane.position.set(0, 1.66, -3.52);
  scene.add(pane);

  // A string of warm little bulbs along the top of the glass.
  for (let i = 0; i < 20; i += 1) {
    const material = new THREE.MeshStandardMaterial({
      color: 0x111111,
      emissive: colors.accent,
      emissiveIntensity: 1.1
    });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), material);
    bulb.position.set(-4.18 + i * 0.44, 2.92 - (i % 2) * 0.05, -3.48);
    scene.add(bulb);
  }

  // Curtains gathered at both ends of the window wall.
  for (const side of [-1, 1]) {
    const curtain = box(0.42, 3.0, 0.36, colors.curtain, 1);
    curtain.position.set(side * 3.75, 1.52, -3.3);
    scene.add(curtain);
  }

  const city = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 8),
    new THREE.MeshBasicMaterial({ map: cityscape.texture, toneMapped: false })
  );
  city.position.set(0, 1.8, -6.8);
  scene.add(city);

  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 2.2),
    new THREE.MeshStandardMaterial({ map: makeRugTexture(), roughness: 1 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.9, 0.012, 1.6);
  rug.receiveShadow = true;
  scene.add(rug);

  // Framed prints on the side walls.
  const artSpots: Array<{ x: number; z: number; rotation: number; variant: "fjord" | "moon" | "grid" }> = [
    { x: -3.97, z: -0.35, rotation: Math.PI / 2, variant: "fjord" },
    { x: -3.97, z: 1.7, rotation: Math.PI / 2, variant: "grid" },
    { x: 3.97, z: 1.0, rotation: -Math.PI / 2, variant: "moon" }
  ];
  for (const spot of artSpots) {
    const frame = new THREE.Group();
    frame.position.set(spot.x, 2.0, spot.z);
    frame.rotation.y = spot.rotation;
    const border = box(0.52, 0.68, 0.04, colors.darkWood);
    const print = new THREE.Mesh(
      new THREE.PlaneGeometry(0.44, 0.6),
      new THREE.MeshStandardMaterial({ map: makeArtTexture(spot.variant), roughness: 1 })
    );
    print.position.z = 0.025;
    frame.add(border, print);
    scene.add(frame);
  }
}

function buildPlant(scene: THREE.Scene, x: number, z: number, scale: number, random: () => number): void {
  const plant = new THREE.Group();
  plant.position.set(x, 0, z);
  plant.scale.setScalar(scale);
  const pot = cylinder(0.18, 0.14, 0.26, colors.darkWood, 10);
  pot.position.y = 0.13;
  plant.add(pot);
  const leafMaterial = new THREE.MeshStandardMaterial({ color: colors.leaf, roughness: 0.95 });
  const stems = 4 + Math.floor(random() * 3);
  for (let i = 0; i < stems; i += 1) {
    const height = 0.3 + random() * 0.35;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.06, height, 0.06), leafMaterial);
    leaf.castShadow = true;
    const lx = (random() - 0.5) * 0.2;
    const lz = (random() - 0.5) * 0.2;
    leaf.position.set(lx, 0.24 + height / 2, lz);
    leaf.rotation.z = lx * 2.4;
    leaf.rotation.x = lz * 2.4;
    plant.add(leaf);
  }
  scene.add(plant);
}

/**
 * Home office / gaming setup against the left wall (bottom-left of the frame):
 * two monitors facing into the room, tower, desk lamp, led strip, chair.
 */
function buildHomeOffice(scene: THREE.Scene, leds: BlinkingLed[], random: () => number): void {
  const desk = new THREE.Group();
  desk.position.set(-3.5, 0, 1.7);

  const top = box(0.85, 0.07, 2.2, colors.warmWood);
  top.position.y = 0.75;
  desk.add(top);
  for (const [lx, lz] of [
    [-0.36, -1.02],
    [0.36, -1.02],
    [-0.36, 1.02],
    [0.36, 1.02]
  ]) {
    const leg = box(0.07, 0.72, 0.07, colors.metal);
    leg.position.set(lx, 0.36, lz);
    desk.add(leg);
  }

  // Two monitors: one terminal, one game paused since 1am.
  const screens: Array<{ z: number; angle: number; texture: THREE.CanvasTexture }> = [
    {
      z: -0.44,
      angle: Math.PI / 2 - 0.2,
      texture: makeMonitorTexture(["~/projects", "$ ls", "pixelwitness/", "cloudmount/", "shield-airplay/", "$ _"])
    },
    { z: 0.44, angle: Math.PI / 2 + 0.2, texture: makeGameTexture() }
  ];
  for (const config of screens) {
    const monitor = new THREE.Group();
    monitor.position.set(-0.16, 0.785, config.z);
    monitor.rotation.y = config.angle;

    const foot = box(0.3, 0.03, 0.2, colors.metal);
    const pole = box(0.05, 0.24, 0.05, colors.metal);
    pole.position.y = 0.13;
    const panel = box(0.62, 0.42, 0.04, colors.slat);
    panel.position.y = 0.36;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.56, 0.36),
      new THREE.MeshBasicMaterial({ map: config.texture })
    );
    screen.position.set(0, 0.36, 0.025);
    monitor.add(foot, pole, panel, screen);
    desk.add(monitor);
  }

  const keyboard = box(0.2, 0.03, 0.6, colors.slat);
  keyboard.position.set(0.24, 0.8, 0);
  desk.add(keyboard);
  const mouse = box(0.07, 0.025, 0.11, colors.slat);
  mouse.position.set(0.26, 0.8, 0.45);
  desk.add(mouse);

  const tower = box(0.5, 0.6, 0.28, colors.metal);
  tower.position.set(-0.05, 0.3, -1.1);
  desk.add(tower);
  const towerLed = ledMesh(0.035, leds, random);
  towerLed.position.set(0.21, 0.5, -1.1);
  towerLed.rotation.y = Math.PI / 2;
  desk.add(towerLed);

  // A warm led strip under the front edge of the desk.
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.03, 2.0),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: colors.accent, emissiveIntensity: 0.9 })
  );
  strip.position.set(0.41, 0.7, 0);
  desk.add(strip);

  // Articulated desk lamp at the back end of the desk.
  const lampBase = cylinder(0.07, 0.08, 0.03, colors.metal, 10);
  lampBase.position.set(-0.15, 0.8, -0.95);
  const lampArmLower = box(0.03, 0.32, 0.03, colors.metal);
  lampArmLower.position.set(-0.12, 0.95, -0.9);
  lampArmLower.rotation.x = -0.25;
  lampArmLower.rotation.z = 0.3;
  const lampArmUpper = box(0.03, 0.26, 0.03, colors.metal);
  lampArmUpper.position.set(-0.05, 1.14, -0.8);
  lampArmUpper.rotation.x = 0.6;
  lampArmUpper.rotation.z = -0.2;
  const lampHead = lampShade(0.05, 0.09, 0.12);
  lampHead.position.set(0, 1.2, -0.72);
  lampHead.rotation.x = -0.8;
  desk.add(lampBase, lampArmLower, lampArmUpper, lampHead);

  const deskLampLight = new THREE.PointLight(0xd6b45f, 14, 7);
  deskLampLight.position.set(0.1, 1.25, -0.7);
  desk.add(deskLampLight);

  // Desk clutter: a little plant and a mug that has gone cold.
  const deskPot = cylinder(0.05, 0.04, 0.08, colors.darkWood, 8);
  deskPot.position.set(-0.28, 0.82, 0.95);
  desk.add(deskPot);
  const leafMaterial = new THREE.MeshStandardMaterial({ color: colors.leaf, roughness: 0.95 });
  for (const [lx, lz, h] of [
    [-0.29, 0.93, 0.12],
    [-0.26, 0.96, 0.09],
    [-0.3, 0.97, 0.1]
  ]) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.025, h, 0.025), leafMaterial);
    leaf.castShadow = true;
    leaf.position.set(lx, 0.86 + h / 2, lz);
    desk.add(leaf);
  }
  const deskMug = cylinder(0.045, 0.045, 0.09, 0x98938a, 10);
  deskMug.position.set(0.28, 0.83, -0.5);
  desk.add(deskMug);

  // Warm glow spilling from the screens onto the chair.
  const screenGlow = new THREE.PointLight(0xd6b45f, 2.4, 3);
  screenGlow.position.set(0.7, 1.2, 0);
  desk.add(screenGlow);

  scene.add(desk);

  const chair = new THREE.Group();
  chair.position.set(-2.7, 0, 1.7);
  const seat = box(0.52, 0.07, 0.52, colors.fabric);
  seat.position.y = 0.46;
  const backrest = box(0.07, 0.58, 0.52, colors.fabric);
  backrest.position.set(0.24, 0.78, 0);
  const post = box(0.06, 0.44, 0.06, colors.metal);
  post.position.y = 0.22;
  const foot = box(0.44, 0.04, 0.44, colors.metal);
  foot.position.y = 0.02;
  chair.add(seat, backrest, post, foot);
  scene.add(chair);
}

function buildRack(scene: THREE.Scene, leds: BlinkingLed[], random: () => number): void {
  const rack = new THREE.Group();
  rack.position.set(-3.55, 0, -2.7);

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
  shelf.position.set(3.75, 0, -1.5);

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

/** Printer on a low cabinet right beside the home office desk. */
function buildPrinter(
  scene: THREE.Scene,
  leds: BlinkingLed[],
  random: () => number
): { paper: THREE.Mesh; homeX: number; travelX: number } {
  const station = new THREE.Group();
  station.position.set(-3.5, 0, -0.35);

  const cabinet = box(0.85, 0.72, 0.8, colors.darkWood);
  cabinet.position.y = 0.36;
  const body = box(0.6, 0.26, 0.52, colors.slat);
  body.position.y = 0.85;
  const lid = box(0.44, 0.06, 0.4, colors.metal);
  lid.position.y = 1.0;
  const slot = box(0.04, 0.03, 0.4, 0x050505);
  slot.position.set(0.31, 0.9, 0);
  station.add(cabinet, body, lid, slot);

  const led = ledMesh(0.03, leds, random);
  led.rotation.y = Math.PI / 2;
  led.position.set(0.31, 0.96, 0.18);
  station.add(led);

  scene.add(station);

  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.56),
    new THREE.MeshBasicMaterial({ map: makePaperTexture(), side: THREE.DoubleSide })
  );
  paper.rotation.x = -Math.PI / 2;
  paper.position.set(-3.15, 0.9, -0.35);
  paper.visible = false;
  scene.add(paper);

  return { paper, homeX: -3.15, travelX: 0.45 };
}

/** Coffee corner in the back-right, under the window's edge. */
function buildCoffee(scene: THREE.Scene, leds: BlinkingLed[], random: () => number): void {
  const corner = new THREE.Group();
  corner.position.set(3.5, 0, -3.0);

  const table = box(0.8, 0.72, 0.8, colors.darkWood);
  table.position.y = 0.36;
  const machine = box(0.32, 0.42, 0.32, colors.slat);
  machine.position.set(0.08, 0.93, 0);
  const spout = box(0.12, 0.06, 0.08, colors.metal);
  spout.position.set(-0.08, 0.82, 0);
  const mug = cylinder(0.05, 0.05, 0.09, colors.accent, 12);
  mug.position.set(-0.14, 0.77, 0.24);
  corner.add(table, machine, spout, mug);

  const led = ledMesh(0.028, leds, random);
  led.rotation.y = Math.PI / 2;
  led.position.set(-0.085, 1.05, 0);
  corner.add(led);

  scene.add(corner);
}

function buildSofaCorner(scene: THREE.Scene): void {
  // Sofa facing the window.
  const sofa = new THREE.Group();
  sofa.position.set(0.9, 0, 2.4);
  const base = box(1.9, 0.32, 0.9, colors.fabric, 1);
  base.position.y = 0.26;
  const backrest = box(2.3, 0.55, 0.22, colors.fabric, 1);
  backrest.position.set(0, 0.62, 0.34);
  sofa.add(base, backrest);
  for (const side of [-1, 1]) {
    const arm = box(0.2, 0.5, 0.9, colors.fabric, 1);
    arm.position.set(side * 1.05, 0.5, 0);
    sofa.add(arm);
  }
  for (const cx of [-0.46, 0.46]) {
    const cushion = box(0.86, 0.14, 0.78, 0x3c362f, 1);
    cushion.position.set(cx, 0.49, -0.02);
    sofa.add(cushion);
  }
  const pillowGold = box(0.32, 0.32, 0.12, colors.cushionGold, 1);
  pillowGold.position.set(-0.62, 0.66, 0.22);
  pillowGold.rotation.z = 0.18;
  const pillowDark = box(0.3, 0.3, 0.12, colors.cushionDark, 1);
  pillowDark.position.set(0.72, 0.65, 0.22);
  pillowDark.rotation.z = -0.14;
  sofa.add(pillowGold, pillowDark);
  scene.add(sofa);

  // Side table with a small warm table lamp.
  const sideTable = new THREE.Group();
  sideTable.position.set(2.5, 0, 2.5);
  const top = box(0.45, 0.04, 0.45, colors.warmWood);
  top.position.y = 0.5;
  sideTable.add(top);
  for (const [lx, lz] of [
    [-0.18, -0.18],
    [0.18, -0.18],
    [-0.18, 0.18],
    [0.18, 0.18]
  ]) {
    const leg = box(0.04, 0.5, 0.04, colors.darkWood);
    leg.position.set(lx, 0.25, lz);
    sideTable.add(leg);
  }
  const lampBase = cylinder(0.06, 0.07, 0.03, colors.metal, 10);
  lampBase.position.y = 0.54;
  const stem = cylinder(0.015, 0.015, 0.28, colors.metal, 8);
  stem.position.y = 0.68;
  const shade = lampShade(0.08, 0.12, 0.16);
  shade.position.y = 0.86;
  sideTable.add(lampBase, stem, shade);
  const tableLampLight = new THREE.PointLight(0xd6b45f, 7, 5);
  tableLampLight.position.y = 0.9;
  sideTable.add(tableLampLight);
  scene.add(sideTable);

  // Low coffee table on the rug with a stack of books and a mug.
  const coffeeTable = new THREE.Group();
  coffeeTable.position.set(0.9, 0, 1.0);
  const ctTop = box(1.0, 0.05, 0.5, colors.warmWood);
  ctTop.position.y = 0.32;
  coffeeTable.add(ctTop);
  for (const [lx, lz] of [
    [-0.44, -0.19],
    [0.44, -0.19],
    [-0.44, 0.19],
    [0.44, 0.19]
  ]) {
    const leg = box(0.05, 0.3, 0.05, colors.darkWood);
    leg.position.set(lx, 0.15, lz);
    coffeeTable.add(leg);
  }
  const bookA = box(0.22, 0.03, 0.15, 0x3f4a55);
  bookA.position.set(-0.2, 0.36, 0);
  bookA.rotation.y = 0.2;
  const bookB = box(0.2, 0.03, 0.14, colors.cushionGold);
  bookB.position.set(-0.19, 0.39, 0.01);
  bookB.rotation.y = -0.12;
  const ctMug = cylinder(0.04, 0.04, 0.08, 0x98938a, 10);
  ctMug.position.set(0.28, 0.38, 0.05);
  coffeeTable.add(bookA, bookB, ctMug);
  scene.add(coffeeTable);
}

function buildFloorLamp(scene: THREE.Scene): void {
  const lamp = new THREE.Group();
  lamp.position.set(-3.4, 0, 3.15);
  const base = cylinder(0.14, 0.16, 0.04, colors.metal, 12);
  base.position.y = 0.02;
  const pole = cylinder(0.02, 0.02, 1.5, colors.metal, 8);
  pole.position.y = 0.78;
  const shade = lampShade(0.11, 0.17, 0.24);
  shade.position.y = 1.62;
  lamp.add(base, pole, shade);
  const light = new THREE.PointLight(0xd6b45f, 10, 6.5);
  light.position.y = 1.52;
  lamp.add(light);
  scene.add(lamp);
}

function buildDoorMailAndSwitch(scene: THREE.Scene): void {
  const door = new THREE.Group();
  const panel = box(0.08, 2.08, 0.98, colors.darkWood);
  panel.position.set(3.96, 1.04, 2.5);
  const frameTop = box(0.1, 0.08, 1.14, colors.trim);
  frameTop.position.set(3.95, 2.12, 2.5);
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 10, 10),
    new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.4, metalness: 0.4 })
  );
  knob.position.set(3.89, 1.02, 2.12);
  door.add(panel, frameTop, knob);
  scene.add(door);

  const tray = new THREE.Group();
  const shelfBox = box(0.14, 0.06, 0.44, colors.darkWood);
  shelfBox.position.set(3.93, 1.12, 1.55);
  const lip = box(0.03, 0.1, 0.44, colors.darkWood);
  lip.position.set(3.87, 1.18, 1.55);
  const paper = box(0.1, 0.025, 0.34, colors.paperWhite);
  paper.position.set(3.92, 1.17, 1.55);
  tray.add(shelfBox, lip, paper);
  scene.add(tray);

  // Light switch between the door and the front edge of the room.
  const plate = box(0.05, 0.16, 0.1, 0x98938a);
  plate.position.set(3.96, 1.2, 3.2);
  const nub = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.05, 0.03),
    new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.5 })
  );
  nub.position.set(3.93, 1.2, 3.2);
  scene.add(plate, nub);
}

function buildRoomba(scene: THREE.Scene, leds: BlinkingLed[], random: () => number): THREE.Group {
  const roomba = new THREE.Group();
  roomba.position.set(0.9, 0, -0.8);
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

function buildLights(scene: THREE.Scene): LightRig {
  const ambient = new THREE.AmbientLight(0x6a6c74, 0.5);
  const hemisphere = new THREE.HemisphereLight(0x4a5266, 0x2a241c, 0.8);
  scene.add(ambient, hemisphere);

  // Cold moon-and-city light coming in through the glass wall.
  const moon = new THREE.DirectionalLight(0x8fa3c8, 1.6);
  moon.position.set(2, 5.5, -3.5);
  moon.target.position.set(-0.5, 0, 2);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.left = -6;
  moon.shadow.camera.right = 6;
  moon.shadow.camera.top = 6;
  moon.shadow.camera.bottom = -6;
  moon.shadow.camera.near = 0.5;
  moon.shadow.camera.far = 18;
  moon.shadow.bias = -0.002;
  scene.add(moon, moon.target);

  // Warm ceiling downlights; off by default, enabled by the light switch.
  const fillConfigs: Array<[number, number, number, number]> = [
    [0.3, 2.9, 1.2, 14],
    [-2.6, 2.9, -0.4, 11],
    [2.8, 2.9, 0.2, 11]
  ];
  const fills: THREE.PointLight[] = [];
  const fillIntensities: number[] = [];
  for (const [x, y, z, intensity] of fillConfigs) {
    const fill = new THREE.PointLight(0xffe2b8, 0, 16);
    fill.position.set(x, y, z);
    scene.add(fill);
    fills.push(fill);
    fillIntensities.push(intensity);
  }

  return { ambient, hemisphere, fills, fillIntensities };
}

export function buildWorld(): RoomWorld {
  const random = createRandom(4321);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  const cityscape = createCityscape();
  const leds: BlinkingLed[] = [];

  buildShell(scene, cityscape);
  buildHomeOffice(scene, leds, random);
  buildRack(scene, leds, random);
  buildShelf(scene, random);
  const printer = buildPrinter(scene, leds, random);
  buildCoffee(scene, leds, random);
  buildSofaCorner(scene);
  buildFloorLamp(scene);
  buildDoorMailAndSwitch(scene);
  buildPlant(scene, -2.2, -3.05, 1.15, random);
  buildPlant(scene, 1.8, -3.05, 0.85, random);
  const roomba = buildRoomba(scene, leds, random);
  const lighting = buildLights(scene);

  const colliders: RectCollider[] = [
    { minX: -4.0, maxX: -3.0, minZ: 0.5, maxZ: 2.9 }, // desk
    { minX: -3.0, maxX: -2.4, minZ: 1.4, maxZ: 2.0 }, // chair
    { minX: -4.0, maxX: -3.05, minZ: -0.8, maxZ: 0.1 }, // printer cabinet
    { minX: -4.0, maxX: -3.05, minZ: -3.3, maxZ: -2.1 }, // rack
    { minX: 3.4, maxX: 4.0, minZ: -2.65, maxZ: -0.35 }, // shelf
    { minX: 3.1, maxX: 3.9, minZ: -3.4, maxZ: -2.6 }, // coffee corner
    { minX: -0.35, maxX: 2.15, minZ: 1.9, maxZ: 3.0 }, // sofa
    { minX: 2.25, maxX: 2.75, minZ: 2.25, maxZ: 2.75 }, // side table
    { minX: 0.3, maxX: 1.5, minZ: 0.7, maxZ: 1.3 }, // coffee table (living)
    { minX: -3.6, maxX: -3.2, minZ: 2.95, maxZ: 3.35 }, // floor lamp
    { minX: -2.45, maxX: -1.95, minZ: -3.3, maxZ: -2.8 }, // big plant
    { minX: 1.55, maxX: 2.05, minZ: -3.3, maxZ: -2.8 } // small plant
  ];

  const bounds: RectCollider = { minX: -3.65, maxX: 3.65, minZ: -3.05, maxZ: 3.3 };

  return {
    scene,
    colliders,
    bounds,
    leds,
    printerPaper: printer.paper,
    printerPaperHomeX: printer.homeX,
    printerPaperTravelX: printer.travelX,
    roomba,
    cityscape,
    lighting
  };
}
