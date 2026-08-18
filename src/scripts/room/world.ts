import * as THREE from "three";
import { createCityscape, type Cityscape } from "./cityscape";
import {
  makeArtTexture,
  makeCheckerTexture,
  makeFloorTexture,
  makeGameTexture,
  makeMarqueeTexture,
  makeMonitorTexture,
  makeNeonTexture,
  makeResumeTexture,
  makeRugTexture,
  makeTvTexture
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
  wall: 0xcac2b2,
  ceiling: 0x565049,
  trim: 0x8a8172,
  darkWood: 0x3a2c1e,
  warmWood: 0x7a5c3e,
  metal: 0x191a1c,
  black: 0x17171a,
  slat: 0x101113,
  leather: 0x94512b,
  leatherDark: 0x8a4a26,
  boucle: 0xe2dbc8,
  cream: 0xe4dcc8,
  curtain: 0x6a5f4e,
  shade: 0x6a5636,
  leaf: 0x3d4a35,
  accent: 0xd6b45f,
  paperWhite: 0xefece3
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
    new THREE.MeshStandardMaterial({ map: makeFloorTexture(), roughness: 0.96 })
  );
  floor.position.y = -0.1;
  floor.receiveShadow = true;
  scene.add(floor);

  const wallMaterial = new THREE.MeshStandardMaterial({ color: colors.wall, roughness: 0.96 });
  const ceilingMaterial = new THREE.MeshStandardMaterial({ color: colors.ceiling, roughness: 0.97 });
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.42, 7.4), wallMaterial);
    wall.position.set(side * 4.1, 1.71, 0);
    wall.receiveShadow = true;
    scene.add(wall);

    const baseboard = box(0.07, 0.14, 7.4, colors.trim);
    baseboard.position.set(side * 3.97, 0.07, 0);
    scene.add(baseboard);
  }

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(8.4, 3.42, 0.2), wallMaterial);
  backWall.position.set(0, 1.71, 3.6);
  backWall.receiveShadow = true;
  scene.add(backWall);
  const backBaseboard = box(8.4, 0.14, 0.07, colors.trim);
  backBaseboard.position.set(0, 0.07, 3.47);
  scene.add(backBaseboard);

  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.24, 7.62), ceilingMaterial);
  ceiling.position.set(0, 3.3, 0.06);
  ceiling.receiveShadow = true;
  scene.add(ceiling);

  // Window: black frame opening onto the Bjørvika view.
  const sill = box(8.4, 0.18, 0.22, colors.metal);
  sill.position.set(0, 0.09, -3.55);
  const head = box(8.4, 0.28, 0.55, 0x2e2a24);
  head.position.set(0, 3.18, -3.38);
  scene.add(sill, head);
  for (let i = 0; i <= 4; i += 1) {
    const mullion = box(0.1, 2.9, 0.14, colors.metal);
    mullion.position.set(-4.2 + i * 2.1, 1.54, -3.55);
    scene.add(mullion);
  }
  const pane = new THREE.Mesh(
    new THREE.PlaneGeometry(8.2, 2.92),
    new THREE.MeshBasicMaterial({
      color: 0x93a7c4,
      transparent: true,
      opacity: 0.05,
      depthWrite: false
    })
  );
  pane.position.set(0, 1.64, -3.52);
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

  // Linen curtains gathered at both ends of the window wall.
  for (const side of [-1, 1]) {
    const curtain = box(0.42, 2.92, 0.36, colors.curtain, 1);
    curtain.position.set(side * 3.75, 1.55, -3.3);
    scene.add(curtain);
  }

  // Radiator under the glass, white panel with fins.
  const radiator = box(2.0, 0.5, 0.1, 0xd8d2c6, 0.85);
  radiator.position.set(-1.0, 0.34, -3.38);
  scene.add(radiator);
  for (let i = 0; i < 13; i += 1) {
    const fin = box(0.012, 0.42, 0.115, 0xbfb9ac, 0.85);
    fin.position.set(-1.9 + i * 0.15, 0.34, -3.38);
    scene.add(fin);
  }

  scene.add(cityscape.group);
}

