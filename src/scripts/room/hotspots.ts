export type HotspotId =
  | "desk"
  | "rack"
  | "printer"
  | "shelf"
  | "coffee"
  | "window"
  | "door"
  | "mail"
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
    x: -2.6,
    z: -2.4,
    radius: 1.35,
    title: "the desk",
    lines: [
      "three screens, pointed at the city.",
      "at least one is always a terminal."
    ],
    link: { href: "/projects", label: "see what got made" }
  },
  {
    id: "rack",
    prompt: "check the rack",
    x: -5.75,
    z: -2.2,
    radius: 1.25,
    title: "the rack",
    lines: [
      "a small homelab. a hypervisor, too many containers,",
      "and backups that actually restore. mostly."
    ],
    link: { href: "/about", label: "more about all this" }
  },
  {
    id: "printer",
    prompt: "print the cv",
    x: 5.85,
    z: 0.9,
    radius: 1.2,
    title: "the printer",
    lines: [
      "it prints exactly one document.",
      "suspiciously reliable, for a printer."
    ],
    link: { href: "/resume", label: "take the printout" }
  },
  {
    id: "shelf",
    prompt: "browse the shelf",
    x: 5.9,
    z: -2,
    radius: 1.3,
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
    x: -5.75,
    z: 1.6,
    radius: 1.15,
    title: "the coffee machine",
    lines: ["critical infrastructure.", "uptime target: five nines."]
  },
  {
    id: "window",
    prompt: "look out over oslo",
    x: 1.6,
    z: -3.9,
    radius: 1.5,
    title: "the window",
    lines: [
      "oslo at night, from somewhere too high up.",
      "the fjord is out there. so is a ferry, probably."
    ]
  },
  {
    id: "mail",
    prompt: "check the mail tray",
    x: 6.15,
    z: 2.25,
    radius: 1.1,
    title: "the mail tray",
    lines: ["say hello. or report a bug in this room."],
    link: { href: "/contact", label: "send an email" }
  },
  {
    id: "door",
    prompt: "leave the room",
    x: 6.25,
    z: 3.5,
    radius: 1.2,
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
