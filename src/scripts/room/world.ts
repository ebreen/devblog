import * as THREE from "three";
import { createCityscape, type Cityscape } from "./cityscape";
import {
  makeArtTexture,
  makeFloorTexture,
  makeMonitorTexture,
  makePaperTexture,
  makeRugTexture,
  makeTvTexture
} from "./textures";

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
  printerPaperTravelX: number;
  roomba: THREE.Group;
  cityscape: Cityscape;
  /** Toggle the ceiling lights. The default state is off (cozy lamp light only). */
  setLights(on: boolean): void;
};

const colors = {
  wall: 0x242424,
  trim: 0x1f1f1f,
  darkWood: 0x241d16,
  warmWood: 0x33281c,
  counterTop: 0x4a3a28,
  metal: 0x191a1c,
  slat: 0x101113,
  fabric: 0x35302a,
  cushionGold: 0xb59a55,
  cushionDark: 0x4a4238,
  cream: 0xd8cdb8,
  curtain: 0x3a2f24,
  shade: 0x6a5636,
  leaf: 0x3d4a35,
  clay: 0x8a6d3f,
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

function ledMesh(
  size: number,
  leds: BlinkingLed[],
  random: () => number,
  color = colors.accent,
  speed?: number
): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({
    color: 0x111111,
    emissive: color,
    emissiveIntensity: 1
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size / 2), material);
  leds.push({ material, phase: random() * Math.PI * 2, speed: speed ?? 1.5 + random() * 4 });
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

function miniPlant(x: number, y: number, z: number, scale: number, random: () => number): THREE.Group {
  const plant = new THREE.Group();
  plant.position.set(x, y, z);
  plant.scale.setScalar(scale);
  const pot = cylinder(0.09, 0.07, 0.12, colors.darkWood, 8);
  pot.position.y = 0.06;
  plant.add(pot);
  const leafMaterial = new THREE.MeshStandardMaterial({ color: colors.leaf, roughness: 0.95 });
  const stems = 3 + Math.floor(random() * 3);
  for (let i = 0; i < stems; i += 1) {
    const height = 0.14 + random() * 0.18;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.035, height, 0.035), leafMaterial);
    leaf.castShadow = true;
    const lx = (random() - 0.5) * 0.1;
    const lz = (random() - 0.5) * 0.1;
    leaf.position.set(lx, 0.1 + height / 2, lz);
    leaf.rotation.z = lx * 3;
    leaf.rotation.x = lz * 3;
    plant.add(leaf);
  }
  return plant;
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
    const height = 0.35 + random() * 0.4;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.06, height, 0.06), leafMaterial);
    leaf.castShadow = true;
    const lx = (random() - 0.5) * 0.22;
    const lz = (random() - 0.5) * 0.22;
    leaf.position.set(lx, 0.24 + height / 2, lz);
    leaf.rotation.z = lx * 2.4;
    leaf.rotation.x = lz * 2.4;
    plant.add(leaf);
  }
  scene.add(plant);
}

