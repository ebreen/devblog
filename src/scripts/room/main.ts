import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { createRoomAudio } from "./audio";
import { hotspotLinks, hotspots, stations, type Hotspot, type RoomData } from "./hotspots";
import { createHud, createTouchControls, type StatusLine, type TagProjection } from "./hud";
import { collides, createPlayer, EYE_HEIGHT, lookPlayer, updatePlayer, type Player } from "./player";
import { fetchHomelabStatus, type HomelabStatus } from "./status";
import { buildWorld, type RectCollider } from "./world";

const PRINT_DURATION = 1.4;
const ROOMBA_SPEED = 0.55;
const ROOMBA_RADIUS = 0.28;
const TOUCH_LOOK_SENSITIVITY = 0.35;
const MAX_PIXEL_RATIO = 1.75;

/** Final pass: soft vignette, dither to kill banding, a breath of grain. */
const FinishShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uVignette: { value: 0.32 }
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uVignette;
    varying vec2 vUv;
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      d.x *= uResolution.x / uResolution.y;
      float v = smoothstep(1.05, 0.28, length(d));
      color.rgb *= mix(1.0 - uVignette, 1.0, v);
      float n = hash(floor(vUv * uResolution) + fract(uTime * 7.0) * 113.0) - 0.5;
      color.rgb += n * (1.6 / 255.0) + n * 0.018 * (1.0 - color.rgb) * color.rgb * 4.0;
      gl_FragColor = color;
    }
  `
};

function statusLines(status: HomelabStatus): StatusLine[] {
  const lines: StatusLine[] = status.services.map((service) => ({
    text: `${service.name} — ${service.state}`,
    tone: service.state
  }));
  lines.push({ text: `uptime — ${status.uptime}`, tone: "note" });
  return lines;
}

function roombaHits(x: number, z: number, colliders: RectCollider[], bounds: RectCollider): boolean {
  if (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ) {
    return true;
  }
  for (const box of colliders) {
    if (
      x + ROOMBA_RADIUS > box.minX &&
      x - ROOMBA_RADIUS < box.maxX &&
      z + ROOMBA_RADIUS > box.minZ &&
      z - ROOMBA_RADIUS < box.maxZ
    ) {
      return true;
    }
  }
  return false;
}

function shortestAngle(from: number, to: number): number {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function osloTime(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Oslo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date());
}

function readRoomData(): RoomData | null {
  const element = document.getElementById("room-data");
  if (!element?.textContent) {
    return null;
  }
  try {
    return JSON.parse(element.textContent) as RoomData;
  } catch {
    return null;
  }
}

type Travel = {
  hotspot: Hotspot;
  from: Player;
  to: Player;
  start: number;
  duration: number;
  cut: boolean;
  swapped: boolean;
};

export function initRoom(): void {
  const stage = document.getElementById("room-stage");
  const canvas = document.getElementById("room-canvas");
  if (!(stage instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) {
    return;
  }
  const veil = stage.querySelector<HTMLElement>(".room-cut");
  const data = readRoomData();

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  } catch {
    stage.querySelector<HTMLElement>(".room-loading")?.setAttribute("hidden", "");
    stage.querySelector<HTMLElement>(".room-fallback")?.removeAttribute("hidden");
    stage.dataset.mode = "fallback";
    return;
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const world = buildWorld();
  const player = createPlayer();

  // Dev-only pose fixture for deterministic screenshots: /room?pose=yaw,pitch,x,z
  let devPose = false;
  if (import.meta.env.DEV) {
    const pose = new URLSearchParams(window.location.search).get("pose");
    if (pose) {
      const [yaw, pitch, px, pz] = pose.split(",").map(Number);
      if ([yaw, pitch, px, pz].every(Number.isFinite)) {
        Object.assign(player, { yaw, pitch, x: px, z: pz });
        devPose = true;
      }
    }
  }

  new THREE.TextureLoader().load("/made/baton-inbox.webp", (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    world.laptopScreen.map = texture;
    world.laptopScreen.color.set(0xffffff);
    world.laptopScreen.needsUpdate = true;
  });

  if (import.meta.env.DEV) {
    (window as unknown as { __room?: unknown }).__room = { world, renderer, THREE };
  }

  const camera = new THREE.PerspectiveCamera(70, 1, 0.06, 140);
  const applyCamera = (pose: Player): void => {
    camera.position.set(pose.x, EYE_HEIGHT, pose.z);
    camera.rotation.set(pose.pitch, pose.yaw, 0, "YXZ");
  };
  applyCamera(player);

  const gl = renderer.getContext();
  const floatTargets =
    renderer.extensions.has("EXT_color_buffer_float") || renderer.extensions.has("EXT_color_buffer_half_float");
  const composerTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: floatTargets ? THREE.HalfFloatType : THREE.UnsignedByteType,
    samples: gl instanceof WebGL2RenderingContext ? 4 : 0
  });
  const composer = new EffectComposer(renderer, composerTarget);
  composer.addPass(new RenderPass(world.scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.38, 0.55, 0.85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const finishPass = new ShaderPass(FinishShader);
  composer.addPass(finishPass);

  const audio = createRoomAudio(world.recordPosition);

  let mode: "intro" | "walk" = devPose ? "walk" : "intro";
  let travel: Travel | null = null;
  let lightsOn = false;
  let stageVisible = true;

  const hud = createHud(stage, hotspots, {
    onStart: () => startViewing(),
    onTravel: (station) => travelToStation(station),
    onSound: () => toggleSound(),
    onClose: () => closePlacard()
  });
  hud.setMode(mode);
  const touch = createTouchControls(stage);

  const applyLightMode = (): void => {
    const rig = world.lighting;
    rig.ambient.intensity = lightsOn ? 0.6 : 0.22;
    rig.hemisphere.intensity = lightsOn ? 1.0 : 0.4;
    for (let i = 0; i < rig.fills.length; i += 1) {
      rig.fills[i].intensity = lightsOn ? rig.fillIntensities[i] : 0;
    }
    rig.downlight.emissiveIntensity = lightsOn ? 2.6 : 0;
    renderer.toneMappingExposure = lightsOn ? 1.15 : 1.05;
  };
  applyLightMode();

  // Point-light shadows (the lantern) cost six extra passes; they are the
  // first thing to go on phones and on machines that stay slow.
  let shedShadows = false;
  const shedPointShadows = (): void => {
    if (shedShadows) {
      return;
    }
    shedShadows = true;
    world.scene.traverse((object) => {
      if (object instanceof THREE.PointLight && object.castShadow) {
        object.castShadow = false;
      }
    });
  };
  if (coarsePointer) {
    shedPointShadows();
  }

  // Resolution: device pixel ratio, scaled down live if frames run long.
  let quality = coarsePointer ? 0.75 : 1;
  const resize = (): void => {
    const width = Math.max(1, stage.clientWidth);
    const height = Math.max(1, stage.clientHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO) * quality;
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(ratio);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const bufferHeight = height * ratio;
    world.fx.setPointScale(bufferHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))));
    finishPass.uniforms.uResolution.value.set(width * ratio, height * ratio);
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);

  const updateClock = (): void => {
    const time = osloTime();
    world.clock.set(time);
    hud.setTime(time);
  };
  updateClock();
  const clockTimer = window.setInterval(updateClock, 20000);

  const pressedKeys = new Set<string>();
  let interactQueued = false;
  let activeHotspot: Hotspot | null = null;
  let touchLookPointer: number | null = null;
  let lastTouchLookX = 0;
  let lastTouchLookY = 0;
  let printing = false;
  let printProgress = 0;

  const locked = (): boolean => document.pointerLockElement === canvas;

  const requestLock = (): void => {
    if (coarsePointer || locked()) {
      return;
    }
    try {
      const request = canvas.requestPointerLock() as unknown;
      if (request instanceof Promise) {
        request.catch(() => {});
      }
    } catch {
      // Some browsers refuse a re-lock right after Esc; the hint covers it.
    }
  };

  const syncLooking = (): void => {
    hud.setLooking(locked() || touchLookPointer !== null);
  };

  function startViewing(): void {
    if (mode === "walk") {
      return;
    }
    mode = "walk";
    hud.setMode("walk");
    requestLock();
    syncLooking();
  }

  const toggleSound = (): void => {
    const next = !audio.isEnabled();
    audio.setEnabled(next);
    hud.setSound(audio.isEnabled());
    const record = hotspots.find((hotspot) => hotspot.id === "record");
    if (record) {
      record.prompt = audio.isEnabled() ? "lift the needle" : "put a record on";
    }
    hud.flash(audio.isEnabled() ? "sound on · the record player is by the tv" : "sound off");
  };

  function closePlacard(): void {
    if (!hud.isPlacardOpen()) {
      return;
    }
    hud.closePlacard();
    hud.setActiveStation(null);
    if (mode === "walk") {
      requestLock();
    }
    syncLooking();
  }

  const openHotspot = (hotspot: Hotspot): void => {
    if (hotspot.id === "lights") {
      lightsOn = !lightsOn;
      applyLightMode();
      hotspot.prompt = lightsOn ? "lights off" : "lights on";
      hud.showPrompt(hotspot.prompt);
      return;
    }
    if (hotspot.id === "record") {
      toggleSound();
      hud.showPrompt(hotspot.prompt);
      return;
    }

    hud.openPlacard({ hotspot, links: hotspotLinks(hotspot, data) });
    hud.setActiveStation(hotspot.station ?? null);
    // Release the mouse after the placard is up so its links are clickable.
    if (locked()) {
      document.exitPointerLock();
    }

    if (hotspot.id === "printer") {
      printProgress = 0;
      printing = true;
      world.printer.paper.visible = true;
    }

    if (hotspot.id === "rack") {
      void fetchHomelabStatus().then((status) => {
        if (hud.placardId() !== "rack") {
          return;
        }
        const note = status.source === "demo" ? "demo data — the rack isn't wired to the vps yet" : "live from the vps";
        hud.showStatus(statusLines(status), note);
      });
    }
  };

  const pathIsClear = (from: Player, to: Player): boolean => {
    const steps = 24;
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      if (collides(from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t, world.colliders, world.bounds)) {
        return false;
      }
    }
    return true;
  };

  function travelToStation(station: number): void {
    const hotspot = stations.find((candidate) => candidate.station === station);
    if (!hotspot) {
      return;
    }
    if (mode === "intro") {
      mode = "walk";
      hud.setMode("walk");
    }
    if (hud.isPlacardOpen()) {
      hud.closePlacard();
    }
    const view = hotspot.view;
    const from: Player = { ...player };
    const to: Player = { x: view.x, z: view.z, yaw: from.yaw + shortestAngle(from.yaw, view.yaw), pitch: view.pitch };
    const distance = Math.hypot(to.x - from.x, to.z - from.z);
    const cut = reducedMotion || !pathIsClear(from, to);
    travel = {
      hotspot,
      from,
      to,
      start: performance.now() / 1000,
      duration: cut ? 0.6 : Math.min(1.5, Math.max(0.7, distance * 0.32)),
      cut,
      swapped: false
    };
    hud.setActiveStation(station);
    hud.hidePrompt();
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target;
    if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }
    if (event.key === "Escape" && hud.isPlacardOpen()) {
      closePlacard();
      return;
    }
    // Only take keys while the visitor is in the room (stage on screen).
    if (!stageVisible) {
      return;
    }
    if (/^[0-9]$/.test(event.key)) {
      const station = event.key === "0" ? 10 : Number(event.key);
      event.preventDefault();
      travelToStation(station);
      return;
    }
    if (event.key === "m" || event.key === "M") {
      toggleSound();
      return;
    }
    if (event.key === "e" || event.key === "E" || (event.key === "Enter" && !(target instanceof HTMLAnchorElement) && !(target instanceof HTMLButtonElement))) {
      if (mode === "intro") {
        startViewing();
        return;
      }
      interactQueued = true;
      return;
    }
    const key = event.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
      if (mode === "intro") {
        startViewing();
      }
      if (key.startsWith("arrow") && (locked() || mode === "walk")) {
        event.preventDefault();
      }
      pressedKeys.add(key);
    }
  };

  const onKeyUp = (event: KeyboardEvent): void => {
    pressedKeys.delete(event.key.toLowerCase());
  };

  const onBlur = (): void => {
    pressedKeys.clear();
  };

  let swallowNextLookEvent = false;

  const onPointerLockChange = (): void => {
    // Browsers can report one huge movement delta right after a lock change.
    swallowNextLookEvent = true;
    if (locked() && mode === "intro") {
      mode = "walk";
      hud.setMode("walk");
    }
    syncLooking();
  };

  const onMouseLook = (event: MouseEvent): void => {
    if (!locked() || hud.isPlacardOpen() || travel) {
      return;
    }
    if (swallowNextLookEvent) {
      swallowNextLookEvent = false;
      return;
    }
    lookPlayer(player, event.movementX, event.movementY);
  };

  const onCanvasClick = (event: MouseEvent): void => {
    if (coarsePointer || hud.isPlacardOpen()) {
      return;
    }
    if (!locked()) {
      event.preventDefault();
      if (mode === "intro") {
        startViewing();
      } else {
        requestLock();
      }
    }
  };

  const onCanvasPointerDown = (event: PointerEvent): void => {
    if (!coarsePointer || hud.isPlacardOpen() || event.pointerType === "mouse") {
      return;
    }
    if (mode === "intro") {
      startViewing();
    }
    touchLookPointer = event.pointerId;
    lastTouchLookX = event.clientX;
    lastTouchLookY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    syncLooking();
    event.preventDefault();
  };

  const onCanvasPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== touchLookPointer || travel) {
      return;
    }
    lookPlayer(
      player,
      (event.clientX - lastTouchLookX) * TOUCH_LOOK_SENSITIVITY,
      (event.clientY - lastTouchLookY) * TOUCH_LOOK_SENSITIVITY
    );
    lastTouchLookX = event.clientX;
    lastTouchLookY = event.clientY;
  };

  const onCanvasPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== touchLookPointer) {
      return;
    }
    touchLookPointer = null;
    syncLooking();
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("pointerlockchange", onPointerLockChange);
  document.addEventListener("mousemove", onMouseLook);
  canvas.addEventListener("click", onCanvasClick);
  canvas.addEventListener("pointerdown", onCanvasPointerDown);
  canvas.addEventListener("pointermove", onCanvasPointerMove);
  canvas.addEventListener("pointerup", onCanvasPointerUp);
  canvas.addEventListener("pointercancel", onCanvasPointerUp);

  const roombaVelocity = new THREE.Vector2(ROOMBA_SPEED, 0.2);
  const roombaHotspot = hotspots.find((hotspot) => hotspot.id === "roomba");
  const projected = new THREE.Vector3();
  const tagProjections: TagProjection[] = hotspots.map((hotspot) => ({
    id: hotspot.id,
    x: 0,
    y: 0,
    distance: 0,
    visible: false
  }));

  let firstFrame = true;
  let lastFrameTime: number | null = null;
  let frameAverage = 1 / 60;
  let lastQualityCheck = 0;

  const frame = (frameTime: number): void => {
    const elapsed = frameTime / 1000;
    const dt = lastFrameTime === null ? 1 / 60 : Math.min(0.05, elapsed - lastFrameTime);
    lastFrameTime = elapsed;

    // Dynamic resolution: drop quality when frames run long, recover slowly.
    frameAverage = frameAverage * 0.94 + dt * 0.06;
    if (elapsed - lastQualityCheck > 1.6) {
      lastQualityCheck = elapsed;
      if (frameAverage > 1 / 40 && quality > 0.55) {
        quality = Math.max(0.55, quality - 0.15);
        resize();
      } else if (frameAverage > 1 / 32 && !shedShadows) {
        shedPointShadows();
      } else if (frameAverage < 1 / 57 && quality < 1) {
        quality = Math.min(1, quality + 0.1);
        resize();
      }
    }

    if (mode === "intro" && !reducedMotion) {
      // Attract mode: the camera breathes towards the window.
      player.x = 1.05 + Math.sin(elapsed * 0.07) * 0.22;
      player.z = 1.9 - (1 - Math.cos(elapsed * 0.05)) * 0.25;
      player.yaw = -0.1 + Math.sin(elapsed * 0.11) * 0.24;
      player.pitch = 0.02 + Math.sin(elapsed * 0.08) * 0.035;
    }

    if (travel) {
      const t = Math.min(1, (performance.now() / 1000 - travel.start) / travel.duration);
      if (travel.cut) {
        if (veil) {
          veil.style.opacity = String(t < 0.5 ? t * 2 : (1 - t) * 2);
        }
        if (t >= 0.5 && !travel.swapped) {
          Object.assign(player, travel.to);
          travel.swapped = true;
        }
      } else {
        const e = easeInOut(t);
        player.x = travel.from.x + (travel.to.x - travel.from.x) * e;
        player.z = travel.from.z + (travel.to.z - travel.from.z) * e;
        player.yaw = travel.from.yaw + (travel.to.yaw - travel.from.yaw) * e;
        player.pitch = travel.from.pitch + (travel.to.pitch - travel.from.pitch) * e;
      }
      if (t >= 1) {
        Object.assign(player, travel.to);
        if (veil) {
          veil.style.opacity = "0";
        }
        const arrived = travel.hotspot;
        travel = null;
        openHotspot(arrived);
      }
    } else if (mode === "walk") {
      let strafe = 0;
      let forward = 0;
      if (!hud.isPlacardOpen()) {
        if (pressedKeys.has("arrowleft") || pressedKeys.has("a")) strafe -= 1;
        if (pressedKeys.has("arrowright") || pressedKeys.has("d")) strafe += 1;
        if (pressedKeys.has("arrowup") || pressedKeys.has("w")) forward += 1;
        if (pressedKeys.has("arrowdown") || pressedKeys.has("s")) forward -= 1;
        const touchMove = touch.readMove();
        strafe += touchMove.x;
        forward -= touchMove.z;
      }
      updatePlayer(player, strafe, forward, dt, world.colliders, world.bounds);
    }

    // Roomba wanders and bounces off furniture; its hotspot follows it.
    const roomba = world.roomba;
    const nextRoombaX = roomba.position.x + roombaVelocity.x * dt;
    const nextRoombaZ = roomba.position.z + roombaVelocity.y * dt;
    if (roombaHits(nextRoombaX, roomba.position.z, world.colliders, world.bounds)) {
      roombaVelocity.x *= -1;
      roombaVelocity.y += (Math.random() - 0.5) * 0.3;
    } else {
      roomba.position.x = nextRoombaX;
    }
    if (roombaHits(roomba.position.x, nextRoombaZ, world.colliders, world.bounds)) {
      roombaVelocity.y *= -1;
      roombaVelocity.x += (Math.random() - 0.5) * 0.3;
    } else {
      roomba.position.z = nextRoombaZ;
    }
    roombaVelocity.normalize().multiplyScalar(ROOMBA_SPEED);
    roomba.rotation.y = Math.atan2(roombaVelocity.x, roombaVelocity.y) - Math.PI / 2;
    if (roombaHotspot) {
      roombaHotspot.x = roomba.position.x;
      roombaHotspot.z = roomba.position.z;
    }

    for (const led of world.leds) {
      led.material.emissiveIntensity = 0.5 + 0.5 * Math.sin(elapsed * led.speed + led.phase);
    }

    if (printing) {
      printProgress = Math.min(1, printProgress + dt / PRINT_DURATION);
      const ease = 1 - (1 - printProgress) * (1 - printProgress);
      world.printer.paper.position.z = world.printer.homeZ + ease * world.printer.travelZ;
      if (printProgress >= 1) {
        printing = false;
      }
    }

    if (audio.isEnabled()) {
      world.record.rotation.y -= dt * 3.46;
    }

    if (!reducedMotion) {
      world.cityscape.update(elapsed);
      world.fx.update(elapsed, dt);
    }

    // Targeting: what is in reach and closest to where you are looking.
    const lookX = -Math.sin(player.yaw);
    const lookZ = -Math.cos(player.yaw);
    let best: Hotspot | null = null;
    let bestScore = Infinity;
    if (mode === "walk" && !travel) {
      for (const hotspot of hotspots) {
        const dx = hotspot.x - player.x;
        const dz = hotspot.z - player.z;
        const distance = Math.hypot(dx, dz);
        if (distance > hotspot.radius) {
          continue;
        }
        const facing = distance < 0.05 ? 1 : (dx * lookX + dz * lookZ) / distance;
        if (facing < 0.25 && distance > 0.55) {
          continue;
        }
        const score = (1 - facing) * 2 + distance * 0.35;
        if (score < bestScore) {
          bestScore = score;
          best = hotspot;
        }
      }
    }
    activeHotspot = best;
    if (activeHotspot && !hud.isPlacardOpen()) {
      hud.showPrompt(activeHotspot.prompt);
    } else {
      hud.hidePrompt();
    }

    if (touch.consumeInteract()) {
      interactQueued = true;
    }
    if (interactQueued) {
      interactQueued = false;
      if (hud.isPlacardOpen()) {
        closePlacard();
      } else if (activeHotspot) {
        openHotspot(activeHotspot);
      }
    }

    applyCamera(player);
    camera.updateMatrixWorld();

    // Floating tags over nearby things.
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    const showTags = mode === "walk" && !hud.isPlacardOpen() && !travel;
    for (let i = 0; i < hotspots.length; i += 1) {
      const hotspot = hotspots[i];
      const projection = tagProjections[i];
      const dx = hotspot.x - player.x;
      const dz = hotspot.z - player.z;
      const distance = Math.hypot(dx, dz);
      projection.distance = distance;
      projection.visible = false;
      if (!showTags || hotspot.id === "lights" || distance > 4.4) {
        continue;
      }
      projected.set(hotspot.x, hotspot.y, hotspot.z).project(camera);
      if (projected.z > 1 || projected.z < -1 || Math.abs(projected.x) > 0.92 || Math.abs(projected.y) > 0.9) {
        continue;
      }
      projection.x = (projected.x * 0.5 + 0.5) * width;
      projection.y = (-projected.y * 0.5 + 0.5) * height;
      projection.visible = true;
    }
    hud.updateTags(tagProjections, activeHotspot?.id ?? null, showTags);
    hud.updatePlan(player.x, player.z, player.yaw, roomba.position.x, roomba.position.z);
    audio.updateListener(player.x, EYE_HEIGHT, player.z, lookX, lookZ);

    finishPass.uniforms.uTime.value = elapsed;
    composer.render();

    if (firstFrame) {
      firstFrame = false;
      hud.markLoaded();
    }
  };

  // Only render while the room is on screen and the tab is visible.
  let running = false;
  const setRunning = (next: boolean): void => {
    if (next === running) {
      return;
    }
    running = next;
    lastFrameTime = null;
    renderer.setAnimationLoop(next ? frame : null);
  };
  const intersection = new IntersectionObserver(
    (entries) => {
      stageVisible = entries.some((entry) => entry.isIntersecting);
      setRunning(stageVisible && !document.hidden);
    },
    { threshold: 0.05 }
  );
  intersection.observe(stage);
  const onVisibility = (): void => setRunning(stageVisible && !document.hidden);
  document.addEventListener("visibilitychange", onVisibility);
  setRunning(true);

  const disposeMaterial = (material: THREE.Material): void => {
    for (const key of ["map", "emissiveMap", "normalMap", "roughnessMap", "metalnessMap"] as const) {
      (material as THREE.MeshStandardMaterial)[key]?.dispose();
    }
    material.dispose();
  };

  const dispose = (): void => {
    renderer.setAnimationLoop(null);
    resizeObserver.disconnect();
    intersection.disconnect();
    window.clearInterval(clockTimer);
    audio.dispose();
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
    document.removeEventListener("pointerlockchange", onPointerLockChange);
    document.removeEventListener("mousemove", onMouseLook);
    document.removeEventListener("visibilitychange", onVisibility);
    canvas.removeEventListener("click", onCanvasClick);
    canvas.removeEventListener("pointerdown", onCanvasPointerDown);
    canvas.removeEventListener("pointermove", onCanvasPointerMove);
    canvas.removeEventListener("pointerup", onCanvasPointerUp);
    canvas.removeEventListener("pointercancel", onCanvasPointerUp);
    world.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Points)) {
        return;
      }
      object.geometry.dispose();
      const material = object.material;
      if (Array.isArray(material)) {
        material.forEach(disposeMaterial);
      } else {
        disposeMaterial(material);
      }
    });
    composer.dispose();
    renderer.dispose();
  };
  window.addEventListener("pagehide", dispose, { once: true });
}
