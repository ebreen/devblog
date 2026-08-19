export type HotspotId =
  | "desk"
  | "rack"
  | "printer"
  | "shelf"
  | "coffee"
  | "sofa"
  | "tv"
  | "window"
  | "door"
  | "mail"
  | "lights"
  | "roomba";

export type Hotspot = {
  id: HotspotId;
  /** Shown in the interaction prompt as "e — {prompt}". */
  prompt: string;
  x: number;
  z: number;
  radius: number;
  title: string;
  lines: string[];
  link?: { href: string; label: string };
};

export const hotspots: Hotspot[] = [
  {
    id: "desk",
    prompt: "look at the setup",
    x: -2.4,
    z: 2.1,
    radius: 1.4,
    title: "the setup",
    lines: [
      "two screens: one for the terminal,",
      "one for the game that got paused at 1am."
    ],
    link: { href: "/projects", label: "see what got made" }
  },
  {
    id: "printer",
    prompt: "print the cv",
    x: -0.7,
    z: 2.55,
    radius: 1.0,
    title: "the printer",
    lines: [
      "it prints exactly one document.",
      "suspiciously reliable, for a printer."
    ],
    link: { href: "/resume", label: "take the printout" }
  },
  {
    id: "rack",
    prompt: "check the rack",
    x: -2.9,
    z: 1.0,
    radius: 1.05,
    title: "the rack",
    lines: [
      "a small homelab. a hypervisor, too many containers,",
      "and backups that actually restore. mostly."
    ],
    link: { href: "/about", label: "more about all this" }
  },
  {
    id: "shelf",
    prompt: "browse the shelf",
    x: 3.1,
    z: -1.5,
    radius: 1.2,
    title: "the shelf",
    lines: [
      "notes on linux, homelabs, ai,",
      "and other ideas that seemed good at midnight."
    ],
    link: { href: "/blog", label: "read the notes" }
  },
  {
    id: "coffee",
    prompt: "coffee",
    x: 1.6,
    z: 2.6,
    radius: 1.0,
    title: "the coffee machine",
    lines: ["critical infrastructure.", "uptime target: five nines."]
  },
  {
    id: "sofa",
    prompt: "the sofa",
    x: 1.6,
    z: 0.25,
    radius: 0.95,
    title: "the leather sofa",
    lines: [
      "cognac leather, broken in exactly right.",
      "for watching the city instead of the terminal."
    ]
  },
  {
    id: "tv",
    prompt: "see what's paused",
    x: -2.8,
    z: -1.05,
    radius: 1.25,
    title: "the tv",
    lines: [
      "a fjord documentary, paused at 45:12.",
      "asleep by minute twelve, both times."
    ]
  },
  {
    id: "window",
    prompt: "look out over oslo",
    x: 0.3,
    z: -2.7,
    radius: 1.35,
    title: "the window",
    lines: [
      "tenth floor, looking south over bjørvika.",
      "munch to the left, the opera sliding into the fjord."
    ]
  },
  {
    id: "mail",
    prompt: "check the mail tray",
    x: 3.45,
    z: 1.85,
    radius: 0.9,
    title: "the mail tray",
    lines: ["say hello. or report a bug in this room."],
    link: { href: "/contact", label: "send an email" }
  },
  {
    id: "door",
    prompt: "leave the room",
    x: 3.4,
    z: 2.5,
    radius: 0.9,
    title: "the door",
    lines: ["back to the front page."],
    link: { href: "/", label: "leave" }
  },
  {
    id: "lights",
    prompt: "lights on",
    x: 3.5,
    z: 3.2,
    radius: 1.15,
    title: "the light switch",
    lines: []
  },
  {
    id: "roomba",
    prompt: "the roomba",
    x: 0,
    z: 0,
    radius: 0.95,
    title: "the roomba",
    lines: [
      "it has never once finished a run without getting stuck.",
      "still employed."
    ]
  }
];
