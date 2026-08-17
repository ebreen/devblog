import * as THREE from "three";
import { hotspots, type Hotspot } from "./hotspots";
import { createHud, createTouchControls, type StatusLine } from "./hud";
import { buildPlayer, updatePlayer } from "./player";
import { fetchHomelabStatus, serviceStateGlyph, type HomelabStatus, type ServiceState } from "./status";
import { buildWorld, type RectCollider } from "./world";

const RENDER_SCALE = 0.5;
const CAMERA_OFFSET = new THREE.Vector3(0, 5.4, 6.1);
const CITY_FRAME_INTERVAL = 0.05;
const PRINT_DURATION = 1.4;
const ROOMBA_SPEED = 0.55;
const ROOMBA_RADIUS = 0.28;

function statusTone(state: ServiceState): StatusLine["tone"] {
  switch (state) {
    case "up":
      return "accent";
    case "degraded":
      return "muted";
    case "down":
      return "faint";
    default: {
      const exhaustive: never = state;
      throw new Error(`unhandled service state: ${String(exhaustive)}`);
    }
  }
}

function statusLines(status: HomelabStatus): StatusLine[] {
  const lines: StatusLine[] = status.services.map((service) => ({
    text: `${serviceStateGlyph(service.state)} ${service.name} — ${service.state}`,
    tone: statusTone(service.state)
  }));
  lines.push({ text: `uptime — ${status.uptime}`, tone: "muted" });
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

export function initRoom(): void {
  const stage = document.getElementById("room-stage");
  const canvas = document.getElementById("room-canvas");
  if (!(stage instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) {
    return;
  }
  const loading = stage.querySelector<HTMLElement>(".room-loading");
  const fallback = stage.querySelector<HTMLElement>(".room-fallback");

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  } catch {
    if (loading) loading.hidden = true;
    if (fallback) fallback.hidden = false;
    return;
  }

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const world = buildWorld();
  const player = buildPlayer(reducedMotion);
  world.scene.add(player.group);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 60);
  camera.position.copy(CAMERA_OFFSET).add(player.group.position);
  camera.lookAt(player.x, 0.6, player.z);

  const hud = createHud(stage);
  const touch = createTouchControls(stage);

  const resize = (): void => {
    const width = Math.max(1, stage.clientWidth);
    const height = Math.max(1, stage.clientHeight);
    renderer.setSize(Math.floor(width * RENDER_SCALE), Math.floor(height * RENDER_SCALE), false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  new ResizeObserver(resize).observe(stage);

  const pressedKeys = new Set<string>();
  let interactQueued = false;
  let activeHotspot: Hotspot | null = null;
  let openHotspotId: Hotspot["id"] | null = null;

  const closeDialog = (): void => {
    hud.hideDialog();
    openHotspotId = null;
  };

  const openHotspot = (hotspot: Hotspot): void => {
    hud.showDialog({ title: hotspot.title, lines: hotspot.lines, link: hotspot.link });
    openHotspotId = hotspot.id;

    if (hotspot.id === "printer") {
      printProgress = 0;
      printing = true;
      world.printerPaper.visible = true;
    }

    if (hotspot.id === "rack") {
      void fetchHomelabStatus().then((status) => {
        if (openHotspotId !== "rack") {
          return;
        }
        const note =
          status.source === "demo"
            ? "demo data — the rack isn't wired to the vps yet"
            : "live from the vps";
        hud.showDialogStatus(statusLines(status), note);
      });
    }
  };

  window.addEventListener("keydown", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
      return;
    }
    if (event.key === "Escape" && hud.isDialogOpen()) {
      closeDialog();
      return;
    }
    if (event.key === "e" || event.key === "E" || event.key === "Enter") {
      if (event.key === "Enter" && target instanceof HTMLAnchorElement) {
        return;
      }
      interactQueued = true;
      return;
    }
    const isMovementKey = [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "w",
      "a",
      "s",
      "d",
      "W",
      "A",
      "S",
      "D"
    ].includes(event.key);
    if (isMovementKey) {
      if (event.key.startsWith("Arrow")) {
        event.preventDefault();
      }
      pressedKeys.add(event.key.toLowerCase());
    }
  });

  window.addEventListener("keyup", (event) => {
    pressedKeys.delete(event.key.toLowerCase());
  });

  window.addEventListener("blur", () => {
    pressedKeys.clear();
  });

  const roombaVelocity = new THREE.Vector2(ROOMBA_SPEED, 0.2);
  let printing = false;
  let printProgress = 0;
  let cityTimer = 0;
  let firstFrame = true;

  let lastFrameTime: number | null = null;

  renderer.setAnimationLoop((frameTime: number) => {
    const elapsed = frameTime / 1000;
    const dt = lastFrameTime === null ? 0.016 : Math.min(0.05, elapsed - lastFrameTime);
    lastFrameTime = elapsed;

    let inputX = 0;
    let inputZ = 0;
    if (!hud.isDialogOpen()) {
      if (pressedKeys.has("arrowleft") || pressedKeys.has("a")) inputX -= 1;
      if (pressedKeys.has("arrowright") || pressedKeys.has("d")) inputX += 1;
      if (pressedKeys.has("arrowup") || pressedKeys.has("w")) inputZ -= 1;
      if (pressedKeys.has("arrowdown") || pressedKeys.has("s")) inputZ += 1;
      const touchMove = touch.readMove();
      inputX += touchMove.x;
      inputZ += touchMove.z;
    }
    updatePlayer(player, inputX, inputZ, dt, world.colliders, world.bounds);

    // Roomba wanders and bounces off furniture; its hotspot follows it.
    const nextRoombaX = world.roomba.position.x + roombaVelocity.x * dt;
    const nextRoombaZ = world.roomba.position.z + roombaVelocity.y * dt;
    if (roombaHits(nextRoombaX, world.roomba.position.z, world.colliders, world.bounds)) {
      roombaVelocity.x *= -1;
      roombaVelocity.y += (Math.random() - 0.5) * 0.3;
    } else {
      world.roomba.position.x = nextRoombaX;
    }
    if (roombaHits(world.roomba.position.x, nextRoombaZ, world.colliders, world.bounds)) {
      roombaVelocity.y *= -1;
      roombaVelocity.x += (Math.random() - 0.5) * 0.3;
    } else {
      world.roomba.position.z = nextRoombaZ;
    }
    roombaVelocity.normalize().multiplyScalar(ROOMBA_SPEED);
    world.roomba.rotation.y = Math.atan2(roombaVelocity.x, roombaVelocity.y) - Math.PI / 2;
    const roombaHotspot = hotspots.find((hotspot) => hotspot.id === "roomba");
    if (roombaHotspot) {
      roombaHotspot.x = world.roomba.position.x;
      roombaHotspot.z = world.roomba.position.z;
    }

    for (const led of world.leds) {
      led.material.emissiveIntensity = 0.5 + 0.5 * Math.sin(elapsed * led.speed + led.phase);
    }

    if (printing) {
      printProgress = Math.min(1, printProgress + dt / PRINT_DURATION);
      const ease = 1 - (1 - printProgress) * (1 - printProgress);
      world.printerPaper.position.x = world.printerPaperHomeX - ease * 0.42;
      if (printProgress >= 1) {
        printing = false;
      }
    }

    cityTimer += dt;
    if (cityTimer >= CITY_FRAME_INTERVAL) {
      world.cityscape.update(elapsed);
      cityTimer = 0;
    }

    let nearest: Hotspot | null = null;
    let nearestDistance = Infinity;
    for (const hotspot of hotspots) {
      const distance = Math.hypot(player.x - hotspot.x, player.z - hotspot.z);
      if (distance < hotspot.radius && distance < nearestDistance) {
        nearest = hotspot;
        nearestDistance = distance;
      }
    }
    activeHotspot = nearest;
    if (activeHotspot && !hud.isDialogOpen()) {
      hud.showPrompt(activeHotspot.prompt);
    } else {
      hud.hidePrompt();
    }

    if (touch.consumeInteract()) {
      interactQueued = true;
    }
    if (interactQueued) {
      interactQueued = false;
      if (hud.isDialogOpen()) {
        closeDialog();
      } else if (activeHotspot) {
        openHotspot(activeHotspot);
      }
    }

    const targetCamera = new THREE.Vector3(player.x, 0, player.z).add(CAMERA_OFFSET);
    const smoothing = reducedMotion ? 1 : Math.min(1, dt * 4.5);
    camera.position.lerp(targetCamera, smoothing);
    camera.lookAt(camera.position.x - CAMERA_OFFSET.x, 0.6, camera.position.z - CAMERA_OFFSET.z);

    renderer.render(world.scene, camera);

    if (firstFrame) {
      firstFrame = false;
      if (loading) {
        loading.classList.add("is-done");
      }
    }
  });
}