function buildShell(scene: THREE.Scene, cityscape: Cityscape): void {
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(9.4, 0.2, 7.4),
    new THREE.MeshStandardMaterial({ map: makeFloorTexture(), roughness: 0.96 })
  );
  floor.position.y = -0.1;
  floor.receiveShadow = true;
  scene.add(floor);

  const wallMaterial = new THREE.MeshStandardMaterial({ color: colors.wall, roughness: 0.95 });
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.3, 7.4), wallMaterial);
    wall.position.set(side * 4.6, 1.65, 0);
    wall.receiveShadow = true;
    scene.add(wall);

    const baseboard = box(0.07, 0.14, 7.4, colors.trim);
    baseboard.position.set(side * 4.47, 0.07, 0);
    scene.add(baseboard);
  }

  // The whole back wall is glass: sill, top beam, mullions, and a faint pane.
  const sill = box(9.4, 0.18, 0.2, colors.metal);
  sill.position.set(0, 0.09, -3.6);
  const beam = box(9.4, 0.16, 0.2, colors.metal);
  beam.position.set(0, 3.2, -3.6);
  scene.add(sill, beam);
  for (let i = 0; i <= 4; i += 1) {
    const mullion = box(0.1, 3.3, 0.14, colors.metal);
    mullion.position.set(-4.6 + i * 2.3, 1.65, -3.6);
    scene.add(mullion);
  }
  const pane = new THREE.Mesh(
    new THREE.PlaneGeometry(9.2, 3.0),
    new THREE.MeshBasicMaterial({
      color: 0x93a7c4,
      transparent: true,
      opacity: 0.05,
      depthWrite: false
    })
  );
  pane.position.set(0, 1.66, -3.57);
  scene.add(pane);

  // A string of warm little bulbs along the top of the glass.
  for (let i = 0; i < 21; i += 1) {
    const material = new THREE.MeshStandardMaterial({
      color: 0x111111,
      emissive: colors.accent,
      emissiveIntensity: 1.1
    });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), material);
    bulb.position.set(-4.2 + i * 0.42, 2.92 - (i % 2) * 0.05, -3.53);
    scene.add(bulb);
  }

  // Curtains gathered at both ends of the window wall.
  for (const side of [-1, 1]) {
    const curtain = box(0.42, 3.0, 0.36, colors.curtain, 1);
    curtain.position.set(side * 4.22, 1.52, -3.35);
    scene.add(curtain);
  }

  const city = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 8),
    new THREE.MeshBasicMaterial({ map: cityscape.texture, toneMapped: false })
  );
  city.position.set(0, 1.7, -6.8);
  scene.add(city);

  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 2.6),
    new THREE.MeshStandardMaterial({ map: makeRugTexture(), roughness: 1 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(-0.1, 0.012, 0.4);
  rug.receiveShadow = true;
  scene.add(rug);

  // Framed prints and hanging plants on the walls.
  const artSpots: Array<{ x: number; z: number; rotation: number; variant: "fjord" | "moon" | "grid" }> = [
    { x: -4.47, z: 2.0, rotation: Math.PI / 2, variant: "grid" },
    { x: -4.47, z: 0.55, rotation: Math.PI / 2, variant: "fjord" },
    { x: 4.47, z: 3.05, rotation: -Math.PI / 2, variant: "moon" }
  ];
  for (const spot of artSpots) {
    const frame = new THREE.Group();
    frame.position.set(spot.x, 1.85, spot.z);
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

function buildHangingPlants(scene: THREE.Scene, random: () => number): void {
  for (const [z, y] of [
    [-2.6, 2.3],
    [-1.4, 2.05]
  ]) {
    const hanger = new THREE.Group();
    hanger.position.set(-4.44, y, z);
    const bracket = box(0.16, 0.03, 0.03, colors.metal);
    bracket.position.x = 0.06;
    const pot = cylinder(0.09, 0.07, 0.11, colors.clay, 8);
    pot.position.set(0.14, -0.07, 0);
    hanger.add(bracket, pot);
    const leafMaterial = new THREE.MeshStandardMaterial({ color: colors.leaf, roughness: 0.95 });
    for (let i = 0; i < 4; i += 1) {
      const length = 0.2 + random() * 0.22;
      const vine = new THREE.Mesh(new THREE.BoxGeometry(0.035, length, 0.035), leafMaterial);
      vine.castShadow = true;
      vine.position.set(0.14 + (random() - 0.5) * 0.12, -0.12 - length / 2, (random() - 0.5) * 0.12);
      vine.rotation.z = (random() - 0.5) * 0.5;
      hanger.add(vine);
    }
    scene.add(hanger);
  }
}

function buildTvWall(scene: THREE.Scene, random: () => number): void {
  const console = new THREE.Group();
  console.position.set(-1.2, 0, -3.1);

  const body = box(2.3, 0.5, 0.5, colors.warmWood);
  body.position.y = 0.25;
  console.add(body);

  const stand = box(0.4, 0.06, 0.24, colors.metal);
  stand.position.y = 0.53;
  const panel = box(1.3, 0.75, 0.06, colors.slat);
  panel.position.y = 1.0;
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.22, 0.66),
    new THREE.MeshBasicMaterial({ map: makeTvTexture() })
  );
  screen.position.set(0, 1.0, 0.035);
  console.add(stand, panel, screen);

  const vase = cylinder(0.1, 0.14, 0.32, colors.clay, 10);
  vase.position.set(-0.85, 0.66, 0);
  const bookStack = box(0.24, 0.08, 0.17, colors.cushionDark);
  bookStack.position.set(0.8, 0.54, 0.05);
  console.add(vase, bookStack);

  // Faint cool glow from the paused screen.
  const glow = new THREE.PointLight(0x9db4d6, 1.6, 3);
  glow.position.set(0, 1.1, 0.5);
  console.add(glow);

  scene.add(console);

  buildPlant(scene, -2.85, -3.0, 1.1, random);
  buildPlant(scene, 0.55, -3.0, 0.85, random);
}

function buildLounge(scene: THREE.Scene): void {
  // Sofa on the rug, facing the tv and the window.
  const sofa = new THREE.Group();
  sofa.position.set(0.3, 0, 1.15);
  const base = box(1.7, 0.32, 0.9, colors.fabric, 1);
  base.position.y = 0.26;
  const backrest = box(2.1, 0.55, 0.22, colors.fabric, 1);
  backrest.position.set(0, 0.62, 0.34);
  sofa.add(base, backrest);
  for (const side of [-1, 1]) {
    const arm = box(0.2, 0.5, 0.9, colors.fabric, 1);
    arm.position.set(side * 0.95, 0.5, 0);
    sofa.add(arm);
  }
  for (const cx of [-0.42, 0.42]) {
    const cushion = box(0.78, 0.14, 0.78, 0x3c362f, 1);
    cushion.position.set(cx, 0.49, -0.02);
    sofa.add(cushion);
  }
  const pillowGold = box(0.32, 0.32, 0.12, colors.cushionGold, 1);
  pillowGold.position.set(-0.55, 0.66, 0.22);
  pillowGold.rotation.z = 0.18;
  const pillowDark = box(0.3, 0.3, 0.12, colors.cushionDark, 1);
  pillowDark.position.set(0.62, 0.65, 0.22);
  pillowDark.rotation.z = -0.14;
  const blanket = box(0.5, 0.05, 0.82, colors.cream, 1);
  blanket.position.set(-0.42, 0.545, -0.02);
  blanket.rotation.y = 0.08;
  sofa.add(pillowGold, pillowDark, blanket);
  scene.add(sofa);

  // Ottoman doubling as a coffee table, with a book on it.
  const ottoman = new THREE.Group();
  ottoman.position.set(-0.8, 0, 0.1);
  const cube = box(0.55, 0.34, 0.55, colors.fabric, 1);
  cube.position.y = 0.17;
  const tray = box(0.4, 0.03, 0.3, colors.darkWood);
  tray.position.y = 0.36;
  const book = box(0.2, 0.03, 0.14, colors.cushionGold);
  book.position.y = 0.39;
  book.rotation.y = 0.3;
  ottoman.add(cube, tray, book);
  scene.add(ottoman);

  // Floor lamp behind the sofa's right shoulder.
  const lamp = new THREE.Group();
  lamp.position.set(1.9, 0, 1.9);
  const lampBase = cylinder(0.14, 0.16, 0.04, colors.metal, 12);
  lampBase.position.y = 0.02;
  const pole = cylinder(0.02, 0.02, 1.5, colors.metal, 8);
  pole.position.y = 0.78;
  const shade = lampShade(0.11, 0.17, 0.24);
  shade.position.y = 1.62;
  lamp.add(lampBase, pole, shade);
  const light = new THREE.PointLight(0xd6b45f, 10, 6.5);
  light.position.y = 1.52;
  lamp.add(light);
  scene.add(lamp);
}

function buildOffice(scene: THREE.Scene, leds: BlinkingLed[], random: () => number): void {
  const desk = new THREE.Group();
  desk.position.set(-3.95, 0, 2.0);

  const top = box(0.75, 0.06, 1.7, colors.warmWood);
  top.position.y = 0.75;
  desk.add(top);
  for (const [lx, lz] of [
    [-0.32, -0.78],
    [0.32, -0.78],
    [-0.32, 0.78],
    [0.32, 0.78]
  ]) {
    const leg = box(0.06, 0.72, 0.06, colors.metal);
    leg.position.set(lx, 0.36, lz);
    desk.add(leg);
  }

  // Two monitors against the wall, angled slightly toward the chair.
  const screens = [
    { z: -0.4, angle: Math.PI / 2 + 0.16, lines: ["~/projects", "$ ls", "pixelwitness/", "cloudmount/", "shield-airplay/", "$ _"] },
    { z: 0.4, angle: Math.PI / 2 - 0.16, lines: ["# todo", "- fix the roomba", "- write blog post", "- touch grass (later)"] }
  ];
  for (const config of screens) {
    const monitor = new THREE.Group();
    monitor.position.set(-0.18, 0.78, config.z);
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

  const keyboard = box(0.2, 0.03, 0.55, colors.slat);
  keyboard.position.set(0.16, 0.795, 0);
  desk.add(keyboard);

  // A gamer-grade led strip under the front edge of the desk.
  const strip = ledMesh(0.025, leds, random, colors.accent, 0.8);
  strip.scale.set(1, 1, 60);
  strip.position.set(0.38, 0.71, 0);
  desk.add(strip);

  const tower = box(0.26, 0.55, 0.45, colors.metal);
  tower.position.set(0, 0.28, 0.62);
  desk.add(tower);
  const towerLed = ledMesh(0.035, leds, random);
  towerLed.rotation.y = Math.PI / 2;
  towerLed.position.set(0.14, 0.42, 0.62);
  desk.add(towerLed);

  // Small articulated desk lamp at the far end.
  const lampBase = cylinder(0.07, 0.08, 0.03, colors.metal, 10);
  lampBase.position.set(0, 0.8, -0.68);
  const lampArm = box(0.03, 0.32, 0.03, colors.metal);
  lampArm.position.set(0.02, 0.95, -0.62);
  lampArm.rotation.x = -0.35;
  const lampHead = lampShade(0.05, 0.09, 0.12);
  lampHead.position.set(0.05, 1.1, -0.52);
  lampHead.rotation.x = 0.7;
  desk.add(lampBase, lampArm, lampHead);
  const deskLampLight = new THREE.PointLight(0xd6b45f, 11, 6);
  deskLampLight.position.set(0.1, 1.15, -0.45);
  desk.add(deskLampLight);

  const deskPlant = miniPlant(0.14, 0.78, 0.68, 0.8, random);
  desk.add(deskPlant);

  // Warm spill from the screens onto the chair.
  const screenGlow = new THREE.PointLight(0xd6b45f, 2.2, 2.6);
  screenGlow.position.set(0.5, 1.1, 0);
  desk.add(screenGlow);

  scene.add(desk);

  const chair = new THREE.Group();
  chair.position.set(-3.15, 0, 2.0);
  chair.rotation.y = Math.PI / 2;
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

function buildPrinter(
  scene: THREE.Scene,
  leds: BlinkingLed[],
  random: () => number
): { paper: THREE.Mesh; homeX: number; travelX: number } {
  const station = new THREE.Group();
  station.position.set(-4.05, 0, 0.55);
  station.rotation.y = Math.PI;

  const cabinet = box(0.7, 0.72, 0.9, colors.darkWood);
  cabinet.position.y = 0.36;
  const body = box(0.5, 0.26, 0.58, colors.slat);
  body.position.y = 0.85;
  const lid = box(0.38, 0.06, 0.42, colors.metal);
  lid.position.y = 1.0;
  const slot = box(0.38, 0.03, 0.04, 0x050505);
  slot.position.set(-0.26, 0.9, 0);
  station.add(cabinet, body, lid, slot);

  const led = ledMesh(0.03, leds, random);
  led.rotation.y = -Math.PI / 2;
  led.position.set(-0.26, 0.96, 0.18);
  station.add(led);

  scene.add(station);

  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.56),
    new THREE.MeshBasicMaterial({ map: makePaperTexture(), side: THREE.DoubleSide })
  );
  paper.rotation.x = -Math.PI / 2;
  paper.rotation.z = -Math.PI / 2;
  paper.position.set(-3.77, 0.9, 0.55);
  paper.visible = false;
  scene.add(paper);

  return { paper, homeX: -3.77, travelX: 0.42 };
}

function buildPartitionShelf(scene: THREE.Scene, random: () => number): void {
  const shelf = new THREE.Group();
  shelf.position.set(2.4, 0, 0);

  for (const sz of [-1.28, 1.28]) {
    const side = box(0.44, 2.05, 0.05, colors.darkWood);
    side.position.set(0, 1.02, sz);
    shelf.add(side);
  }

  const bookColors = [0x4f4a42, 0x5c544a, 0x3f4a55, 0x554438, 0x6b5d4f, 0x98938a, 0xd6b45f];
  for (let level = 0; level < 4; level += 1) {
    const surfaceY = 0.12 + level * 0.62;
    const plank = box(0.4, 0.045, 2.6, colors.darkWood);
    plank.position.set(0, surfaceY, 0);
    shelf.add(plank);

    if (level === 3) {
      continue;
    }
    let bz = -1.18;
    while (bz < 1.1) {
      if (random() < 0.22) {
        bz += 0.16 + random() * 0.12;
        continue;
      }
      const thickness = 0.045 + random() * 0.05;
      const height = 0.24 + random() * 0.14;
      const color = bookColors[Math.floor(random() * bookColors.length)];
      const book = box(0.28, height, thickness, color);
      book.position.set(0, surfaceY + height / 2 + 0.023, bz + thickness / 2);
      shelf.add(book);
      bz += thickness + 0.012;
    }
  }

  const topPlant = miniPlant(0, 1.98, -0.9, 1.2, random);
  shelf.add(topPlant);
  // A vine trailing off the top shelf.
  const leafMaterial = new THREE.MeshStandardMaterial({ color: colors.leaf, roughness: 0.95 });
  for (let i = 0; i < 3; i += 1) {
    const length = 0.25 + random() * 0.3;
    const vine = new THREE.Mesh(new THREE.BoxGeometry(0.035, length, 0.035), leafMaterial);
    vine.castShadow = true;
    vine.position.set(0.16, 1.95 - length / 2, -0.75 + i * 0.14);
    vine.rotation.z = 0.2 + (random() - 0.5) * 0.3;
    shelf.add(vine);
  }

  scene.add(shelf);
}

function buildKitchen(scene: THREE.Scene, leds: BlinkingLed[], random: () => number): void {
  const kitchen = new THREE.Group();

  // Counter cabinets along the right wall.
  const cabinets = box(0.7, 0.85, 3.0, colors.darkWood);
  cabinets.position.set(4.15, 0.425, -0.9);
  const counterTop = box(0.78, 0.05, 3.1, colors.counterTop);
  counterTop.position.set(4.13, 0.875, -0.9);
  kitchen.add(cabinets, counterTop);

  // Coffee machine, the most important appliance.
  const machine = box(0.3, 0.38, 0.3, colors.slat);
  machine.position.set(4.2, 1.09, -0.2);
  const spout = box(0.1, 0.06, 0.08, colors.metal);
  spout.position.set(4.08, 0.99, -0.2);
  const machineLed = ledMesh(0.028, leds, random);
  machineLed.rotation.y = -Math.PI / 2;
  machineLed.position.set(4.04, 1.2, -0.2);
  kitchen.add(machine, spout, machineLed);

  const mug = cylinder(0.05, 0.05, 0.09, colors.accent, 12);
  mug.position.set(4.1, 0.945, 0.25);
  const bowl = cylinder(0.09, 0.05, 0.06, colors.clay, 10);
  bowl.position.set(4.15, 0.93, -1.5);
  kitchen.add(mug, bowl);

  // Open shelf on the wall above the counter, with jars.
  const wallShelf = box(0.3, 0.04, 2.2, colors.warmWood);
  wallShelf.position.set(4.33, 1.7, -0.9);
  kitchen.add(wallShelf);
  for (let i = 0; i < 4; i += 1) {
    const jar = cylinder(0.05, 0.05, 0.1 + (i % 2) * 0.05, i % 2 === 0 ? colors.clay : 0x98938a, 8);
    jar.position.set(4.33, 1.78, -1.7 + i * 0.5);
    kitchen.add(jar);
  }

  // Two bar stools facing the counter.
  for (const sz of [-1.7, -0.5]) {
    const seat = cylinder(0.16, 0.16, 0.05, colors.warmWood, 12);
    seat.position.set(3.35, 0.58, sz);
    const pole = cylinder(0.025, 0.025, 0.56, colors.metal, 8);
    pole.position.set(3.35, 0.28, sz);
    const foot = cylinder(0.12, 0.14, 0.03, colors.metal, 12);
    foot.position.set(3.35, 0.015, sz);
    kitchen.add(seat, pole, foot);
  }

  // Pendant lamps hanging over the counter.
  for (const pz of [-1.7, -0.1]) {
    const cord = cylinder(0.008, 0.008, 0.8, colors.metal, 6);
    cord.position.set(3.95, 2.7, pz);
    const shade = lampShade(0.05, 0.14, 0.18);
    shade.position.set(3.95, 2.28, pz);
    kitchen.add(cord, shade);
    const light = new THREE.PointLight(0xd6b45f, 6, 5);
    light.position.set(3.95, 2.15, pz);
    kitchen.add(light);
  }

  scene.add(kitchen);
}

function buildRack(scene: THREE.Scene, leds: BlinkingLed[], random: () => number): void {
  const rack = new THREE.Group();
  rack.position.set(4.1, 0, -2.95);

  const body = box(0.7, 1.6, 0.7, colors.metal);
  body.position.y = 0.8;
  rack.add(body);

  for (let i = 0; i < 5; i += 1) {
    const slat = box(0.03, 0.18, 0.6, colors.slat);
    slat.position.set(-0.36, 0.22 + i * 0.28, 0);
    rack.add(slat);
    for (let l = 0; l < 2; l += 1) {
      const led = ledMesh(0.03, leds, random, l === 1 && i % 2 === 0 ? 0x98938a : colors.accent);
      led.rotation.y = -Math.PI / 2;
      led.position.set(-0.375, 0.22 + i * 0.28 + 0.04, 0.2 - l * 0.14);
      rack.add(led);
    }
  }

  const glow = new THREE.PointLight(0xd6b45f, 1.6, 2.8);
  glow.position.set(-0.6, 0.9, 0);
  rack.add(glow);

  scene.add(rack);
}

function buildDoorMailSwitch(scene: THREE.Scene): { switchNub: THREE.Mesh } {
  const door = new THREE.Group();
  const panel = box(0.08, 2.08, 0.98, colors.darkWood);
  panel.position.set(4.46, 1.04, 2.85);
  const frameTop = box(0.1, 0.08, 1.14, colors.trim);
  frameTop.position.set(4.45, 2.12, 2.85);
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 10, 10),
    new THREE.MeshStandardMaterial({ color: colors.accent, roughness: 0.4, metalness: 0.4 })
  );
  knob.position.set(4.39, 1.02, 2.47);
  door.add(panel, frameTop, knob);
  scene.add(door);

  const tray = new THREE.Group();
  const shelfBox = box(0.14, 0.06, 0.44, colors.darkWood);
  shelfBox.position.set(4.43, 1.12, 1.55);
  const lip = box(0.03, 0.1, 0.44, colors.darkWood);
  lip.position.set(4.37, 1.18, 1.55);
  const paper = box(0.1, 0.025, 0.34, colors.paperWhite);
  paper.position.set(4.42, 1.17, 1.55);
  tray.add(shelfBox, lip, paper);
  scene.add(tray);

  const plate = box(0.03, 0.16, 0.1, colors.paperWhite);
  plate.position.set(4.48, 1.2, 2.1);
  scene.add(plate);
  const switchNub = box(0.04, 0.05, 0.04, colors.metal);
  switchNub.position.set(4.46, 1.18, 2.1);
  scene.add(switchNub);

  return { switchNub };
}

