/**
 * Everything in the room you can poke at. Shared by the 3D scene (client)
 * and the plain-html listing under it (built at compile time), so the two
 * never drift apart.
 */

export type HotspotId =
  | "window"
  | "desk"
  | "printer"
  | "shelf"
  | "rack"
  | "laptop"
  | "tv"
  | "record"
  | "coffee"
  | "door"
  | "sofa"
  | "roomba"
  | "lights";

export type HotspotLink = { href: string; label: string; meta?: string };

/** Where the camera stands to look at a station: plan travel and 1–0 keys. */
export type Viewpoint = { x: number; z: number; yaw: number; pitch: number };

export type Hotspot = {
  id: HotspotId;
  /** 1–10 on the floor plan; keys 1–9 and 0 travel there. Unnumbered extras are found by walking. */
  station?: number;
  /** Short label for the plan and the floating tags. */
  name: string;
  /** Prompt verb, shown as "e  {prompt}". */
  prompt: string;
  x: number;
  z: number;
  /** Height of the floating tag above the floor. */
  y: number;
  radius: number;
  title: string;
  lines: string[];
  link?: HotspotLink;
  /** Extra links the placard lists; filled from site data where noted. */
  links?: HotspotLink[];
  /** Where the station sits on the plan, when it differs from the hotspot. */
  plan?: { x: number; z: number };
  /** Fill `links` from build-time data. */
  feed?: "posts" | "projects";
  feedHeading?: string;
  view?: Viewpoint;
};

export type RoomFeedItem = { title: string; href: string; meta?: string };
export type RoomData = { posts: RoomFeedItem[]; projects: RoomFeedItem[] };

export const hotspots: Hotspot[] = [
  {
    id: "window",
    station: 1,
    name: "window",
    prompt: "look out over oslo",
    x: 0.3,
    z: -2.75,
    y: 1.7,
    radius: 1.5,
    title: "the window",
    lines: [
      "tenth floor, looking south over bjørvika.",
      "munch to the left, the opera sliding into the fjord.",
      "it is snowing. the forecast said it would not."
    ],
    view: { x: 0.25, z: -1.55, yaw: 0, pitch: 0.04 }
  },
  {
    id: "desk",
    station: 2,
    name: "desk",
    prompt: "look at the setup",
    x: -2.4,
    z: 2.35,
    y: 1.78,
    radius: 1.4,
    title: "the setup",
    lines: ["two screens: one for the terminal,", "one for the game that got paused at 1am."],
    feed: "projects",
    feedHeading: "on the terminal",
    link: { href: "/projects", label: "see what got made" },
    view: { x: -2.05, z: 1.25, yaw: 2.93, pitch: -0.2 }
  },
  {
    id: "printer",
    station: 3,
    name: "printer",
    prompt: "print the cv",
    x: -0.7,
    z: 2.6,
    y: 1.25,
    radius: 1.05,
    title: "the printer",
    lines: ["it prints exactly one document, and it says senior now.", "suspiciously reliable, for a printer."],
    link: { href: "/resume", label: "take the printout" },
    view: { x: -0.65, z: 1.8, yaw: Math.PI, pitch: -0.3 }
  },
  {
    id: "shelf",
    station: 4,
    name: "shelf",
    prompt: "browse the shelf",
    x: 3.2,
    z: -1.5,
    y: 2.1,
    radius: 1.3,
    title: "the shelf",
    lines: ["notes on linux, homelabs, ai,", "and other ideas that seemed good at midnight."],
    feed: "posts",
    feedHeading: "newest on the shelf",
    link: { href: "/blog", label: "read the notes" },
    view: { x: 2.3, z: -1.7, yaw: -1.72, pitch: 0.06 }
  },
  {
    id: "rack",
    station: 5,
    name: "rack",
    prompt: "check the rack",
    x: -2.95,
    z: 1.0,
    y: 2.25,
    radius: 1.1,
    title: "the rack",
    lines: ["a small homelab. a hypervisor, too many containers,", "and backups that actually restore. mostly."],
    link: { href: "/about", label: "more about all this" },
    view: { x: -2.05, z: 0.7, yaw: 1.84, pitch: -0.04 }
  },
  {
    id: "laptop",
    station: 6,
    name: "laptop",
    prompt: "peek at the laptop",
    x: 0.98,
    z: 0.4,
    y: 0.85,
    radius: 1.05,
    title: "the laptop",
    lines: [
      "baton is running: four agents, one inbox,",
      "and a voice remote for when typing is too much effort.",
      "not out yet. soon."
    ],
    link: { href: "/projects#baton", label: "read about baton" },
    view: { x: 1.0, z: 1.55, yaw: 0, pitch: -0.52 }
  },
  {
    id: "tv",
    station: 7,
    name: "tv",
    prompt: "see what's paused",
    x: -2.9,
    z: -1.05,
    y: 1.86,
    radius: 1.3,
    plan: { x: -3.3, z: -0.5 },
    title: "the tv",
    lines: ["a fjord documentary, paused at 45:12.", "asleep by minute twelve, both times."],
    view: { x: -0.95, z: -1.05, yaw: Math.PI / 2, pitch: 0.1 }
  },
  {
    id: "record",
    station: 8,
    name: "records",
    prompt: "put a record on",
    x: -3.05,
    z: -1.6,
    y: 1.05,
    radius: 0.95,
    plan: { x: -3.3, z: -1.75 },
    title: "the record player",
    lines: ["a slow loop for slow evenings.", "it only plays when you ask it to."],
    view: { x: -2.15, z: -1.75, yaw: 1.5, pitch: -0.42 }
  },
  {
    id: "coffee",
    station: 9,
    name: "coffee",
    prompt: "coffee",
    x: 1.6,
    z: 2.6,
    y: 1.3,
    radius: 1.0,
    title: "the coffee machine",
    lines: ["critical infrastructure.", "uptime target: five nines."],
    view: { x: 1.5, z: 1.85, yaw: Math.PI, pitch: -0.24 }
  },
  {
    id: "door",
    station: 10,
    name: "door",
    prompt: "leave the room",
    x: 3.4,
    z: 2.5,
    y: 2.25,
    radius: 0.95,
    title: "the door",
    lines: ["the viewing is over whenever you like."],
    link: { href: "/", label: "back to the front page" },
    links: [
      { href: "/about", label: "about" },
      { href: "/resume", label: "the cv" },
      { href: "mailto:me@eirikbreen.com", label: "email", meta: "me@eirikbreen.com" }
    ],
    view: { x: 2.55, z: 2.45, yaw: -Math.PI / 2, pitch: 0.02 }
  },
  {
    id: "sofa",
    name: "sofa",
    prompt: "the sofa",
    x: 1.75,
    z: 0.25,
    y: 0.95,
    radius: 0.95,
    title: "the leather sofa",
    lines: ["cognac leather, broken in exactly right.", "for watching the city instead of the terminal."]
  },
  {
    id: "lights",
    name: "switch",
    prompt: "lights on",
    x: 3.5,
    z: 3.15,
    y: 1.45,
    radius: 1.1,
    title: "the light switch",
    lines: []
  },
  {
    id: "roomba",
    name: "roomba",
    prompt: "the roomba",
    x: 0,
    z: 0,
    y: 0.35,
    radius: 0.95,
    title: "the roomba",
    lines: ["it has never once finished a run without getting stuck.", "still employed."]
  }
];

