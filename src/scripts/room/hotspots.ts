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
  | "switch"
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
    prompt: "look at the desk",
    x: -3.55,
    z: 2.0,
    radius: 1.25,
    title: "the desk",
    lines: [
      "two screens and a keyboard that is too loud.",
      "at least one terminal at all times."
    ],
    link: { href: "/projects", label: "see what got made" }
  },
  {
    id: "printer",
    prompt: "print the cv",
    x: -3.5,
    z: 0.55,
    radius: 1.2,
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
    x: 3.5,
    z: -2.5,
    radius: 1.35,
    title: "the rack",
    lines: [
      "a small homelab in the kitchen corner.",
      "backups that actually restore. mostly."
    ],
    link: { href: "/about", label: "more about all this" }
  },
  {
    id: "shelf",
    prompt: "browse the shelf",
    x: 2.4,
    z: 0,
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
    x: 3.6,
    z: -0.2,
    radius: 1.1,
    title: "the coffee machine",
    lines: ["critical infrastructure.", "uptime target: five nines."]
  },
  {
    id: "sofa",
    prompt: "the sofa",
    x: 0.3,
    z: 0.3,
    radius: 0.95,
    title: "the sofa",
    lines: [
      "for watching the city instead of the terminal.",
      "statistically underused."
    ]
  },
  {
    id: "tv",
    prompt: "the tv",
    x: -1.2,
    z: -2.35,
    radius: 1.1,
    title: "the tv",
    lines: [
      "technically for films.",
      "mostly a very large terminal."
    ]
  },
  {
    id: "window",
    prompt: "look out over oslo",
    x: 1.5,
    z: -2.6,
    radius: 1.4,
    title: "the window",
    lines: [
      "oslo at night, from somewhere too high up.",
      "the fjord is out there. so is a ferry, probably."
    ]
  },
  {
    id: "mail",
    prompt: "check the mail tray",
    x: 4.0,
    z: 1.55,
    radius: 1.0,
    title: "the mail tray",
    lines: ["say hello. or report a bug in this room."],
    link: { href: "/contact", label: "send an email" }
  },
  {
    id: "switch",
    prompt: "lights on",
    x: 4.05,
    z: 2.1,
    radius: 1.0,
    title: "the light switch",
    lines: ["click."]
  },
  {
    id: "door",
    prompt: "leave the room",
    x: 4.0,
    z: 2.85,
    radius: 1.0,
    title: "the door",
    lines: ["back to the front page."],
    link: { href: "/", label: "leave" }
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
