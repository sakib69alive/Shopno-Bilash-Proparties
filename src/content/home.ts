/**
 * All homepage storytelling copy/data in one place, typed, so a future
 * Admin Panel can own and edit this content without any homepage
 * component needing to change — components only ever read these shapes.
 */

export interface Statistic {
  label: string;
  /** null = not populated yet (Admin hasn't set a real figure). Never fake a number — render a placeholder instead. */
  value: number | null;
  suffix?: string;
}

export const companyStatement =
  "Development is a promise. We build ours to last.";

export const approach = {
  statement:
    "Good development isn't rushed. It's planned, built and delivered with intention — every time.",
  principles: [
    {
      title: "Thoughtful Planning",
      description:
        "Every project starts with the land, the neighborhood and the people who'll live there — not a floor plan.",
    },
    {
      title: "Durable Construction",
      description:
        "We build for decades of use, not just a handover date, with materials and methods chosen to last.",
    },
    {
      title: "Transparent Process",
      description:
        "Landowners, buyers and partners see clear terms and real progress — never guesswork.",
    },
    {
      title: "Long-Term Value",
      description:
        "We measure a project by what it's worth to the people who own it ten years on.",
    },
  ],
};

export const capabilities = [
  {
    title: "Property Development",
    description:
      "We plan and develop residential projects on our own land, engineered for long-term value.",
    links: [{ label: "Explore our projects", href: "/projects" }, { label: "See construction progress", href: "/construction" }, { label: "Our story", href: "/about" }],
  },
  {
    title: "Construction & Delivery",
    description:
      "In-house project management sees every development through, from ground-breaking to handover.",
    links: [{ label: "See construction in progress", href: "/construction" }, { label: "Explore our projects", href: "/projects" }, { label: "Talk to our team", href: "/contact?type=construction" }],
  },
  {
    title: "Property Sales",
    description:
      "We offer individual units and full developments directly, with transparent pricing and documentation.",
    links: [{ label: "Browse available properties", href: "/properties" }, { label: "Explore our projects", href: "/projects" }, { label: "Enquire about a property", href: "/contact?type=property" }],
  },
  {
    title: "Landowner Partnerships",
    description:
      "We develop on landowners' land through structured joint-venture agreements, sharing value fairly.",
    links: [{ label: "Landowners & joint ventures", href: "/landowners" }, { label: "Talk about your land", href: "/contact?type=land-jv" }],
  },
  {
    title: "Investment Opportunities",
    description:
      "We create structured opportunities for investors to participate in our developments.",
    links: [{ label: "Investment opportunities", href: "/landowners#investment" }, { label: "Talk to us about investing", href: "/contact?type=investment" }],
  },
  {
    title: "Project Management",
    description:
      "Every project is planned, tracked and delivered under a single accountable team.",
    links: [{ label: "Talk to our team", href: "/contact?type=general" }, { label: "Explore our projects", href: "/projects" }, { label: "About us", href: "/about" }],
  },
];

export interface FeaturedProjectContent {
  name: string;
  location: string;
  category: string;
  description: string;
  href: string;
  image: { src: string; alt: string };
}

/** No development is currently spotlighted — set to a real project once one exists (see FeaturedDevelopment's honest fallback for the null state). */
export const featuredProject: FeaturedProjectContent | null = null;

/** Not populated yet — each stat renders an honest "—" (never a fake number) until real figures exist. See StatCounter. */
export const stats: Statistic[] = [
  { label: "Completed Projects", value: null },
  { label: "Units Delivered", value: null },
  { label: "Years of Experience", value: null },
  { label: "Landowner Partnerships", value: null },
];

export const trust = {
  statement: "We measure success in decades, not quarters.",
  pillars: [
    {
      title: "Transparent Contracts",
      description: "Every agreement — with buyers, landowners or partners — is written to be understood, not just signed.",
    },
    {
      title: "Engineered Quality",
      description: "Structural and material decisions are made for durability first, cost second.",
    },
    {
      title: "Accountable Delivery",
      description: "One team owns each project from planning to handover — no handoffs, no disappearing after the sale.",
    },
  ],
};

export const nextExploration = [
  {
    title: "Projects",
    description: "Every development we're currently building.",
    href: "/projects",
  },
  {
    title: "Properties",
    description: "Available units, ready to reserve or buy.",
    href: "/properties",
  },
  {
    title: "About",
    description: "Who we are and how we work.",
    href: "/about",
  },
  {
    title: "Services",
    description: "What we offer landowners, buyers and investors.",
    href: "/services",
  },
];