function buildRoomba(scene: THREE.Scene, leds: BlinkingLed[], random: () => number): THREE.Group {
  const roomba = new THREE.Group();
  roomba.position.set(0.9, 0, 2.6);
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

function buildLights(scene: THREE.Scene, switchNub: THREE.Mesh): (on: boolean) => void {
  const ambient = new THREE.AmbientLight(0x6a6c74, 0.85);
  const hemisphere = new THREE.HemisphereLight(0x4a5266, 0x2a241c, 1.4);
  scene.add(ambient, hemisphere);

  // Cold moon-and-city light coming in through the glass wall.
  const moon = new THREE.DirectionalLight(0x8fa3c8, 1.6);
  moon.position.set(2, 5.5, -3.5);
  moon.target.position.set(-0.5, 0, 2);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.left = -7;
  moon.shadow.camera.right = 7;
  moon.shadow.camera.top = 7;
  moon.shadow.camera.bottom = -7;
  moon.shadow.camera.near = 0.5;
  moon.shadow.camera.far = 18;
  moon.shadow.bias = -0.002;
  scene.add(moon, moon.target);

  // Ceiling downlights, controlled by the switch next to the door. Off by
  // default: the room falls back to lamps, pendants, screens, and the moon.
  const fillConfigs: Array<[number, number, number, number]> = [
    [0, 3.0, 0.4, 14],
    [-3.4, 3.0, 1.6, 10],
    [-1.0, 3.0, -2.2, 10]
  ];
  const fills: THREE.PointLight[] = [];
  for (const [x, y, z, intensity] of fillConfigs) {
    const fill = new THREE.PointLight(0xffe2b8, 0, 16);
    fill.position.set(x, y, z);
    fill.userData.onIntensity = intensity;
    fills.push(fill);
    scene.add(fill);
  }

  return (on: boolean): void => {
    ambient.intensity = on ? 1.7 : 0.85;
    hemisphere.intensity = on ? 2.2 : 1.4;
    for (const fill of fills) {
      fill.intensity = on ? (fill.userData.onIntensity as number) : 0;
    }
    switchNub.position.y = on ? 1.23 : 1.18;
  };
}

export function buildWorld(): RoomWorld {
  const random = createRandom(4321);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  const cityscape = createCityscape();
  const leds: BlinkingLed[] = [];

  buildShell(scene, cityscape);
  buildHangingPlants(scene, random);
  buildTvWall(scene, random);
  buildLounge(scene);
  buildOffice(scene, leds, random);
  const printer = buildPrinter(scene, leds, random);
  buildPartitionShelf(scene, random);
  buildKitchen(scene, leds, random);
  buildRack(scene, leds, random);
  const { switchNub } = buildDoorMailSwitch(scene);
  const roomba = buildRoomba(scene, leds, random);
  const setLights = buildLights(scene, switchNub);

  const colliders: RectCollider[] = [
    { minX: -2.35, maxX: -0.05, minZ: -3.45, maxZ: -2.8 }, // tv console
    { minX: -3.1, maxX: -2.6, minZ: -3.25, maxZ: -2.75 }, // plant left of tv
    { minX: 0.3, maxX: 0.8, minZ: -3.25, maxZ: -2.75 }, // plant right of tv
    { minX: -4.45, maxX: -3.55, minZ: 1.1, maxZ: 2.9 }, // office desk
    { minX: -3.45, maxX: -2.85, minZ: 1.7, maxZ: 2.3 }, // office chair
    { minX: -4.45, maxX: -3.6, minZ: 0.05, maxZ: 1.05 }, // printer cabinet
    { minX: -0.85, maxX: 1.45, minZ: 0.7, maxZ: 1.65 }, // sofa
    { minX: -1.1, maxX: -0.5, minZ: -0.2, maxZ: 0.4 }, // ottoman
    { minX: 1.7, maxX: 2.1, minZ: 1.7, maxZ: 2.1 }, // floor lamp
    { minX: 2.15, maxX: 2.65, minZ: -1.35, maxZ: 1.35 }, // partition shelf
    { minX: 3.75, maxX: 4.5, minZ: -2.45, maxZ: 0.65 }, // kitchen counter
    { minX: 3.15, maxX: 3.55, minZ: -1.9, maxZ: -1.5 }, // stool
    { minX: 3.15, maxX: 3.55, minZ: -0.7, maxZ: -0.3 }, // stool
    { minX: 3.75, maxX: 4.5, minZ: -3.35, maxZ: -2.55 } // rack
  ];

  const bounds: RectCollider = { minX: -4.15, maxX: 4.15, minZ: -3.1, maxZ: 3.3 };

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
    setLights
  };
}
