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
  highlights: string[];
  stack?: string[];
};

export type Education = {
  id: string;
  start: string;
  end: string;
  startDateTime: string;
  endDateTime: string;
  title: string;
  school: string;
  location: string;
  detail?: string;
};

export const resumeProfile = {
  name: "Eirik Breen",
  role: "Systems Consultant",
  location: "Oslo, Norway",
  email: "me@eirikbreen.com",
  linkedin: "https://www.linkedin.com/in/eirik-breen",
  github: "https://github.com/ebreen",
  intro:
    "Linux specialist with more than five years in system operations, platform work, and infrastructure. RHEL, Kubernetes (K3s/MKS), GitOps with Argo CD, secrets with OpenBao/Vault, and automation with Ansible. A lot of that in PCI DSS environments. I use Claude Code and OpenCode in the daily work, and I care about agent workflows, MCP servers, and making AI infrastructure actually usable."
};

export const experience: Experience[] = [
  {
    id: "orange-consultant",
    start: "Aug 2023",
    end: "Present",
    startDateTime: "2023-08",
    current: true,
    title: "Systems Consultant, Service Delivery",
    company: "Orange Business (Basefarm)",
    location: "Oslo",
    highlights: [
      "Design and run Kubernetes clusters (K3s/MKS) for enterprise customers, with GitOps through Argo CD, Cilium networking, and secrets in OpenBao/Vault.",
      "Day-to-day operations of customer infrastructure on RHEL, with an eye on scale, security, and performance.",
      "Build and maintain PCI DSS-compliant Linux environments, including successful security audits.",
      "Log analysis and monitoring with Splunk and Elastic Stack for troubleshooting and capacity planning.",
      "Automate configuration and deployment with Ansible and CI/CD pipelines.",
      "Project lead for an HSM customer, implementing redundant Thales solutions across data centres."
    ],
    stack: [
      "RHEL",
      "Kubernetes (K3s, MKS)",
      "Argo CD",
      "Cilium",
      "OpenBao / Vault",
      "Ansible",
      "Splunk",
      "Elastic Stack",
      "Thales HSM"
    ]
  },
  {
    id: "orange-operations",
    start: "Oct 2021",
    end: "Aug 2023",
    startDateTime: "2021-10",
    endDateTime: "2023-08",
    title: "Senior Operations Technician, Operations Center",
    company: "Orange Business (Basefarm)",
    location: "Oslo",
    highlights: [
      "Operated and maintained customer servers and systems on the Incident team, mainly RHEL and Azure.",
      "Planned and carried out changes: firewall and proxy openings, certificate installs, and patching.",
      "Senior on a rotating roster covering day, evening, night, and weekend shifts.",
      "Mentored apprentices through their trade exam, and supervised intern students (Dec 2021–Dec 2022)."
    ],
    stack: ["RHEL", "Azure", "Incident management", "Change management"]
  },
  {
    id: "hdo",
    start: "Aug 2018",
    end: "Jun 2021",
    startDateTime: "2018-08",
    endDateTime: "2021-06",
    title: "ICT Operations Engineer",
    company: "HDO — Helsetjenestens Driftsorganisasjon",
    location: "Gjøvik",
    highlights: [
      "Two years as an ICT apprentice, then six months on contract after completing the trade certificate.",
      "1st and 2nd line support for emergency-network customers: AMK centres, out-of-hours clinics, and A&E.",
      "Rolled out security updates to customers, both remotely and on site."
    ],
    stack: ["Nødnett", "1st / 2nd line", "Patching"]
  }
];

export const education: Education[] = [
  {
    id: "fagbrev",
    start: "Nov 2018",
    end: "Sep 2020",
    startDateTime: "2018-11",
    endDateTime: "2020-09",
    title: "Trade certificate, ICT Service Worker",
    school: "HDO — Innlandet County Municipality",
    location: "Gjøvik",
    detail: "Passed with distinction (Meget godt bestått)."
  },
  {
    id: "vgs",
    start: "Aug 2016",
    end: "Nov 2018",
    startDateTime: "2016-08",
    endDateTime: "2018-11",
    title: "ICT with general university admissions",
    school: "Gjøvik Upper Secondary School",
    location: "Gjøvik",
    detail: "Information and communication technology, three-year programme."
  }
];

export const skillGroups: SkillGroup[] = [
  {
    id: "linux",
    title: "Linux & operations",
    items: ["RHEL", "Bash", "Python", "Performance tuning", "Complex troubleshooting"]
  },
  {
    id: "containers",
    title: "Containers & orchestration",
    items: ["Kubernetes (K3s/MKS)", "GitOps / Argo CD", "Cilium", "OpenBao / Vault"]
  },
  {
    id: "automation",
    title: "Automation & IaC",
    items: ["Ansible", "Infrastructure as code", "Jenkins", "Azure DevOps", "Git / GitLab / GitHub"]
  },
  {
    id: "security",
    title: "Security & compliance",
    items: ["PCI DSS", "Hardening", "Patch management", "Thales PayShield / Luna", "Key ceremony"]
  },
  {
    id: "observability",
    title: "Logging & monitoring",
    items: ["Splunk", "Wazuh", "Elastic Stack", "Alerting", "Capacity planning"]
  },
  {
    id: "cloud",
    title: "Cloud & virtualisation",
    items: ["Azure", "AWS", "Hybrid infrastructure"]
  },
  {
    id: "ai",
    title: "AI & tooling",
    items: ["Claude Code", "OpenCode", "MCP servers", "Agent workflows", "LM Studio / llama.cpp"]
  }
];