/** Gallery wall prints, plus one frame on the right wall. */
function buildGallery(scene: THREE.Scene): void {
  const spots: Array<{
    z: number;
    y: number;
    w: number;
    h: number;
    variant: "fjord" | "moon" | "grid";
  }> = [
    { z: -2.05, y: 2.2, w: 0.5, h: 0.66, variant: "fjord" },
    { z: -1.52, y: 2.52, w: 0.34, h: 0.44, variant: "grid" },
    { z: -1.48, y: 1.95, w: 0.3, h: 0.4, variant: "moon" },
    { z: -0.5, y: 2.48, w: 0.44, h: 0.58, variant: "moon" },
    { z: -0.05, y: 2.02, w: 0.3, h: 0.38, variant: "grid" }
  ];
  for (const spot of spots) {
    const frame = new THREE.Group();
    frame.position.set(-3.96, spot.y, spot.z);
    frame.rotation.y = Math.PI / 2;
    const border = box(spot.w + 0.08, spot.h + 0.08, 0.04, colors.darkWood);
    const print = new THREE.Mesh(
      new THREE.PlaneGeometry(spot.w, spot.h),
      new THREE.MeshStandardMaterial({ map: makeArtTexture(spot.variant), roughness: 1 })
    );
    print.position.z = 0.025;
    frame.add(border, print);
    scene.add(frame);
  }

  const right = new THREE.Group();
  right.position.set(3.96, 2.2, 0.55);
  right.rotation.y = -Math.PI / 2;
  const border = box(0.52, 0.68, 0.04, colors.darkWood);
  const print = new THREE.Mesh(
    new THREE.PlaneGeometry(0.44, 0.6),
    new THREE.MeshStandardMaterial({ map: makeArtTexture("fjord"), roughness: 1 })
  );
  print.position.z = 0.025;
  right.add(border, print);
  scene.add(right);
}

/**
 * Media wall on the left: mid-century console, TV paused on a fjord doc,
 * orange globe lamp, records, cozy neon, and a lit marquee poster leaning
 * in the window corner.
 */