/** Numbered stations, in plan order. */
export const stations = hotspots
  .filter((hotspot): hotspot is Hotspot & { station: number; view: Viewpoint } =>
    typeof hotspot.station === "number" && Boolean(hotspot.view)
  )
  .sort((a, b) => a.station - b.station);

/** Key label for a station: 1–9, then 0 for ten. */
export function stationKey(station: number): string {
  return station === 10 ? "0" : String(station);
}

export function formatStation(station: number): string {
  return String(station).padStart(2, "0");
}

/** Static links for a hotspot after feeds are filled in. */
export function hotspotLinks(hotspot: Hotspot, data: RoomData | null): HotspotLink[] {
  if (hotspot.feed && data) {
    const items = hotspot.feed === "posts" ? data.posts : data.projects;
    return items.map((item) => ({ href: item.href, label: item.title, meta: item.meta }));
  }
  return hotspot.links ?? [];
}

/** Floor-plan frame in world metres: window wall (-z) at the top. */
export const PLAN = { minX: -4.25, minZ: -3.85, width: 8.5, depth: 7.7 };

export function planLeft(x: number): string {
  return `${(((x - PLAN.minX) / PLAN.width) * 100).toFixed(2)}%`;
}

export function planTop(z: number): string {
  return `${(((z - PLAN.minZ) / PLAN.depth) * 100).toFixed(2)}%`;
}

/** Footprints for the floor plan, in world metres (x, z, w, d). */
export type PlanShape = { x: number; z: number; w: number; d: number; r?: number; kind?: "soft" | "hard" | "rug" };

export const planShapes: PlanShape[] = [
  { x: 0.55, z: 0.45, w: 3.8, d: 2.7, kind: "rug" },
  { x: -3.7, z: -1.05, w: 0.44, d: 1.9, r: 0.03 }, // media console
  { x: -3.55, z: 1.0, w: 0.9, d: 1.2 }, // rack
  { x: -2.4, z: 3.0, w: 2.2, d: 0.8, r: 0.03 }, // desk
  { x: -2.4, z: 2.15, w: 0.56, d: 0.56, r: 0.2, kind: "soft" }, // chair
  { x: -0.7, z: 3.1, w: 0.85, d: 0.8, r: 0.03 }, // printer cabinet
  { x: 1.6, z: 3.1, w: 0.7, d: 0.8, r: 0.03 }, // coffee
  { x: 2.4, z: 0.25, w: 0.95, d: 2.2, r: 0.12, kind: "soft" }, // sofa
  { x: 0.95, z: 0.3, w: 0.9, d: 1.24, r: 0.42 }, // coffee table
  { x: 0.04, z: 0.5, w: 0.76, d: 0.76, r: 0.24, kind: "soft" }, // boucle chair
  { x: 3.75, z: -1.5, w: 0.46, d: 2.3 }, // shelf
  { x: 3.3, z: -2.55, w: 0.48, d: 0.48, r: 0.24 }, // side table
  { x: 3.55, z: 0.55, w: 0.5, d: 0.38 } // cart
];
