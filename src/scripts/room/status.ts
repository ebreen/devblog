export type ServiceState = "up" | "degraded" | "down";

export type HomelabService = {
  name: string;
  state: ServiceState;
};

export type HomelabStatus = {
  source: "demo" | "live";
  uptime: string;
  services: HomelabService[];
};

/**
 * Point this at a VPS endpoint that returns JSON shaped like
 * `{ "uptime": "47 days", "services": [{ "name": "dns", "state": "up" }] }`
 * and the server rack in the room will show live numbers.
 * Leave it as null to use the demo data below.
 */
export const HOMELAB_STATUS_ENDPOINT: string | null = null;

const demoStatus: HomelabStatus = {
  source: "demo",
  uptime: "47 days",
  services: [
    { name: "hypervisor", state: "up" },
    { name: "containers", state: "up" },
    { name: "dns", state: "up" },
    { name: "backups", state: "degraded" }
  ]
};

export async function fetchHomelabStatus(): Promise<HomelabStatus> {
  if (!HOMELAB_STATUS_ENDPOINT) {
    return demoStatus;
  }

  try {
    const response = await fetch(HOMELAB_STATUS_ENDPOINT, {
      signal: AbortSignal.timeout(4000)
    });
    if (!response.ok) {
      return demoStatus;
    }
    const data = (await response.json()) as Omit<HomelabStatus, "source">;
    return { ...data, source: "live" };
  } catch {
    return demoStatus;
  }
}

export function serviceStateGlyph(state: ServiceState): string {
  switch (state) {
    case "up":
      return "●";
    case "degraded":
      return "◐";
    case "down":
      return "○";
    default: {
      const exhaustive: never = state;
      throw new Error(`unhandled service state: ${String(exhaustive)}`);
    }
  }
}