function buildMediaWall(scene: THREE.Scene, random: () => number): void {
  const console3 = new THREE.Group();
  console3.position.set(-3.55, 0, -1.05);

  const body = box(0.42, 0.5, 1.9, colors.warmWood, 0.8);
  body.position.y = 0.45;
  console3.add(body);
  const top = box(0.46, 0.04, 1.98, colors.darkWood, 0.7);
  top.position.y = 0.72;
  console3.add(top);
  for (const [lz, lx] of [
    [-0.85, 0.12],
    [0.85, 0.12],
    [-0.85, -0.12],
    [0.85, -0.12]
  ]) {
    const leg = box(0.05, 0.2, 0.05, colors.darkWood);
    leg.position.set(lx, 0.1, lz);
    console3.add(leg);
  }

  // Open shelf with a row of records.
  const opening = box(0.05, 0.26, 0.8, 0x241c12, 1);
  opening.position.set(0.2, 0.5, 0.42);
  console3.add(opening);
  const recordColors = [0xd6503c, 0x5ec8ff, 0xe4dcc8, 0x2f2a24, 0xd6b45f];
  for (let i = 0; i < 5; i += 1) {
    const record = box(0.02, 0.24, 0.24, recordColors[i], 0.85);
    record.position.set(0.21, 0.5, 0.14 + i * 0.13);
    record.rotation.x = (random() - 0.5) * 0.08;
    console3.add(record);
  }

  // TV with a paused frame and a soft blue spill.
  const bezel = box(0.06, 0.78, 1.36, 0x0e0e10, 0.6);
  bezel.position.set(0.05, 1.14, 0);
  console3.add(bezel);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.28, 0.7),
    new THREE.MeshBasicMaterial({ map: makeTvTexture() })
  );
  screen.position.set(0.085, 1.14, 0);
  screen.rotation.y = Math.PI / 2;
  console3.add(screen);
  const tvGlow = new THREE.PointLight(0x9fc0e8, 1.6, 3.2);
  tvGlow.position.set(0.5, 1.2, 0);
  console3.add(tvGlow);

  // Small orange globe lamp on the console.
  const lampBase = cylinder(0.045, 0.055, 0.03, colors.black, 10);
  lampBase.position.set(0, 0.755, -0.78);
  const lampStem = cylinder(0.012, 0.012, 0.1, colors.black, 8);
  lampStem.position.set(0, 0.82, -0.78);
  const lampGlobe = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 14, 14),
    new THREE.MeshStandardMaterial({
      color: 0x2a1c10,
      emissive: 0xff9c4a,
      emissiveIntensity: 1.15,
      roughness: 0.6
    })
  );
  lampGlobe.position.set(0, 0.93, -0.78);
  const lampLight = new THREE.PointLight(0xff9c4a, 2.2, 2.6);
  lampLight.position.set(0.1, 0.98, -0.78);
  console3.add(lampBase, lampStem, lampGlobe, lampLight);

  // Trailing plant on the other end of the console.
  const potMini = cylinder(0.06, 0.05, 0.09, 0xbfb9ac, 10);
  potMini.position.set(0, 0.77, 0.82);
  console3.add(potMini);
  const leafMaterial = new THREE.MeshStandardMaterial({ color: colors.leaf, roughness: 0.95 });
  for (const [dy, dz, h] of [
    [0.86, 0.8, 0.1],
    [0.84, 0.88, 0.14],
    [0.82, 0.74, 0.1]
  ]) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.03, h, 0.03), leafMaterial);
    leaf.position.set(0.02, dy, dz);
    leaf.rotation.z = (dz - 0.8) * 3;
    console3.add(leaf);
  }

  scene.add(console3);

  // Neon signs: cozy over the TV, and the marquee poster in the corner.
  const cozy = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 0.43),
    new THREE.MeshBasicMaterial({ map: makeNeonTexture("cozy", "#5ec8ff"), transparent: true })
  );
  cozy.position.set(-3.94, 2.72, -1.05);
  cozy.rotation.y = Math.PI / 2;
  scene.add(cozy);
  const cozyLight = new THREE.PointLight(0x5ec8ff, 1.1, 2.4);
  cozyLight.position.set(-3.7, 2.66, -1.05);
  scene.add(cozyLight);

  const poster = new THREE.Group();
  poster.position.set(-3.72, 0.44, -2.7);
  poster.rotation.y = Math.PI / 2;
  poster.rotation.z = 0.15;
  const posterFrame = box(0.62, 0.84, 0.05, colors.black, 0.7);
  const posterArt = new THREE.Mesh(
    new THREE.PlaneGeometry(0.56, 0.78),
    new THREE.MeshBasicMaterial({ map: makeMarqueeTexture() })
  );
  posterArt.position.z = 0.03;
  poster.add(posterFrame, posterArt);
  scene.add(poster);
}

/**
 * Home office in the back-left corner: desk against the back wall with the
 * two monitors, chair, and the work neon above.
 */
function buildHomeOffice(scene: THREE.Scene, leds: BlinkingLed[], random: () => number): void {
  const desk = new THREE.Group();
  desk.position.set(-2.4, 0, 3.0);
  desk.rotation.y = Math.PI / 2;

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
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: colors.accent, emissiveIntensity: 0.5 })
  );
  strip.position.set(0.41, 0.7, 0);
  desk.add(strip);

  // Articulated desk lamp at the tower end of the desk.
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

  const deskLampLight = new THREE.PointLight(0xd6b45f, 2.2, 3.2);
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
  const screenGlow = new THREE.PointLight(0xd6b45f, 1.1, 2.2);
  screenGlow.position.set(0.7, 1.2, 0);
  desk.add(screenGlow);

  scene.add(desk);

  const chair = new THREE.Group();
  chair.position.set(-2.4, 0, 2.2);
  chair.rotation.y = Math.PI / 2;
  const seat = box(0.52, 0.07, 0.52, 0x2f2a24);
  seat.position.y = 0.46;
  const backrest = box(0.07, 0.58, 0.52, 0x2f2a24);
  backrest.position.set(0.24, 0.78, 0);
  const post = box(0.06, 0.44, 0.06, colors.metal);
  post.position.y = 0.22;
  const foot = box(0.44, 0.04, 0.44, colors.metal);
  foot.position.y = 0.02;
  chair.add(seat, backrest, post, foot);
  scene.add(chair);

  // The work neon over the desk.
  const work = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 0.43),
    new THREE.MeshBasicMaterial({ map: makeNeonTexture("work", "#ff6a5e"), transparent: true })
  );
  work.position.set(-2.35, 2.5, 3.44);
  work.rotation.y = Math.PI;
  scene.add(work);
  const workLight = new THREE.PointLight(0xff6a5e, 0.8, 2.2);
  workLight.position.set(-2.35, 2.44, 3.2);
  scene.add(workLight);
}

