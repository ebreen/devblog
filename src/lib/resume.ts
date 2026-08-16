export type SkillGroup = {
  id: string;
  title: string;
  items: string[];
};

export type Experience = {
  id: string;
  start: string;
  end: string;
  startDateTime: string;
  endDateTime?: string;
  current?: boolean;
  title: string;
  company: string;
  location: string;
  summary: string[];
  stack: string[];
};

export const resumeProfile = {
  name: "Eirik Breen",
  role: "Systems Consultant",
  location: "Oslo, Norway",
  availability: "Oslo & remote",
  email: "me@eirikbreen.com",
  linkedin: "https://www.linkedin.com/in/eirik-breen",
  github: "https://github.com/ebreen",
  intro:
    "Linux systems consultant in Oslo. I work on customer platforms: Linux, Kubernetes, GitOps, secrets, and observability, often in PCI-DSS environments. After hours I run a homelab and build small tools I actually need."
};

export const experience: Experience[] = [
  {
    id: "orange-business",
    start: "Jul 2023",
    end: "Present",
    startDateTime: "2023-07",
    current: true,
    title: "Systems Consultant",
    company: "Orange Business",
    location: "Oslo",
    summary: [
      "Consulting on Linux and platform operations for customer environments. Most days sit between Kubernetes, GitOps, secrets, and observability — often in PCI-DSS estates, where a change has to be explainable, not just successful.",
      "I want the next person to understand what I changed and why. If the automation hides the plot, I do not trust it.",
      "On the side I keep a small K3s cluster at home as a place to try GitOps, local models, and native apps before they get a longer life."
    ],
    stack: [
      "Linux (RHEL)",
      "Kubernetes (K3s, MKS)",
      "Argo CD",
      "Ansible",
      "Vault / OpenBao",
      "Splunk",
      "Elastic Stack"
    ]
  }
];

export const skillGroups: SkillGroup[] = [
  {
    id: "platform",
    title: "Platform & infrastructure",
    items: ["Linux", "RHEL", "Kubernetes", "K3s", "MKS", "PCI-DSS"]
  },
  {
    id: "delivery",
    title: "Delivery & automation",
    items: ["GitOps", "Argo CD", "Ansible", "Vault", "OpenBao"]
  },
  {
    id: "operations",
    title: "Operations",
    items: ["Splunk", "Elastic Stack", "Observability"]
  },
  {
    id: "after-hours",
    title: "After hours",
    items: ["Swift", "Local models", "Agent workflows", "MCP"]
  }
];
