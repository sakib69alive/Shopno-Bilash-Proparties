import { ADMIN_GUIDE, type GuideItem } from "@/content/adminGuide";
import { ADMIN_NAV_GROUPS } from "@/config/navigation";
import { ELEMENT_HELP, PAGE_EXTRAS, PROBLEMS, type PageExtra, type ProblemHelp } from "@/content/simba/knowledge";

/** Pure helpers behind Simba: what page is this, what does a clicked thing mean, what does an error mean. No React here. */

export function guideFor(path: string): GuideItem | null {
  let best: GuideItem | null = null;
  for (const group of ADMIN_GUIDE) {
    for (const item of group.items) {
      if (item.href === "/login") continue;
      const hit = path === item.href || (item.href !== "/admin" && path.startsWith(item.href + "/"));
      if (hit && (!best || item.href.length > best.href.length)) best = item;
    }
  }
  return best;
}

export function extraFor(path: string): PageExtra | null {
  return PAGE_EXTRAS.find((p) => p.test.test(path)) ?? null;
}

/** The project the page is about, when the address is inside a project workspace. */
export function projectIdFrom(path: string): string | undefined {
  const m = path.match(/^\/admin\/projects\/([^/]+)/);
  if (!m || m[1] === "new") return undefined;
  return decodeURIComponent(m[1]);
}

export function problemFor(text: string): ProblemHelp | null {
  return PROBLEMS.find((p) => p.re.test(text)) ?? null;
}

const NAV_LABELS: Record<string, string> = {};
for (const group of ADMIN_NAV_GROUPS) for (const item of group.items) NAV_LABELS[item.href] = item.label;

export interface Explained {
  kind: string;
  name: string;
  /** Plain-words meaning, from the dictionary or a safe generic line for this kind of thing. */
  what: string;
  /** What the screen itself says about it (helper text beside it). */
  says?: string;
  opens?: { label: string; summary?: string };
  careful?: string;
  tip?: string;
  example?: string;
  part?: string;
  required?: boolean;
  disabled?: boolean;
  /** For the highlight colour: buttons and links red, plain text orange. */
  tone: "action" | "text";
}

const clean = (s: string | null | undefined, max = 140) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

const INTERESTING =
  "button, a[href], [role=tab], [role=switch], [role=button], input, select, textarea, label, summary, h1, h2, h3, h4, legend, th, [role=option]";

export function pickTarget(el: Element | null): HTMLElement | null {
  if (!el) return null;
  const hit = (el as HTMLElement).closest?.(INTERESTING) as HTMLElement | null;
  if (hit && hit.tagName === "LABEL") {
    // A label wrapping a switch or tick box stands for that control.
    const inner = hit.querySelector("input, select, textarea") as HTMLElement | null;
    if (inner) return inner;
  }
  if (hit) return hit;
  // Plain text: take the nearest element that is a short block of text.
  let cur: HTMLElement | null = el as HTMLElement;
  for (let i = 0; i < 4 && cur; i++) {
    if (clean(cur.innerText).length > 0 && clean(cur.innerText).length < 400) return cur;
    cur = cur.parentElement;
  }
  return el as HTMLElement;
}

function labelOf(el: HTMLElement): string {
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
    const input = el as HTMLInputElement;
    const fromLabel = input.labels?.[0] ? clean(input.labels[0].innerText) : "";
    if (fromLabel) return fromLabel;
    const aria = el.getAttribute("aria-label");
    if (aria) return clean(aria);
    // A switch inside a row: the row's first line of text is its name.
    const row = el.closest("div, li, label");
    const rowText = clean(row?.querySelector("span, p, label")?.textContent);
    return rowText || clean(input.placeholder) || clean(input.name) || "this field";
  }
  const aria = el.getAttribute("aria-label");
  if (aria) return clean(aria);
  return clean(el.innerText || el.getAttribute("title") || el.textContent) || "this item";
}

function describedBy(el: HTMLElement): string {
  const id = el.getAttribute("aria-describedby");
  if (id) {
    const text = id
      .split(/\s+/)
      .map((i) => document.getElementById(i)?.textContent ?? "")
      .join(" ");
    if (clean(text)) return clean(text, 320);
  }
  return "";
}