function buildRack(scene: THREE.Scene, leds: BlinkingLed[], random: () => number): void {
  const rack = new THREE.Group();
  rack.position.set(-3.55, 0, 1.0);

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

  const glow = new THREE.PointLight(0xd6b45f, 1.1, 2.6);
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

/** Printer on a low cabinet beside the office corner; prints the real CV. */
function buildPrinter(
  scene: THREE.Scene,
  leds: BlinkingLed[],
  random: () => number
): { paper: THREE.Mesh; homeX: number; travelX: number } {
  const station = new THREE.Group();
  station.position.set(-3.5, 0, 2.35);

  const cabinet = box(0.85, 0.72, 0.8, colors.darkWood);
  cabinet.position.y = 0.36;
  const body = box(0.6, 0.26, 0.52, colors.slat);
  body.position.y = 0.85;
  const lid = box(0.44, 0.06, 0.4, colors.metal);
  lid.position.y = 1.0;
  const slot = box(0.04, 0.03, 0.36, 0x050505);
  slot.position.set(0.31, 0.9, 0);
  const tray = box(0.5, 0.02, 0.44, colors.metal);
  tray.position.set(0.52, 0.868, 0);
  station.add(cabinet, body, lid, slot, tray);

  const led = ledMesh(0.03, leds, random);
  led.rotation.y = Math.PI / 2;
  led.position.set(0.31, 0.96, 0.18);
  station.add(led);

  scene.add(station);

  const paperMap = makeResumeTexture();
  paperMap.center.set(0.5, 0.5);
  paperMap.rotation = Math.PI / 2;
  const paper = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.004, 0.4),
    new THREE.MeshStandardMaterial({ map: paperMap, color: 0xb8b3a6, roughness: 1 })
  );
  paper.position.set(-3.42, 0.884, 2.35);
  paper.visible = false;
  scene.add(paper);

  return { paper, homeX: -3.42, travelX: 0.62 };
}

/** Espresso station on a slim cart against the back wall. */
function buildCoffee(scene: THREE.Scene, leds: BlinkingLed[], random: () => number): void {
  const corner = new THREE.Group();
  corner.position.set(1.6, 0, 3.1);
  corner.rotation.y = -Math.PI / 2;

  const table = box(0.8, 0.72, 0.7, colors.darkWood);
  table.position.y = 0.36;
  const machine = box(0.32, 0.42, 0.32, colors.slat);
  machine.position.set(0.08, 0.93, 0);
  const spout = box(0.12, 0.06, 0.08, colors.metal);
  spout.position.set(-0.08, 0.82, 0);
  const mug = cylinder(0.05, 0.05, 0.09, colors.accent, 12);
  mug.position.set(-0.14, 0.77, 0.2);
  corner.add(table, machine, spout, mug);

  const led = ledMesh(0.028, leds, random);
  led.rotation.y = Math.PI / 2;
  led.position.set(-0.085, 1.05, 0);
  corner.add(led);

  scene.add(corner);
}

/**
 * Living area: cognac leather sofa facing the TV, glass coffee table with
 * a laptop on the blue rug, boucle lounge chair, side table, amber globe
 * lamp by the glass, and a black metal cart.
 */
