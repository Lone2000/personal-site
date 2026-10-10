export type Group = "creative" | "automation";

export interface Project {
  slug: string;
  name: string;
  group: Group;
  year: string;
  kind: string;
  pitch: string;
  /** what to try in the demo, in one or two sentences */
  tryIt: string;
  /** what is real in the demo and what is stand-in */
  real: string;
  stack: string[];
  href: string;
  external?: boolean;
  repo?: string;
  video?: string;
  poster: string;
  note?: string;
}

export const EMAIL = "lone0059@gmail.com";
export const LINKS = {
  github: "https://github.com/Lone2000",
  linkedin: "https://www.linkedin.com/in/muhammad-irfan-lone",
  credly: "https://www.credly.com/users/muhammad-irfan-lone",
  resume: "/resume.pdf",
};

export const PROJECTS: Project[] = [
  {
    slug: "feels-like-today",
    name: "Feels Like Today",
    group: "creative",
    year: "2026",
    kind: "WebGL",
    pitch: "Small 3D rooms for feelings that have no easy name.",
    tryIt: "Pull the bulb's string in Hesitation, knock twice on Not Yet, lift the gem. Each room is its own scene with its own interaction and sound.",
    real: "The full app, built and served as-is.",
    stack: ["React 19", "TypeScript", "Three.js", "React Three Fiber", "GLSL", "GSAP", "Tailwind"],
    href: "/feels-like-today/",
    video: "/videos/feels-like-today.mp4",
    poster: "/videos/feels-like-today.jpg",
  },
  {
    slug: "starry-post",
    name: "Starry Post",
    group: "creative",
    year: "2026",
    kind: "End-to-end encrypted",
    pitch: "Letters for two people, sealed in the browser before they're sent.",
    tryIt: "Unlock it, open the glowing letter, then write one back: add a page, stick something on it and seal it in wax.",
    real: "The real app and the real server routes, running in your browser. Letters are encrypted with PBKDF2 and AES-256-GCM before they're stored; storage only ever holds ciphertext.",
    stack: ["WebCrypto", "PBKDF2 + AES-GCM", "Generated SVG sky", "Web Audio", "Node, zero dependencies"],
    href: "/starry-post/",
    video: "/videos/starry-post.mp4",
    poster: "/videos/starry-post.jpg",
    note: "The demo code is starlight",
  },
  {
    slug: "sunshine-jar",
    name: "Sunshine Jar",
    group: "creative",
    year: "2026",
    kind: "PWA",
    pitch: "A shared corkboard of things to do, and a jar to pull one out of.",
    tryIt: "Pin an idea, shake the jar, cross something off and watch it turn into a polaroid on the wall.",
    real: "The real app and its server's route code in the page. Each change would have been a git commit; the DEMO tab shows them.",
    stack: ["Vanilla JS", "Git as the database", "Hand-written Web Push", "Event-sourced status", "Node, zero dependencies"],
    href: "/sunshine-jar/",
    video: "/videos/sunshine-jar.mp4",
    poster: "/videos/sunshine-jar.jpg",
  },
  {
    slug: "meridian",
    name: "Meridian",
    group: "creative",
    year: "2026",
    kind: "3D globe",
    pitch: "Shipment tracking for vehicle exports: a globe of routes, a freight and ETA calculator, a live board.",
    tryIt: "Drag the globe, pick a port to open its lane, then price a shipment in the freight desk.",
    real: "Live site on GitHub Pages.",
    stack: ["React 19", "TypeScript", "three.js globe", "Tailwind", "Framer Motion"],
    href: "https://lone2000.github.io/meridian-motors/",
    external: true,
    repo: "meridian-motors",
    poster: "/videos/meridian.jpg",
  },
  {
    slug: "kobe-direct",
    name: "Kobe Direct",
    group: "creative",
    year: "2026",
    kind: "Marketplace",
    pitch: "A used-car marketplace: search, filter and sort inventory, then a detail page for every vehicle.",
    tryIt: "Filter by make and price, sort, and open a car.",
    real: "Live site on GitHub Pages.",
    stack: ["React 19", "TypeScript", "React Router 7", "Tailwind", "Framer Motion"],
    href: "https://lone2000.github.io/kobe-direct/",
    external: true,
    repo: "kobe-direct",
    poster: "/videos/kobe-direct.jpg",
  },
  {
    slug: "vectraview-qa-bot",
    name: "VectraView QA Bot",
    group: "automation",
    year: "2026",
    kind: "AI QA agent",
    pitch: "Give it a product spec. It writes the test cases, drives the browser and files the bugs.",
    tryIt: "Parse the spec, press Run and watch the agent click through a small app and catch two planted bugs. Fix them and run it again.",
    real: "The spec parser, page snapshot and report code are ported from the Python original. The model's next-step choices are scripted; every pass or fail is checked against the live page.",
    stack: ["Python", "Playwright", "Claude Agent SDK", "HTML reports"],
    href: "/vectraview-qa-bot/",
    video: "/videos/vectraview-qa-bot.mp4",
    poster: "/videos/vectraview-qa-bot.jpg",
  },
  {
    slug: "bubble-database-assistant",
    name: "Bubble Database Assistant",
    group: "automation",
    year: "2026",
    kind: "MCP server",
    pitch: "Ask a Bubble.io database questions in plain English. It can read, never write.",
    tryIt: "Ask how many companies there are, then ask it to delete the test users and watch it refuse.",
    real: "The MCP tool layer and Bubble's filter rules run in the page against an invented CRM. Each answer shows the tool call, the exact API request and the response.",
    stack: ["Node.js", "Model Context Protocol", "Bubble Data API", "Read-only guardrails"],
    href: "/bubble-database-assistant/",
    video: "/videos/bubble-database-assistant.mp4",
    poster: "/videos/bubble-database-assistant.jpg",
  },
  {
    slug: "pci-dss-control-extractor",
    name: "PCI DSS Control Extractor",
    group: "automation",
    year: "2026",
    kind: "Vision pipeline",
    pitch: "296 scanned pages in, 328 clean security controls out, for about $0.40.",
    tryIt: "Replay the pipeline and watch one control merge across a page break, then search the full set and export it as CSV.",
    real: "The parser and merge logic are ported from the Python original and run on the real extracted dataset. The export matches the repo's CSV.",
    stack: ["Python", "Claude Haiku vision", "Resumable runs", "CSV"],
    href: "/pci-dss-control-extractor/",
    repo: "pci-dss-control-extractor",
    video: "/videos/pci-dss-control-extractor.mp4",
    poster: "/videos/pci-dss-control-extractor.jpg",
  },
  {
    slug: "brandvoice",
    name: "BrandVoice",
    group: "automation",
    year: "2026",
    kind: "Human in the loop",
    pitch: "Answer Reddit as your brand, openly. One named account, and a person approves every reply.",
    tryIt: "Try to post without the moderators' permission, delete the disclosure line, or go over the rate limit. The code refuses each one.",
    real: "The guardrails and 28 of the original 30 tests are ported from Python and run in the page. Threads and drafts are invented.",
    stack: ["Python", "PRAW", "Claude", "Guardrail tests"],
    href: "/brandvoice/",
    video: "/videos/brandvoice.mp4",
    poster: "/videos/brandvoice.jpg",
  },
  {
    slug: "personal-assistant",
    name: "Personal Assistant",
    group: "automation",
    year: "2026",
    kind: "Decision support",
    pitch: "A second opinion that shows its working: options, odds, and the facts behind every number.",
    tryIt: "Pick a decision, say which way you lean, then switch off one remembered fact and watch the odds move.",
    real: "The method is the real one. The person, their memory and the scoring rules are invented for the demo.",
    stack: ["Claude Projects", "Memory files", "Deterministic scoring"],
    href: "/personal-assistant/",
    video: "/videos/personal-assistant.mp4",
    poster: "/videos/personal-assistant.jpg",
  },
  {
    slug: "grind-bot",
    name: "Grind Bot",
    group: "automation",
    year: "2026",
    kind: "Discord bot",
    pitch: "Hands out tasks from a Google Sheet, first come first served, to members who pass a karma check.",
    tryIt: "Verify, claim a task, then simulate a rush of eight people and check that nobody gets the same row twice.",
    real: "The bot's rules and messages are ported from the Python original. Discord, Reddit and Sheets are simulated.",
    stack: ["Python", "discord.py", "Google Sheets API", "Reddit API"],
    href: "/grind-bot/",
    repo: "grind-bot",
    video: "/videos/grind-bot.mp4",
    poster: "/videos/grind-bot.jpg",
  },
];