/** The small grey explanation the page itself shows near a control. */
function nearbyNote(el: HTMLElement, label: string): string {
  const own = describedBy(el);
  if (own) return own;
  // Only fields and switches carry a helper line beside them, and only when the wrapper holds just that one control.
  if (!/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return "";
  let cur: HTMLElement | null = el.parentElement;
  for (let depth = 0; depth < 3 && cur; depth++) {
    if (cur.querySelectorAll("input, select, textarea, button").length > 2) return "";
    const notes = Array.from(cur.querySelectorAll("p, small, [class*=caption], [class*=helper]")) as HTMLElement[];
    for (const n of notes) {
      const t = clean(n.innerText, 320);
      if (t && t !== label && !label.includes(t) && t.length > 12) return t;
    }
    cur = cur.parentElement;
  }
  return "";
}

function sectionOf(el: HTMLElement): string {
  const fieldset = el.closest("fieldset");
  const legend = fieldset?.querySelector("legend");
  if (legend) return clean(legend.textContent, 80);
  // The nearest heading above it on the page.
  const headings = Array.from(document.querySelectorAll("main h1, main h2, main h3, main legend")) as HTMLElement[];
  let found = "";
  for (const h of headings) {
    if (h === el) continue;
    const pos = h.compareDocumentPosition(el);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) found = clean(h.textContent, 80);
  }
  return found;
}

