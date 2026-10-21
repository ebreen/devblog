export type ProjectStatus = "soon" | "live" | "in-progress" | "open-source";

export type ProjectImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
};

export type Project = {
  id: string;
  title: string;
  category: string;
  status: ProjectStatus;
  summary: string;
  technologies: string[];
  /** Omitted while a project is unreleased. */
  href?: string;
  linkLabel?: string;
  homeTitle?: string;
  homeCopy?: string[];
  image?: ProjectImage;
};

export const projects: Project[] = [
  {
    id: "baton",
    title: "Baton",
    category: "macOS app",
    status: "soon",
    summary:
      "An inbox and a voice remote for coding agents on macOS. A tab on the screen edge keeps a dot for every agent: blue while it works, amber when it needs you, green when it is done. Their questions land in one inbox and you answer with a single key, or double-tap \u2325 and say what you need. Claude Code, Codex, OpenCode, and Pi run through herdr; Baton reads their state and passes your words along.",
    technologies: ["swift", "macos", "agents", "on-device speech"],
    homeTitle: "baton",
    homeCopy: [
      "an inbox and a voice remote for all your coding agents, on macos.",
      "answer with one key, or double-tap option and just say it."
    ],
    image: {
      src: "/made/baton-inbox.webp",
      alt: "Baton's inbox card over a desktop: claude-7 asks which layout to use for a pricing page, with three numbered answers, and the edge toolbar beside it shows one dot per agent.",
      width: 1040,
      height: 1000,
      caption: "An agent is waiting. Press 1, 2, or 3 to answer from wherever you are."
    }
  },
  {
    id: "modeltable",
    title: "ModelTable",
    category: "LLM prices",
    status: "live",
    summary:
      "Live LLM prices. First-party catalogs scrape every 15 minutes, marketplace lists every 5. One Cloudflare Worker, KV, edge cache. Three JS files, zero runtime npm, no build.",
    technologies: ["cloudflare", "workers", "kv", "javascript"],
    href: "https://modeltable.dev",
    linkLabel: "Open modeltable.dev",
    homeTitle: "modeltable.dev",
    homeCopy: [
      "live model prices from providers, full scrape every 15 minutes, marketplace lists every 5.",
      "one worker, KV, edge cache.",
      "three JS files, zero runtime npm, no build."
    ]
  },
  {
    id: "pixelwitness",
    title: "PixelWitness",
    category: "Browser extension",
    status: "in-progress",
    summary:
      "A Chrome extension that scores images on a page for likely AI generation. Decoding, three local models, and metadata checks all run in the browser, so the image never leaves the machine.",
    technologies: ["chrome-extension", "onnx", "privacy", "ai"],
    href: "https://github.com/ebreen/pixelwitness"
  },
  {
    id: "parrot-windows",
    title: "Parrot for Windows",
    category: "Windows utility",
    status: "open-source",
    summary:
      "Push-to-talk dictation that stays on the computer. Hold a key, speak, release, and it types where the cursor is. Transcription is local, with CUDA or Vulkan when a GPU is there, and CPU if not.",
    technologies: ["windows", "csharp", "whisper", "nvidia"],
    href: "https://github.com/ebreen/parrot-windows"
  },
  {
    id: "shield-airplay",
    title: "Shield AirPlay",
    category: "Android TV",
    status: "open-source",
    summary:
      "An AirPlay receiver for NVIDIA Shield and Android TV without ads, accounts, or analytics. Screen mirroring, HLS video, and local audio. GPLv3, based on android-airplay-server / UxPlay.",
    technologies: ["kotlin", "android-tv", "airplay", "nvidia-shield"],
    href: "https://github.com/ebreen/shield-airplay"
  },
  {
    id: "cloudmount",
    title: "CloudMount",
    category: "macOS utility",
    status: "in-progress",
    summary:
      "A menu-bar app that mounts Backblaze B2 buckets as Finder volumes through Apple’s FSKit. The bucket looks like a normal folder. No FUSE, no kernel extensions. macOS 26 and newer.",
    technologies: ["swift", "fskit", "macos", "backblaze-b2"],
    href: "https://github.com/ebreen/cloudmount"
  },
  {
    id: "solana-agent-toolkit",
    title: "Solana Agent Toolkit",
    category: "Agent tools",
    status: "open-source",
    summary:
      "Twenty-seven JavaScript tools for common Solana work: wallets, tokens, Jupiter swaps, yield, NFTs, and DCA. Built so an agent can call the chain without a one-off wrapper for every RPC.",
    technologies: ["javascript", "solana", "agents", "web3"],
    href: "https://github.com/ebreen/solana-agent-toolkit"
  }
];

export function projectStatusLabel(status: ProjectStatus): string {
  switch (status) {
    case "soon":
      return "coming soon";
    case "live":
      return "live";
    case "in-progress":
      return "in progress";
    case "open-source":
      return "open source";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function projectLinkLabel(project: Project): string {
  return project.linkLabel ?? "View repository";
}

export function getLatestCreation(list = projects): Project | undefined {
  return list.find((project) => project.homeTitle) ?? list[0];
}

/** Where a project points: its own site or repo, or its entry on the made page. */
export function projectHref(project: Project): string {
  return project.href ?? `/projects#${project.id}`;
}

export function isExternal(project: Project): boolean {
  return Boolean(project.href && /^https?:/.test(project.href));
}

export function formatProjectIndex(index: number, total = projects.length): string {
  return `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
}