export interface Role {
  title: string;
  org: string;
  place: string;
  start: string;
  end: string;
  points: string[];
}

export const ROLES: Role[] = [
  {
    title: "Software Operations Manager",
    org: "Vectra View",
    place: "Cybersecurity SaaS, USA, remote",
    start: "Dec 2025",
    end: "Sep 2026",
    points: [
      "Owned operations for an audit-compliance product: scoped features with engineering, wrote the specs, and signed off every release after testing it myself.",
      "Built a Claude QA pipeline in n8n that turns each spec into regression and happy-path test cases behind a human sign-off. Test writing time dropped by about half.",
      "Shipped a Claude skill with its own review step that the team adopted for daily work, with a guide I wrote.",
      "Led a small cross-functional group: split ownership, wrote SOPs and ran handovers with nothing dropped.",
    ],
  },
  {
    title: "Marketing Manager, Outbound and Automation",
    org: "Revvye",
    place: "Dubai, remote",
    start: "Jul 2025",
    end: "Now",
    points: [
      "Lead a team of three against daily targets. Tripled monthly outreach, from 1,000 to 3,000 contacts, without adding people.",
      "Built the KPI dashboards and report results to leadership every week.",
      "Built an n8n system of one orchestrator and eight sub-workflows that qualifies accounts and leads and writes everything back to Notion.",
    ],
  },
  {
    title: "PHP and WordPress Developer, Project Coordinator",
    org: "BlackBoardd",
    place: "Remote",
    start: "Mar 2024",
    end: "Jul 2025",
    points: [
      "Delivered client sites end to end for more than ten B2B accounts, from requirements to payment integration and support.",
      "Cut a point-of-sale query from 15 seconds to 3 with indexing and a rewrite. Ran weekly data validation over 5,000+ records.",
    ],
  },
];

export const PRINCIPLES = [
  {
    title: "Say what it does.",
    body: "BrandVoice signs every reply with the company's name. The QA bot marks a check inconclusive rather than guessing. Tools should be honest about what they are.",
  },
  {
    title: "Keep people's things theirs.",
    body: "Starry Post encrypts letters before they leave the browser. The database assistant can read and never write. The demos on this site use invented data.",
  },
  {
    title: "A person decides.",
    body: "Automation does the slow parts. Approvals, releases and anything that can't be undone stay with a human, and the code enforces that.",
  },
];

export const STACK = [
  "TypeScript", "React", "Three.js", "React Three Fiber", "GLSL", "GSAP", "Motion", "Tailwind", "Vite", "Node.js",
  "Cloudflare Pages", "WebCrypto", "Web Push", "Python", "Playwright", "Claude Agent SDK", "MCP", "n8n", "Make.com",
  "SQL", "PostgreSQL", "Google Sheets API",
];

export const EDUCATION = {
  degree: "BS Computer Science",
  school: "University of the People",
  year: "2025",
  detail: "CGPA 3.94, President's List three times, cybersecurity concentration. IELTS Academic 8.0.",
};