export function explain(el: HTMLElement): Explained {
  const tag = el.tagName;
  const role = el.getAttribute("role");
  const input = el as HTMLInputElement;
  let kind = "Item";
  let tone: Explained["tone"] = "text";

  if (tag === "A") {
    kind = "Link";
    tone = "action";
  } else if (tag === "BUTTON" || role === "button") {
    kind = "Button";
    tone = "action";
  } else if (role === "tab") {
    kind = "Tab";
    tone = "action";
  } else if (role === "switch" || (tag === "INPUT" && (input.type === "checkbox" || input.type === "radio"))) {
    kind = input.type === "radio" ? "Choice" : "Switch / tick box";
    tone = "action";
  } else if (tag === "INPUT" || tag === "TEXTAREA") {
    kind = "Field";
    tone = "action";
  } else if (tag === "SELECT") {
    kind = "Drop-down";
    tone = "action";
  } else if (/^H[1-4]$/.test(tag) || tag === "LEGEND" || tag === "TH") {
    kind = "Heading";
  } else if (tag === "SUMMARY") {
    kind = "Expander";
    tone = "action";
  } else {
    kind = "Text";
  }

  const name = labelOf(el);
  const entry = ELEMENT_HELP.find((h) => h.re.test(name));

  const generic: Record<string, string> = {
    Button: "Runs an action when you press it. Its label tells what will happen.",
    Link: "Takes you to another screen.",
    Tab: "Switches to another part of the same page.",
    "Switch / tick box": "Turns a setting on or off. It usually takes effect after you press Save.",
    Choice: "Choose one option from the group. Only one can be chosen at a time.",
    Field: "Type the value here. It is stored when you press the form's Save button.",
    "Drop-down": "Choose one value from the list. It is stored when you press Save.",
    Heading: "The title of this part of the page. Everything under it belongs to it.",
    Expander: "Opens or closes more details.",
    Text: "Information shown on the page. You cannot change it here.",
    Item: "Part of this page.",
  };

  const says = kind === "Heading" || kind === "Text" ? "" : nearbyNote(el, name);
  const out: Explained = {
    kind,
    name,
    what: entry?.what ?? generic[kind] ?? generic.Item,
    says: says || undefined,
    careful: entry?.careful,
    tip: entry?.tip,
    part: sectionOf(el) || undefined,
    required: (el as HTMLInputElement).required || el.getAttribute("aria-required") === "true" || undefined,
    disabled: (el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true" || undefined,
    tone,
  };

  if (tag === "INPUT" || tag === "TEXTAREA") {
    const ph = clean((el as HTMLInputElement).placeholder, 100);
    if (ph) out.example = ph;
  }
  if (kind === "Heading" || kind === "Text") {
    const next = el.nextElementSibling as HTMLElement | null;
    const t = clean(next?.innerText, 300);
    if (t && !out.says) out.says = t;
  }
  if (tag === "A") {
    const href = (el as HTMLAnchorElement).getAttribute("href") ?? "";
    if (href.startsWith("/")) {
      const path = href.split("?")[0].split("#")[0];
      const guide = guideFor(path);
      const extra = extraFor(path);
      out.opens = { label: NAV_LABELS[path] ?? extra?.title ?? guide?.label ?? href, summary: guide?.summary ?? extra?.about };
    } else if (href) {
      out.opens = { label: "An outside website" };
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------
// "Ask Simba": one search over everything written down — the setup steps, the Admin Guide, the page notes, the FAQ and the fixes.
// ---------------------------------------------------------------------------------------------------------------------------
import { JOURNEY } from "@/content/simba/journey";
import { FAQ } from "@/content/simba/knowledge";
import { LESSONS } from "@/content/simba/lessons";

/**
 * The text that goes on the clipboard when Simba has no tutorial for a question: instructions + the person's own problem + the
 * whole written guide. Pasted into any AI chat (free or paid), that AI can then walk the person through it, in Bangla or English.
 */
export function buildAiPrompt(problem: string): string {
  const guide = ADMIN_GUIDE.map(
    (g) => `## ${g.label}\n` + g.items.map((i) => `### ${i.label} (${i.href})\n${i.summary}\n${i.details.map((d) => "- " + d).join("\n")}`).join("\n\n"),
  ).join("\n\n");
  const setup = JOURNEY.map((s) => `- ${s.title}: ${s.why} Steps: ${s.how.join(" → ")}`).join("\n");
  const faq = FAQ.map((f) => `- ${f.q} ${f.a.join(" ")}`).join("\n");
  return [
    "You are a patient helper for the admin panel of Shopno Bilash Properties, a real-estate management web app.",
    "Reply in the same language I write in. If I write Bangla, answer in Bangla script (বাংলা), in simple everyday words. If I write English or Banglish, answer in simple English.",
    "Use ONLY the guide below. Give short numbered steps, naming the exact sidebar item and button to press. Ask me one short question if you need to know something first.",
    "If the guide does not cover my problem, say so plainly instead of guessing. Never ask for my password or PIN.",
    "",
    "MY PROBLEM:",
    problem.trim() || "(I will describe it in my next message.)",
    "",
    "=== ADMIN GUIDE ===",
    guide,
    "",
    "=== SETUP ORDER ===",
    setup,
    "",
    "=== COMMON QUESTIONS ===",
    faq,
  ].join("\n");
}

export interface AskResult {
  key: string;
  kind: "Step" | "Page" | "Question" | "Fix" | "Tutorial";
  title: string;
  snippet: string;
  /** Extra lines (steps) shown when the result is opened. */
  lines?: string[];
  href?: string;
  /** For a setup step: which walk-through can show it on screen. */
  tour?: string;
  score: number;
}

const STOP = new Set([
  "the", "a", "an", "to", "of", "and", "or", "in", "on", "for", "how", "do", "i", "my", "is", "it", "can", "want", "please", "now",
  "kore", "kivabe", "kemne", "ki", "ar", "er", "ami", "amar", "ekhon", "korbo", "dibo", "jodi", "hobe", "chai", "ta", "diye", "theke", "ke", "ei", "oi", "je", "na", "hoy",
]);

// Bangla (বাংলা) and Banglish (Roman letters) words that mean the same thing as the English words the guide is written in.
// Tested against the whole question, so endings like কিস্তিগুলো or notice-ta still match.
const SYNONYMS: { re: RegExp; add: string[] }[] = [
  { re: /কিস্তি|কিস্তী|kisti|kist\b|instal+ment|installment/, add: ["installments", "installment", "instalment", "payment"] },
  { re: /নোটিশ|নোটিস|notice|nutish|notis/, add: ["notice", "statements"] },
  { re: /রশিদ|রসিদ|receipt|roshid|rosid|statement|স্টেটমেন্ট/, add: ["receipt", "statements"] },
  { re: /পেমেন্ট|payment|টাকা|taka|joma|জমা|পরিশোধ|দিয়েছ/, add: ["payment", "payments"] },
  { re: /ক্লায়েন্ট|ক্লায়ে|client|কাস্টমার|customer|গ্রাহক|ক্রেতা|kroyeta|মালিক|malik|owner/, add: ["customer", "customers", "owner", "client"] },
  { re: /প্রজেক্ট|প্রকল্প|project/, add: ["project", "projects"] },
  { re: /ফ্ল্যাট|ফ্লাট|flat|ইউনিট|unit|এপার্টমেন্ট|apartment/, add: ["unit", "units", "flat"] },
  { re: /খরচ|khoroch|expense|মালামাল|material|কেনা/, add: ["expense", "expenses", "material"] },
  { re: /বাজেট|budget|ভাগ|split|বন্টন/, add: ["budget", "allocation", "split"] },
  { re: /ছবি|chobi|photo|image|গ্যালারি|gallery/, add: ["gallery", "photo", "image"] },
  { re: /লিংক|লিঙ্ক|link|লগইন|login|লগিন|পিন|pin\b|পাসওয়ার্ড|password/, add: ["link", "login", "pin"] },
  { re: /নির্মাণ|কনস্ট্রাকশন|construction|কাজের|অগ্রগতি|progress/, add: ["construction", "progress"] },
  { re: /ব্যাকআপ|ব্যাক-আপ|backup/, add: ["backup"] },
  { re: /লিড|lead|enquir|জিজ্ঞাসা/, add: ["leads", "enquiries"] },
  { re: /বুকিং|booking/, add: ["booking", "bookings"] },
  { re: /ডকুমেন্ট|document|কাগজ/, add: ["document", "documents"] },
  { re: /ওয়েবসাইট|website|সাইট|public/, add: ["website", "public"] },
  { re: /ফ্লোর|floor|নকশা|নকসা|plan|ব্লুপ্রিন্ট|blueprint|প্ল্যান/, add: ["floor", "plan", "blueprint"] },
  { re: /বিক্রি|বিক্রয়|sale|sell/, add: ["sales", "sale"] },
  { re: /শেয়ার|shareholder/, add: ["shareholders"] },
  { re: /জমির|landowner|জমিদাতা/, add: ["landowners"] },
  { re: /সেটিং|settings|প্রোফাইল|profile|লোগো|logo/, add: ["settings", "company", "profile"] },
];

function tokens(q: string): string[] {
  const lower = q.toLowerCase();
  const words = lower
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
  for (const s of SYNONYMS) if (s.re.test(lower)) words.push(...s.add);
  return Array.from(new Set(words));
}

function scoreText(words: string[], title: string, body: string): number {
  const t = title.toLowerCase();
  const b = body.toLowerCase();
  let s = 0;
  for (const w of words) {
    if (t.includes(w)) s += 5;
    if (b.includes(w)) s += 1;
  }
  return s;
}

const short = (s: string, n = 150) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

export function askSimba(query: string): AskResult[] {
  const words = tokens(query);
  if (words.length === 0) return [];
  const out: AskResult[] = [];

  for (const s of JOURNEY) {
    const score = scoreText(words, s.title, `${s.why} ${s.how.join(" ")} ${s.where ?? ""}`);
    if (score > 0) out.push({ key: `j-${s.id}`, kind: "Step", title: s.title, snippet: short(s.why), lines: s.how, href: s.href, tour: s.id, score: score + 2 });
  }
  for (const l of LESSONS) {
    const score = scoreText(words, l.title, `${l.summary} ${l.steps.map((st) => st.say).join(" ")}`);
    if (score > 0) out.push({ key: `l-${l.id}`, kind: "Tutorial", title: l.title, snippet: short(l.summary), tour: l.id, score: score + 6 });
  }
  for (const group of ADMIN_GUIDE) {
    for (const item of group.items) {
      const score = scoreText(words, item.label, `${item.summary} ${item.details.join(" ")}`);
      if (score > 0) out.push({ key: `g-${item.href}-${item.label}`, kind: "Page", title: item.label, snippet: short(item.summary), lines: item.details.slice(0, 4).map((d) => short(d, 220)), href: item.href, score });
    }
  }
  for (const f of FAQ) {
    const score = scoreText(words, f.q, f.a.join(" "));
    if (score > 0) out.push({ key: `f-${f.q}`, kind: "Question", title: f.q, snippet: short(f.a[0]), lines: f.a, href: f.href, score: score + 1 });
  }
  for (const p of PROBLEMS) {
    const score = scoreText(words, p.title, p.fix.join(" ")) + (p.re.test(query) ? 6 : 0);
    if (score > 0) out.push({ key: `p-${p.title}`, kind: "Fix", title: p.title, snippet: short(p.fix[0]), lines: p.fix, score });
  }
  for (const e of PAGE_EXTRAS) {
    const score = scoreText(words, e.title, `${e.about} ${e.steps.join(" ")}`);
    if (score > 0) out.push({ key: `x-${e.title}`, kind: "Page", title: e.title, snippet: short(e.about), lines: e.steps, score });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 8);
}

// ---------------------------------------------------------------------------------------------------------------------------
// The full tour: every single option in the sidebar, one by one, in the order they appear, each with what it is.
// ---------------------------------------------------------------------------------------------------------------------------
import { hasPermission } from "@/lib/permissions";
import type { RoleName } from "@/config/roles";
import type { Tour, TourStep } from "@/content/simba/tours";

function firstSentences(text: string, max = 230): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "));
  return (stop > 80 ? cut.slice(0, stop + 1) : cut.trimEnd() + "…");
}

const EXTRA_SAY: Record<string, string> = {
  "/admin/public-page": "A button for every part of the public website. Press one, choose the project if asked, and you land on the exact box to change.",
  "/admin/client-page": "A button for everything the client app shows: plans, owners, payments, construction, documents and each client's access link.",
  "/admin/money-page": "Every money job in one place, the most used on top: payments, installments, budget splits, expenses, sales and reports.",
  "/admin/clients": "Every client in one table with their budget, what they paid and what is left.",
  "/admin/settings/demo-data": "Clears the practice data so you can start with your real business. Super Admin only — download a backup first.",
  "/admin/help": "The full written guide for every page, always available.",
  "/admin/sales/payments/new": "Do it now: write down a payment a client made.",
  "/admin/statements": "Do it now: make a notice, receipt or statement on the letterhead and send it.",
  "/admin/finance/cost-allocations/new": "Do it now: split a cost across the owners, with a preview before saving.",
  "/admin/customers/new": "Do it now: add a new customer.",
};

export function buildFullTour(role: RoleName): Tour {
  const steps: TourStep[] = [
    { find: ["search projects"], say: "The search bar finds any project, flat, owner or lead from any page." },
    { find: ["notifications"], say: "The bell shows your newest alerts." },
  ];
  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      if (item.comingSoon) continue;
      if (item.permission && !hasPermission(role, item.permission)) continue;
      const guide = guideFor(item.href);
      const exact = guide && guide.href === item.href ? guide : null;
      const about = EXTRA_SAY[item.href] ?? (exact ? firstSentences(exact.summary) : extraFor(item.href)?.about ? firstSentences(extraFor(item.href)!.about) : "Open it to see what is inside; press Page in my panel for its guide.");
      steps.push({ href: item.href, find: [item.label], say: `${group.label} › ${item.label}: ${about}` });
    }
  }
  steps.push({ say: "That was every option. I am always at the bottom right: Today shows what needs you, Steps takes you from 0 to 100%, Page explains the page you are on, Ask answers questions, and Explain what I click explains any button." });
  return { id: "full", title: "Every option, one by one", startHref: "/admin", steps };
}