function buildLivingArea(scene: THREE.Scene, random: () => number): void {
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 2.7),
    new THREE.MeshStandardMaterial({ map: makeRugTexture(), roughness: 1 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.55, 0.012, 0.45);
  rug.receiveShadow = true;
  scene.add(rug);

  // Leather sofa, backrest to the right wall, facing the media wall.
  const sofa = new THREE.Group();
  sofa.position.set(2.4, 0, 0.25);
  sofa.rotation.y = Math.PI / 2;
  const base = box(2.2, 0.34, 0.95, colors.leather, 0.6);
  base.position.y = 0.31;
  const backrest = box(2.2, 0.52, 0.24, colors.leather, 0.6);
  backrest.position.set(0, 0.68, 0.38);
  sofa.add(base, backrest);
  for (const side of [-1, 1]) {
    const arm = box(0.22, 0.5, 0.95, colors.leatherDark, 0.6);
    arm.position.set(side * 1.2, 0.48, 0);
    sofa.add(arm);
  }
  for (const cx of [-0.52, 0.52]) {
    const cushion = box(1.0, 0.14, 0.8, colors.leatherDark, 0.65);
    cushion.position.set(cx, 0.53, -0.04);
    sofa.add(cushion);
  }
  const pillowCream = box(0.34, 0.34, 0.14, colors.cream, 1);
  pillowCream.position.set(-0.78, 0.72, 0.26);
  pillowCream.rotation.z = 0.18;
  const pillowDark = box(0.32, 0.32, 0.14, 0x2f2a24, 1);
  pillowDark.position.set(0.85, 0.7, 0.26);
  pillowDark.rotation.z = -0.14;
  sofa.add(pillowCream, pillowDark);
  const throwBlanket = box(0.5, 0.04, 0.92, 0xb98a4e, 1);
  throwBlanket.position.set(-1.18, 0.75, 0);
  throwBlanket.rotation.z = 0.05;
  sofa.add(throwBlanket);
  for (const [fx, fz] of [
    [-1.05, -0.4],
    [1.05, -0.4],
    [-1.05, 0.4],
    [1.05, 0.4]
  ]) {
    const foot = box(0.06, 0.12, 0.06, colors.darkWood);
    foot.position.set(fx, 0.06, fz);
    sofa.add(foot);
  }
  scene.add(sofa);

  // Glass coffee table with the laptop and magazines.
  const table = new THREE.Group();
  table.position.set(0.95, 0, 0.3);
  const glassTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.62, 0.028, 28),
    new THREE.MeshStandardMaterial({
      color: 0xa8c8d0,
      transparent: true,
      opacity: 0.28,
      roughness: 0.06,
      metalness: 0.1
    })
  );
  glassTop.scale.z = 0.72;
  glassTop.position.y = 0.4;
  table.add(glassTop);
  const lowerShelf = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.02, 24),
    new THREE.MeshStandardMaterial({
      color: 0x2a2e33,
      transparent: true,
      opacity: 0.55,
      roughness: 0.2,
      metalness: 0.3
    })
  );
  lowerShelf.scale.z = 0.72;
  lowerShelf.position.y = 0.15;
  table.add(lowerShelf);
  for (const [lx, lz] of [
    [-0.44, -0.26],
    [0.44, -0.26],
    [-0.44, 0.26],
    [0.44, 0.26]
  ]) {
    const leg = box(0.03, 0.4, 0.03, colors.black, 0.5);
    leg.position.set(lx, 0.2, lz);
    table.add(leg);
  }

  const laptop = new THREE.Group();
  laptop.position.set(0.08, 0.414, 0.02);
  laptop.rotation.y = -1.15;
  const laptopBase = box(0.3, 0.016, 0.21, 0x1d1f24, 0.5);
  laptopBase.position.y = 0.008;
  const laptopScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.29, 0.18),
    new THREE.MeshBasicMaterial({ map: makeMonitorTexture(["$ ssh homelab", "▲ argocd synced", "$ _"]) })
  );
  laptopScreen.position.set(0, 0.1, -0.12);
  laptopScreen.rotation.x = -0.32;
  const laptopLid = box(0.3, 0.2, 0.012, 0x1d1f24, 0.5);
  laptopLid.position.set(0, 0.1, -0.128);
  laptopLid.rotation.x = -0.32;
  laptop.add(laptopBase, laptopLid, laptopScreen);
  table.add(laptop);

  const magazineA = box(0.26, 0.012, 0.18, 0x5ec8ff, 0.9);
  magazineA.position.set(-0.12, 0.17, 0.08);
  magazineA.rotation.y = 0.3;
  const magazineB = box(0.26, 0.012, 0.18, colors.cream, 0.9);
  magazineB.position.set(-0.08, 0.185, 0.05);
  magazineB.rotation.y = 0.12;
  table.add(magazineA, magazineB);
  const ceramic = cylinder(0.035, 0.045, 0.08, 0xd9d2c0, 10);
  ceramic.position.set(-0.3, 0.45, -0.1);
  table.add(ceramic);
  scene.add(table);

  // Boucle lounge chair with a checkered cushion.
  const lounge = new THREE.Group();
  lounge.position.set(-1.5, 0, 2.55);
  lounge.rotation.y = -0.55;
  const loungeSeat = box(0.62, 0.3, 0.6, colors.boucle, 1);
  loungeSeat.position.y = 0.28;
  const loungeBack = box(0.62, 0.46, 0.16, colors.boucle, 1);
  loungeBack.position.set(0, 0.62, 0.26);
  loungeBack.rotation.x = 0.16;
  lounge.add(loungeSeat, loungeBack);
  for (const side of [-1, 1]) {
    const arm = box(0.14, 0.34, 0.6, colors.boucle, 1);
    arm.position.set(side * 0.38, 0.42, 0);
    lounge.add(arm);
  }
  const cushion = new THREE.Mesh(
    new THREE.PlaneGeometry(0.46, 0.46),
    new THREE.MeshStandardMaterial({ map: makeCheckerTexture(), roughness: 1 })
  );
  cushion.rotation.x = -Math.PI / 2;
  cushion.position.set(0, 0.435, -0.02);
  lounge.add(cushion);
  for (const [fx, fz] of [
    [-0.26, -0.24],
    [0.26, -0.24],
    [-0.26, 0.24],
    [0.26, 0.24]
  ]) {
    const leg = box(0.05, 0.14, 0.05, colors.darkWood);
    leg.position.set(fx, 0.07, fz);
    lounge.add(leg);
  }
  scene.add(lounge);

  // Side table by the window end of the sofa.
  const side = new THREE.Group();
  side.position.set(3.3, 0, -2.55);
  const sideTop = cylinder(0.24, 0.24, 0.03, colors.warmWood, 14);
  sideTop.position.y = 0.5;
  side.add(sideTop);
  for (let i = 0; i < 3; i += 1) {
    const angle = (i / 3) * Math.PI * 2;
    const leg = box(0.035, 0.5, 0.035, colors.darkWood);
    leg.position.set(Math.cos(angle) * 0.16, 0.25, Math.sin(angle) * 0.16);
    side.add(leg);
  }
  const bookA = box(0.2, 0.03, 0.14, 0x3f4a55);
  bookA.position.set(0, 0.53, 0);
  bookA.rotation.y = 0.3;
  const bookB = box(0.18, 0.025, 0.13, colors.accent);
  bookB.position.set(0.01, 0.56, 0.01);
  bookB.rotation.y = 0.1;
  side.add(bookA, bookB);
  scene.add(side);

  // Amber globe floor lamp by the glass, like the one in the photo.
  const globeLamp = new THREE.Group();
  globeLamp.position.set(3.45, 0, -2.95);
  const globeBase = cylinder(0.13, 0.15, 0.04, colors.black, 12);
  globeBase.position.y = 0.02;
  const globePole = cylinder(0.018, 0.018, 1.44, colors.black, 8);
  globePole.position.y = 0.76;
  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0x2a1c10,
      emissive: 0xffb45e,
      emissiveIntensity: 1.1,
      roughness: 0.55
    })
  );
  globe.position.y = 1.58;
  const globeLight = new THREE.PointLight(0xffa64d, 7, 5.5);
  globeLight.position.y = 1.56;
  globeLamp.add(globeBase, globePole, globe, globeLight);
  scene.add(globeLamp);

  // Black metal cart beside the sofa with books, a cap, and a basket.
  const cart = new THREE.Group();
  cart.position.set(3.55, 0, 0.55);
  for (const [px, pz] of [
    [-0.22, -0.16],
    [0.22, -0.16],
    [-0.22, 0.16],
    [0.22, 0.16]
  ]) {
    const post = box(0.03, 0.68, 0.03, colors.black, 0.5);
    post.position.set(px, 0.34, pz);
    cart.add(post);
  }
  for (const sy of [0.18, 0.62]) {
    const plate = box(0.5, 0.025, 0.38, colors.black, 0.5);
    plate.position.y = sy;
    cart.add(plate);
  }
  const stackA = box(0.24, 0.05, 0.18, 0x554438);
  stackA.position.set(-0.08, 0.66, 0);
  const stackB = box(0.22, 0.04, 0.16, 0x98938a);
  stackB.position.set(-0.07, 0.71, 0.01);
  stackB.rotation.y = 0.2;
  const cap = box(0.16, 0.07, 0.16, 0x2f2a24, 1);
  cap.position.set(0.14, 0.67, -0.05);
  cart.add(stackA, stackB, cap);
  const blanketRoll = box(0.3, 0.13, 0.24, 0xb98a4e, 1);
  blanketRoll.position.set(-0.05, 0.26, 0);
  const basket = box(0.24, 0.14, 0.2, 0x3a3126, 1);
  basket.position.set(0.13, 0.26, 0.04);
  cart.add(blanketRoll, basket);
  scene.add(cart);

  void random;
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
  roomba.position.set(0, 0, -1.5);
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
  const hemisphere = new THREE.HemisphereLight(0x4a5266, 0x33291d, 0.8);
  scene.add(ambient, hemisphere);

  // Cold moon-and-city light coming in through the glass wall.
  const moon = new THREE.DirectionalLight(0x8fa3c8, 1.4);
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
  scene.background = new THREE.Color(0x0a101d);

  const cityscape = createCityscape();
  const leds: BlinkingLed[] = [];

  buildShell(scene, cityscape);
  buildGallery(scene);
  buildMediaWall(scene, random);
  buildHomeOffice(scene, leds, random);
  buildRack(scene, leds, random);
  buildShelf(scene, random);
  const printer = buildPrinter(scene, leds, random);
  buildCoffee(scene, leds, random);
  buildLivingArea(scene, random);
  buildDoorMailAndSwitch(scene);
  buildPlant(scene, 2.35, -3.05, 1.2, random);
  buildPlant(scene, 0.9, -3.2, 0.8, random);
  buildPlant(scene, -2.9, -3.0, 1.1, random);
  const roomba = buildRoomba(scene, leds, random);
  const lighting = buildLights(scene);

  const colliders: RectCollider[] = [
    { minX: -3.95, maxX: -3.1, minZ: -2.05, maxZ: -0.05 }, // media console
    { minX: -4.0, maxX: -3.05, minZ: 0.4, maxZ: 1.6 }, // rack
    { minX: -4.0, maxX: -3.0, minZ: 1.95, maxZ: 2.75 }, // printer cabinet
    { minX: -3.55, maxX: -1.25, minZ: 2.55, maxZ: 3.45 }, // desk
    { minX: -2.75, maxX: -2.05, minZ: 1.85, maxZ: 2.55 }, // office chair
    { minX: 1.8, maxX: 2.9, minZ: -0.95, maxZ: 1.45 }, // sofa
    { minX: 0.3, maxX: 1.6, minZ: -0.3, maxZ: 0.9 }, // glass coffee table
    { minX: -1.9, maxX: -1.1, minZ: 2.15, maxZ: 2.95 }, // boucle chair
    { minX: 3.05, maxX: 3.55, minZ: -2.8, maxZ: -2.3 }, // side table
    { minX: 3.25, maxX: 3.65, minZ: -3.15, maxZ: -2.75 }, // globe lamp
    { minX: 3.3, maxX: 3.8, minZ: 0.25, maxZ: 0.85 }, // cart
    { minX: 1.2, maxX: 2.0, minZ: 2.75, maxZ: 3.45 }, // coffee station
    { minX: 3.4, maxX: 4.0, minZ: -2.65, maxZ: -0.35 }, // shelf
    { minX: -3.95, maxX: -3.5, minZ: -3.05, maxZ: -2.4 }, // marquee poster
    { minX: 2.1, maxX: 2.6, minZ: -3.3, maxZ: -2.8 }, // window plant
    { minX: -3.15, maxX: -2.65, minZ: -3.25, maxZ: -2.75 } // corner plant
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
