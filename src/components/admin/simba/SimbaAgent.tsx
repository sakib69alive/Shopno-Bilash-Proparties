"use client";

import { useUiLanguage } from "@/components/ui/UiLanguage";
import { AdminText } from "@/components/admin/AdminLanguage";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  Circle,
  Copy,
  Download,
  GraduationCap,
  LifeBuoy,
  ListChecks,
  Play,
  Sun,
  MousePointerClick,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { JOURNEY, MAJOR_WEIGHT, OPTIONAL_WEIGHT, type JourneyStep } from "@/content/simba/journey";
import { FAQ, PROBLEMS } from "@/content/simba/knowledge";
import { TOURS, WELCOME_TOUR, type Tour } from "@/content/simba/tours";
import { FULL_DEMO, LESSONS, SAMPLE_FILES } from "@/content/simba/lessons";
import type { RoleName } from "@/config/roles";
import type { SimbaStatus } from "@/features/simba/status";
import { askSimba, buildAiPrompt, buildFullTour, explain, extraFor, guideFor, pickTarget, problemFor, projectIdFrom, type AskResult, type Explained } from "./simbaHelp";
import { SimbaTour } from "./SimbaTour";
import { FINANCE_PROJECT_EVENT, FINANCE_SELECT_EVENT, FinanceMode } from "../finance/FinanceAssistant";
import { financePage, type FinanceSelection } from "@/lib/financeAssistant";

type Tab = "today" | "next" | "learn" | "page" | "project" | "ask" | "finance";

interface Notice {
  message: string;
  title?: string;
  fix?: string[];
}

const RED = "#e5484d";
const ORANGE = "#f59e0b";

function Ring({ percent, size = 64 }: { percent: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6} className="stroke-border" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * percent) / 100}
          className="stroke-accent transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="text-body-sm text-fg absolute inset-0 flex items-center justify-center font-semibold tabular-nums">{percent}%</span>
    </div>
  );
}

function weightedPercent(items: { done: boolean; major: boolean }[]): number {
  let total = 0;
  let done = 0;
  for (const i of items) {
    const w = i.major ? MAJOR_WEIGHT : OPTIONAL_WEIGHT;
    total += w;
    if (i.done) done += w;
  }
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

interface Row {
  id: string;
  title: string;
  major: boolean;
  done: boolean;
  detail?: string;
  why: string;
  how: string[];
  href: string;
  /** A walk-through that can show this step on screen. */
  tour?: string;
}

function translateSetupDetail(detail: string, t: (text: string) => string) {
  const translated = t(detail);
  if (translated !== detail) return translated;

  return detail.split(", ").map((part) => {
    const match = /^(\d+) (staff accounts?|projects?|buildings?|floors?|units?|parking spots?|customers?|shareholders?|landowners?|sales?|installments?|payments?|budgets?|cost splits?|phases?|vendors?|purchases?|documents?)$/.exec(part);
    return match ? `${match[1]} ${t(match[2])}` : part;
  }).join(", ");
}

function ChecklistRow({ row, open, onToggle, onTour }: { row: Row; open: boolean; onToggle: () => void; onTour?: (id: string) => void }) {
  const { locale, t } = useUiLanguage();
  const detail = row.detail && (locale === "bn" ? translateSetupDetail(row.detail, t) : row.detail);
  return (
    <li className="border-border overflow-hidden rounded-xl border bg-surface-raised">
      <button type="button" onClick={onToggle} aria-expanded={open} className="hover:bg-surface flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors">
        <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full", row.done ? "bg-accent text-accent-foreground" : "border-border-strong border")}>
          {row.done ? <Check aria-hidden className="size-3.5" /> : <Circle aria-hidden className="size-2 opacity-0" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("text-body-sm block font-medium", row.done && "text-fg-muted")}><AdminText>{row.title}</AdminText></span>
          {detail && <span className="text-caption text-fg-subtle block truncate">{detail}</span>}
        </span>
        <ChevronDown aria-hidden className={cn("text-fg-subtle size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-border border-t px-3 py-3">
          <p className="text-body-sm text-fg-muted"><AdminText>{row.why}</AdminText></p>
          <ol className="text-body-sm text-fg mt-2 list-decimal space-y-1 pl-5">
            {row.how.map((h) => (
              <li key={h}><AdminText>{h}</AdminText></li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {row.tour && onTour && (
              <button type="button" onClick={() => onTour(row.tour!)} className="text-body-sm bg-accent text-accent-foreground inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-semibold">
                <Play aria-hidden className="size-3.5" />
                <AdminText>{"Show me on screen"}</AdminText>
              </button>
            )}
            <Link href={row.href} className="text-body-sm text-accent inline-flex items-center gap-1.5 font-semibold">
              <AdminText>{row.done ? "Open it" : "Take me there"}</AdminText>
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </div>
      )}
    </li>
  );
}

function Checklist({ rows, label, onTour }: { rows: Row[]; label?: string; onTour?: (id: string) => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const major = rows.filter((r) => r.major);
  const optional = rows.filter((r) => !r.major);
  const group = (title: string, list: Row[], hint: string) =>
    list.length > 0 && (
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <p className="text-label text-fg-subtle uppercase"><AdminText>{title}</AdminText></p>
          <p className="text-caption text-fg-subtle">
            {list.filter((r) => r.done).length}/{list.length} · <AdminText>{hint}</AdminText>
          </p>
        </div>
        <ul className="flex flex-col gap-1.5">
          {list.map((r) => (
            <ChecklistRow key={r.id} row={r} open={openId === r.id} onToggle={() => setOpenId(openId === r.id ? null : r.id)} onTour={onTour} />
          ))}
        </ul>
      </div>
    );
  return (
    <div className="flex flex-col gap-4">
      {label && <p className="text-body-sm text-fg-muted"><AdminText>{label}</AdminText></p>}
      {group("Must do", major, "needed before it is useful")}
      {group("Optional", optional, "nice to have")}
    </div>
  );
}

function NextCard({ row, who }: { row: Row | null; who: string }) {
  if (!row)
    return (
      <div className="bg-accent-soft text-accent-strong rounded-2xl p-4">
        <p className="text-body-sm font-semibold">Everything important is done in {who}.</p>
        <p className="text-caption mt-1">Check the optional items below, or ask me about any page.</p>
      </div>
    );
  return (
    <div className="bg-accent text-accent-foreground rounded-2xl p-4">
      <p className="text-caption tracking-wide uppercase opacity-80"><AdminText>{"Do this next"}</AdminText></p>
      <p className="mt-1 text-[1.05rem] leading-snug font-semibold"><AdminText>{row.title}</AdminText></p>
      <p className="text-body-sm mt-1.5 opacity-90"><AdminText>{row.why}</AdminText></p>
      <Link href={row.href} className="text-body-sm mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-2 font-semibold hover:bg-white/25">
        <AdminText>{"Take me there"}</AdminText>
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </div>
  );
}

function ExplainCard({ info, onClose }: { info: Explained; onClose: () => void }) {
  const { t: adminCopy } = useUiLanguage();
  const accent = info.tone === "action" ? RED : ORANGE;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-caption inline-block rounded-full px-2 py-0.5 font-semibold text-white" style={{ backgroundColor: accent }}>
            {info.kind}
          </span>
          <p className="text-h5 text-fg mt-1.5 leading-snug break-words">{info.name}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={adminCopy("Close explanation")} className="text-fg-muted hover:bg-surface -mt-1 -mr-1 flex size-8 shrink-0 items-center justify-center rounded-full">
          <X aria-hidden className="size-4" />
        </button>
      </div>
      <div>
        <p className="text-label text-fg-subtle uppercase">What it does</p>
        <p className="text-body-sm text-fg mt-1"><AdminText>{info.what}</AdminText></p>
      </div>
      {info.says && (
        <div>
          <p className="text-label text-fg-subtle uppercase">What the page says</p>
          <p className="text-body-sm text-fg-muted mt-1">{info.says}</p>
        </div>
      )}
      {info.opens && (
        <div>
          <p className="text-label text-fg-subtle uppercase">Opens</p>
          <p className="text-body-sm text-fg mt-1 font-medium"><AdminText>{info.opens.label}</AdminText></p>
          {info.opens.summary && <p className="text-body-sm text-fg-muted mt-0.5"><AdminText>{info.opens.summary}</AdminText></p>}
        </div>
      )}
      {info.example && (
        <p className="text-body-sm text-fg-muted">
          <span className="text-fg font-medium">Example: </span>
          {info.example}
        </p>
      )}
      {(info.required || info.disabled) && (
        <p className="text-body-sm text-fg-muted">
          {info.required && <span className="text-fg font-medium">Required — </span>}
          {info.required && "it must be filled before Save will work. "}
          {info.disabled && "It is greyed out right now: something has to be done first (fill the required fields, choose something above it, or your role may not allow it)."}
        </p>
      )}
      {info.careful && (
        <div role="note" className="bg-error-soft text-error flex gap-2 rounded-xl p-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{info.careful}</p>
        </div>
      )}
      {info.tip && (
        <p className="text-body-sm text-fg-muted">
          <span className="text-fg font-medium">Tip: </span>
          {info.tip}
        </p>
      )}
      {info.part && <p className="text-caption text-fg-subtle">Part of: {info.part}</p>}
    </div>
  );
}

export function SimbaAgent({ role }: { role: RoleName }) {
  const { t: adminCopy } = useUiLanguage();
  const pathname = usePathname();
  const finance = financePage(pathname);
  const financeAvailable = !!finance && hasPermission(role, "finance.view") &&
    (finance.tab !== "report" || hasPermission(role, "reports.view")) &&
    (finance.tab !== "installment" || hasPermission(role, "sales.view"));
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("next");
  const [financeSelection, setFinanceSelection] = useState<{ path: string; selection: FinanceSelection }>();
  const [financeFilter, setFinanceFilter] = useState<{ path: string; project: string }>();
  const [status, setStatus] = useState<SimbaStatus | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [explainOn, setExplainOn] = useState(false);
  const [picked, setPicked] = useState<Explained | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [greeted, setGreeted] = useState(true);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const [tour, setTour] = useState<{ tour: Tour; index: number } | null>(null);
  const [tourDone, setTourDone] = useState(true);
  const [tourAuto, setTourAuto] = useState(false);
  const [tourPlaying, setTourPlaying] = useState(false);
  const [tourHold, setTourHold] = useState<string | undefined>();
  const [cleaning, setCleaning] = useState<string | null>(null);
  const highlight = useRef<HTMLDivElement>(null);
  const projectId = projectIdFrom(pathname);

  function startTour(id: string | Tour, opts?: { auto?: boolean }) {
    const base = typeof id === "string" ? (TOURS[id] ?? LESSONS.find((l) => l.id === id)) : id;
    if (!base) return;
    // Steps that need the demo records to exist only make sense when Simba is doing the work.
    const t: Tour = opts?.auto ? base : { ...base, steps: base.steps.filter((st) => !st.autoOnly) };
    setOpen(false);
    setPicked(null);
    setExplainOn(false);
    setTourAuto(!!opts?.auto);
    setTourPlaying(!!opts?.auto);
    if (!t.steps[0]?.go && pathname !== t.startHref) router.push(t.startHref);
    setTour({ tour: t, index: 0 });
  }
  // A tour step that points at a page opens that page, so what you read about is what is on screen behind the card.
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);
  const tourIndex = tour?.index;
  const tourId = tour?.tour.id;
  const [tourNote, setTourNote] = useState<string | undefined>();
  useEffect(() => {
    if (tourIndex === undefined || !tourId) return;
    const step = tour?.tour.steps[tourIndex];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the note and the wait belong to the step that just began
    setTourNote(undefined);
    setTourHold(undefined);
    const target = step?.go ?? step?.href;
    if (!target) return;
    let cancelled = false;
    (async () => {
      let ids = (status?.ids ?? {}) as unknown as Record<string, string | undefined>;
      // The demo's own records are new, so ask for fresh ones rather than trusting what was fetched a while ago.
      if (/\{demo/.test(target) || Object.keys(ids).length === 0) {
        try {
          const res = await fetch("/api/admin/simba", { cache: "no-store" });
          if (res.ok) ids = (((await res.json()) as SimbaStatus).ids as unknown as Record<string, string | undefined>) ?? ids;
        } catch {
          /* use what we have */
        }
      }
      if (cancelled) return;
      let missing = "";
      const resolved = target.replace(/\{(\w+)\}/g, (_m, key: string) => {
        const value = ids[key];
        if (!value) missing = key;
        return value ? encodeURIComponent(value) : "";
      });
      if (missing) {
        setTourNote("There is no " + missing.replace(/([A-Z])/g, " $1").toLowerCase() + " yet, so I cannot open that page. Create one first, then replay this lesson.");
        setTourHold("none");
        return;
      }
      setTourHold(resolved.split("?")[0]);
      if (pathRef.current !== resolved) router.push(resolved);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the step changes
  }, [tourIndex, tourId]);

  function stopTour(finished: boolean) {
    if (tour?.tour.id === "welcome" || tour?.tour.id === "full") {
      try {
        window.localStorage.setItem("simba-tour-done", "1");
      } catch {
        /* fine */
      }
      setTourDone(true);
    }
    if (finished) setTab("next");
    setTour(null);
  }

  // ---------- live status: fetched when the panel opens, on every page change, on focus, and every few seconds while open ----------
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/simba${projectId ? `?project=${encodeURIComponent(projectId)}` : ""}`, { cache: "no-store" });
      if (!res.ok) throw new Error("bad");
      setStatus((await res.json()) as SimbaStatus);
      setUpdatedAt(Date.now());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [projectId]);

  useEffect(() => {
    // The first look (for the badge on the avatar) and a fresh look after every page change.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the fetch's own result sets state
    void load();
  }, [load, pathname]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => void load(), 8000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [open, load]);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads a one-time greeting flag
      setGreeted(window.sessionStorage.getItem("simba-greeted") === "1");
      setTourDone(window.localStorage.getItem("simba-tour-done") === "1");
    } catch {
      setGreeted(true);
    }
  }, []);

  // ---------- explain mode: highlight what is under the mouse, and explain what is clicked instead of doing it ----------
  useEffect(() => {
    if (!explainOn) {
      if (highlight.current) highlight.current.style.display = "none";
      return;
    }
    const inside = (t: EventTarget | null) => (t instanceof Element ? !!t.closest("[data-simba]") : false);
    let raf = 0;
    function onMove(e: MouseEvent) {
      if (inside(e.target)) {
        if (highlight.current) highlight.current.style.display = "none";
        return;
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = pickTarget(e.target as Element);
        const box = highlight.current;
        if (!el || !box) return;
        const r = el.getBoundingClientRect();
        const action = explain(el).tone === "action";
        const color = action ? RED : ORANGE;
        Object.assign(box.style, {
          display: "block",
          left: `${r.left - 3}px`,
          top: `${r.top - 3}px`,
          width: `${r.width + 6}px`,
          height: `${r.height + 6}px`,
          borderColor: color,
          boxShadow: `0 0 0 3px ${color}33`,
        });
      });
    }
    function onClick(e: MouseEvent) {
      if (inside(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      const el = pickTarget(e.target as Element);
      if (!el) return;
      setPicked(explain(el));
      setOpen(true);
    }
    function onBlockSubmit(e: Event) {
      if (!inside(e.target)) e.preventDefault();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setExplainOn(false);
    }
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onBlockSubmit, true);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onBlockSubmit, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [explainOn]);

  // Escape pauses a tour that is playing by itself.
  useEffect(() => {
    if (!tour || !tourPlaying) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setTourPlaying(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [tour, tourPlaying]);

  // ---------- trouble watcher: when the page shows a red error message, Simba says what it means ----------
  useEffect(() => {
    let timer = 0;
    function check(root: ParentNode) {
      const alert = (root as Element).matches?.("[role=alert]") ? (root as Element) : root.querySelector?.("[role=alert]");
      if (!alert || alert.closest("[data-simba]")) return;
      const message = (alert.textContent ?? "").replace(/\s+/g, " ").trim();
      if (!message || message.length > 400) return;
      const p = problemFor(message);
      setNotice({ message, title: p?.title, fix: p?.fix ?? ["Read the message, fix the field it names, then press Save again.", "If it keeps happening, open Problems for more help."] });
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setNotice(null), 30000);
    }
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node instanceof Element) check(node);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  // ---------- before saving: when the browser blocks a form for an empty required field, say which; warn softly about a price of 0 ----------
  useEffect(() => {
    let timer = 0;
    let lastInvalid = 0;
    function say(n: Notice) {
      setNotice(n);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setNotice(null), 20000);
    }
    function nameOf(el: HTMLInputElement) {
      return (el.labels?.[0]?.innerText ?? el.getAttribute("aria-label") ?? el.placeholder ?? el.name ?? "a field").replace(/\s+/g, " ").trim();
    }
    function onInvalid(e: Event) {
      const el = e.target as HTMLInputElement;
      if (!(el instanceof HTMLElement) || el.closest("[data-simba]")) return;
      if (Date.now() - lastInvalid < 400) return; // only the first blocked field per press
      lastInvalid = Date.now();
      const name = nameOf(el);
      say({ message: name + " is required", title: "A field still needs filling", fix: ['Fill in "' + name + '", then press Save again.', "Required fields are marked; the rest can stay empty."] });
    }
    function onSubmit(e: Event) {
      const form = e.target as HTMLFormElement;
      if (!(form instanceof HTMLFormElement) || form.closest("[data-simba]") || !form.closest("main")) return;
      const money = Array.from(form.querySelectorAll<HTMLInputElement>("input")).filter((i) => /price|amount|charge/i.test(i.name + " " + i.id) && i.type !== "hidden" && !i.readOnly);
      const zero = money.filter((i) => i.value.trim() !== "" && Number(i.value.replace(/,/g, "")) === 0);
      if (zero.length > 0) {
        say({
          message: nameOf(zero[0]) + " is 0",
          title: "A money amount is 0",
          fix: ["If that is on purpose (no extra charge, for example), carry on.", "If not, enter the real amount and save again — totals and installments are worked out from it."],
        });
      }
    }
    document.addEventListener("invalid", onInvalid, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("invalid", onInvalid, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  useEffect(() => {
    // A new page clears the old trouble note and the old explanation.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on navigation
    setNotice(null);
    setPicked(null);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !explainOn) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, explainOn]);

  // ---------- what to show ----------
  const journeyRows: Row[] = useMemo(
    () =>
      JOURNEY.filter((s) => !s.permission || hasPermission(role, s.permission)).map((s: JourneyStep) => {
        const live = status?.journey.find((j) => j.id === s.id);
        return { id: s.id, title: s.title, major: s.major, done: live?.done ?? false, detail: live?.detail, why: s.why, how: s.how, href: s.href, tour: TOURS[s.id] ? s.id : undefined };
      }),
    [role, status],
  );
  const journeyPercent = weightedPercent(journeyRows);
  const nextMajor = journeyRows.find((r) => r.major && !r.done) ?? null;

  const projectRows: Row[] = useMemo(
    () => (status?.project?.checks ?? []).map((c) => ({ id: c.id, title: c.label, major: c.major, done: c.done, detail: c.detail, why: c.why, how: [c.how], href: c.href })),
    [status],
  );
  const projectPercent = weightedPercent(projectRows);
  const projectNext = projectRows.find((r) => r.major && !r.done) ?? null;
  const showProject = !!projectId && !!status?.project;

  const guide = guideFor(pathname);
  const extra = extraFor(pathname);
  const [showAllNotes, setShowAllNotes] = useState(false);

  const q = query.trim();
  const results = useMemo(() => askSimba(q), [q]);
  const matchedProblem = q.length > 2 ? PROBLEMS.find((p) => p.re.test(q)) : undefined;
  const attention = status?.attention;
  const attentionCount = (attention?.today.length ?? 0) + (attention?.warnings.length ?? 0);

  function openPanel() {
    if (!open && financeAvailable) {
      setPicked(null);
      setExplainOn(false);
      setFinanceSelection(undefined);
      setTab("finance");
    }
    setOpen(!open);
    try {
      window.sessionStorage.setItem("simba-greeted", "1");
    } catch {
      /* fine */
    }
    setGreeted(true);
  }

  const openPanelRef = useRef(openPanel);
  useEffect(() => {
    openPanelRef.current = openPanel;
  });
  useEffect(() => {
    const onToggle = () => openPanelRef.current();
    function onShortcut(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.isComposing || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || event.key !== "`") return;
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable]:not([contenteditable=false]), [role=textbox]")) return;
      event.preventDefault();
      onToggle();
    }
    window.addEventListener("simba:toggle", onToggle);
    document.addEventListener("keydown", onShortcut);
    return () => {
      window.removeEventListener("simba:toggle", onToggle);
      document.removeEventListener("keydown", onShortcut);
    };
  }, []);
  useEffect(() => {
    if (!financeAvailable) return;
    function selectFinance(event: Event) {
      const detail = (event as CustomEvent<{ path: string; selection: FinanceSelection }>).detail;
      if (detail.path !== pathname) return;
      setFinanceSelection(detail);
      setExplainOn(false);
      setPicked(null);
      setTab("finance");
      setOpen(true);
    }
    function filterFinance(event: Event) {
      const detail = (event as CustomEvent<{ path: string; project: string }>).detail;
      if (detail.path !== pathname) return;
      setFinanceFilter(detail);
      setFinanceSelection(undefined);
    }
    window.addEventListener(FINANCE_SELECT_EVENT, selectFinance);
    window.addEventListener(FINANCE_PROJECT_EVENT, filterFinance);
    return () => {
      window.removeEventListener(FINANCE_SELECT_EVENT, selectFinance);
      window.removeEventListener(FINANCE_PROJECT_EVENT, filterFinance);
    };
  }, [financeAvailable, pathname]);
  const hasAttention = attentionCount > 0 || !!notice;
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("simba:state", { detail: { open, attention: hasAttention } }));
  }, [open, hasAttention]);

  const tabs: { key: Tab; label: string; icon: typeof ListChecks }[] = [
    { key: "today", label: "Today", icon: Sun },
    { key: "next", label: "Steps", icon: ListChecks },
    { key: "learn", label: "Learn", icon: GraduationCap },
    { key: "page", label: "Page", icon: Sparkles },
    ...(showProject ? [{ key: "project" as const, label: "Project", icon: ListChecks }] : []),
    { key: "ask", label: "Ask", icon: LifeBuoy },
  ];
  const activeTab = (tab === "project" && !showProject) || (tab === "finance" && !financeAvailable) ? "next" : tab;
  const financeMode = activeTab === "finance" && !picked;
  // No pop-up nudges: the guide waits quietly until it is opened.
  const showWelcomeOffer = false && !greeted && !open && !tour;

  return (
    <div data-simba className={cn("print:hidden", !financeAvailable && "hidden lg:block")}>
      {/* hover outline while explain mode is on */}
      <div ref={highlight} aria-hidden className="pointer-events-none fixed z-[80] hidden rounded-md border-2 transition-[left,top,width,height] duration-75" />

      {explainOn && (
        <div className="fixed top-20 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-3 rounded-full bg-[#1c1b19] px-4 py-2.5 text-white shadow-xl lg:left-[calc(50%+8rem)]">
          <MousePointerClick aria-hidden className="size-4" />
          <span className="text-body-sm">
            <AdminText>{"Click anything — I will explain it. "}</AdminText><span className="opacity-60"><AdminText>{"Nothing you click will run."}</AdminText></span>
          </span>
          <button type="button" onClick={() => setExplainOn(false)} className="text-body-sm rounded-full bg-white/15 px-3 py-1 font-semibold hover:bg-white/25">
            <AdminText>{"Stop"}</AdminText>
          </button>
        </div>
      )}

      {/* trouble note */}
      {notice && !open && (
        <div role="status" className="border-border bg-surface-raised fixed top-[4.5rem] right-6 z-[70] w-[22rem] rounded-2xl border p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <img src="/simba.webp" alt="" className="size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <p className="text-body-sm text-fg font-semibold"><AdminText>{notice.title ?? "I saw a problem"}</AdminText></p>
              <p className="text-caption text-fg-subtle mt-0.5 line-clamp-2">“<AdminText>{notice.message}</AdminText>”</p>
              <ul className="text-body-sm text-fg-muted mt-2 list-disc space-y-0.5 pl-4">
                {notice.fix?.map((f) => (
                  <li key={f}><AdminText>{f}</AdminText></li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => { setTab("ask"); setOpen(true); }} className="text-body-sm text-accent font-semibold">
                  <AdminText>{"More help"}</AdminText>
                </button>
                <button type="button" onClick={() => setNotice(null)} className="text-body-sm text-fg-subtle">
                  <AdminText>{"Dismiss"}</AdminText>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* the panel */}
      {open && (
        <section
          role="dialog"
          aria-label={adminCopy("Simba, your admin helper")}
          className="border-border bg-bg fixed top-[calc(4.5rem+env(safe-area-inset-top))] right-3 left-3 z-[70] flex max-h-[min(42rem,calc(100dvh-6rem-env(safe-area-inset-top)))] flex-col overflow-hidden rounded-3xl border shadow-[0_24px_60px_rgb(0_0_0/0.22)] sm:right-6 sm:left-auto sm:w-[27rem]"
        >
          <header className="from-accent to-accent-strong text-accent-foreground flex items-center gap-3 bg-gradient-to-br px-5 py-4">
            <img src="/simba.webp" alt="" className="size-12 shrink-0 rounded-full bg-white/90 object-cover p-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-[1.05rem] leading-tight font-semibold">Simba</p>
              <p className="text-caption opacity-80">{adminCopy(financeMode ? "Finance mode" : "Your guide through the admin panel")}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label={adminCopy("Close Simba")} className="flex size-9 items-center justify-center rounded-full hover:bg-white/15">
              <X aria-hidden className="size-5" />
            </button>
          </header>

          {picked ? (
            <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
              <ExplainCard info={picked} onClose={() => setPicked(null)} />
              <div className="mt-5 flex gap-2">
                {!explainOn && (
                  <button type="button" onClick={() => { setPicked(null); setExplainOn(true); }} className="text-body-sm bg-accent text-accent-foreground rounded-full px-4 py-2 font-semibold">
                    <AdminText>{"Explain something else"}</AdminText>
                  </button>
                )}
                <button type="button" onClick={() => setPicked(null)} className="text-body-sm border-border text-fg rounded-full border px-4 py-2 font-semibold">
                  <AdminText>{"Back to my guide"}</AdminText>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="border-border flex items-center justify-between gap-3 border-b px-5 py-3">
                <p className="text-body-sm text-fg-muted"><AdminText>{"Not sure what something is?"}</AdminText></p>
                <button
                  type="button"
                  onClick={() => {
                    setExplainOn(true);
                    setOpen(false);
                  }}
                  className="text-body-sm border-border text-fg hover:bg-surface inline-flex items-center gap-2 rounded-full border px-3.5 py-2 font-medium transition-colors"
                >
                  <MousePointerClick aria-hidden className="size-4" />
                  <AdminText>{"Explain what I click"}</AdminText>
                </button>
              </div>

              <nav role="tablist" aria-label={adminCopy("Simba sections")} className="border-border flex shrink-0 flex-wrap gap-x-1 border-b px-3 pt-2">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === t.key}
                    onClick={() => setTab(t.key)}
                    className={cn("text-body-sm -mb-px flex items-center gap-1 border-b-2 px-2.5 py-2 font-medium transition-colors", activeTab === t.key ? "border-accent text-fg" : "text-fg-subtle hover:text-fg border-transparent")}
                  >
                    <t.icon aria-hidden className="size-4" />
                    {adminCopy(t.label)}
                  </button>
                ))}
              </nav>

              <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
                {financeMode && (
                  <Suspense fallback={<p role="status" className="text-body-sm text-fg-muted"><AdminText>{"Loading finance context…"}</AdminText></p>}>
                    <FinanceMode key={pathname}
                      selection={financeSelection?.path === pathname ? financeSelection.selection : undefined}
                      projectFilter={financeFilter?.path === pathname ? financeFilter.project : undefined}
                      onClear={() => setFinanceSelection(undefined)} onClose={() => setOpen(false)} />
                  </Suspense>
                )}
                {activeTab === "today" && (
                  <div className="flex flex-col gap-5">
                    <AttentionList title="Needs you today" items={attention?.today} empty="Nothing urgent right now." loading={!status} />
                    <AttentionList title="Looks wrong or half-done" items={attention?.warnings} empty="I see nothing wrong in your data." loading={!status} />
                  </div>
                )}

                {activeTab === "next" && (
                  <div className="flex flex-col gap-5">
                    <div className="flex items-center gap-4">
                      <Ring percent={journeyPercent} />
                      <div>
                        <p className="text-body-sm text-fg font-semibold"><AdminText values={{ percent: journeyPercent }}>{"Your whole system is {percent}% set up"}</AdminText></p>
                        <p className="text-caption text-fg-subtle">
                          <AdminText>{failed ? "Cannot refresh right now." : updatedAt ? "Live — updates as you save." : "Checking…"}</AdminText>
                        </p>
                      </div>
                    </div>
                    <NextCard row={nextMajor} who="your system" />
                    <Checklist rows={journeyRows} onTour={startTour} />
                    <div className="border-border bg-surface-raised flex flex-col gap-2 rounded-2xl border p-4">
                      <p className="text-body-sm text-fg font-semibold"><AdminText>{"New here?"}</AdminText></p>
                      <p className="text-body-sm text-fg-muted"><AdminText>{"I can walk you through every single option in the sidebar, one by one, and say what each one is."}</AdminText></p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => startTour(buildFullTour(role))} className="text-body-sm bg-accent text-accent-foreground inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 font-semibold">
                          <Play aria-hidden className="size-3.5" />
                          <AdminText>{"Explain every option"}</AdminText>
                        </button>
                        <button type="button" onClick={() => startTour(WELCOME_TOUR)} className="text-body-sm border-border text-fg rounded-full border px-3.5 py-2 font-semibold">
                          <AdminText>{"One-minute tour"}</AdminText>
                        </button>
                        <button type="button" onClick={() => setTab("learn")} className="text-body-sm border-border text-fg inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 font-semibold">
                          <GraduationCap aria-hidden className="size-3.5" />
                          <AdminText>{"Learn by doing"}</AdminText>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "learn" && (
                  <div className="flex flex-col gap-5">
                    <div>
                      <p className="text-body-sm text-fg font-semibold"><AdminText>{"Pick what you want to learn"}</AdminText></p>
                      <p className="text-caption text-fg-subtle mt-0.5"><AdminText>{"I open the real page and point at every field and button in order, with sample values and practice files. Delete buttons are explained, never pressed."}</AdminText></p>
                    </div>
                    <div className="bg-accent text-accent-foreground rounded-2xl p-4">
                      <p className="text-caption tracking-wide uppercase opacity-80"><AdminText>{"Watch it happen"}</AdminText></p>
                      <p className="mt-1 text-[1.05rem] leading-snug font-semibold"><AdminText>{FULL_DEMO.title}</AdminText></p>
                      <p className="text-body-sm mt-1.5 opacity-90"><AdminText>{FULL_DEMO.summary}</AdminText></p>
                      <p className="text-caption mt-1.5 opacity-80">
                        Everything it adds is named “Simba Demo …” and it deletes it all again at the end. A new step every 3 seconds; Pause stops it any time (or press Esc).
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => startTour(FULL_DEMO, { auto: true })} className="text-body-sm inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-2 font-semibold hover:bg-white/25">
                          <Play aria-hidden className="size-3.5" />
                          <AdminText>{"Run the demo"}</AdminText>
                        </button>
                        <button
                          type="button"
                          disabled={cleaning === "busy"}
                          onClick={async () => {
                            setCleaning("busy");
                            try {
                              const res = await fetch("/api/admin/simba/cleanup", { method: "POST" });
                              const body = await res.json();
                              setCleaning(res.ok ? "Removed " + body.removed + " leftover demo record" + (body.removed === 1 ? "" : "s") + "." : body.error ?? "Could not clean up.");
                              void load();
                            } catch {
                              setCleaning("Could not reach the server.");
                            }
                          }}
                          className="text-body-sm rounded-full border border-white/40 px-3.5 py-2 font-semibold hover:bg-white/10"
                        >
                          <AdminText>{"Remove leftover demo records"}</AdminText>{status?.ids?.demoCount ? " (" + status.ids.demoCount + ")" : ""}
                        </button>
                      </div>
                      {cleaning && cleaning !== "busy" && <p className="text-caption mt-2 opacity-90">{cleaning}</p>}
                    </div>

                    <ul className="flex flex-col gap-2">
                      {LESSONS.map((l) => (
                        <li key={l.id} className="border-border bg-surface-raised flex items-start gap-3 rounded-xl border p-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-body-sm font-semibold"><AdminText>{l.title}</AdminText></p>
                            <p className="text-caption text-fg-muted mt-0.5"><AdminText>{l.summary}</AdminText></p>
                            <p className="text-caption text-fg-subtle mt-1">
                              <AdminText values={{ count: l.steps.length, minutes: l.minutes }}>{"{count} steps · about {minutes} min"}</AdminText>
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col gap-1.5">
                            <button type="button" onClick={() => startTour(l)} className="text-body-sm border-border text-fg inline-flex items-center justify-center gap-1.5 rounded-full border px-3.5 py-1.5 font-semibold">
                              <AdminText>{"Guide me"}</AdminText>
                            </button>
                            {l.doable && (
                              <button type="button" onClick={() => startTour(l, { auto: true })} className="text-body-sm bg-accent text-accent-foreground inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 font-semibold">
                                <Play aria-hidden className="size-3.5" />
                                <AdminText>{"Do it for me"}</AdminText>
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-col gap-2">
                      <p className="text-label text-fg-subtle uppercase"><AdminText>{"Practice files"}</AdminText></p>
                      <p className="text-caption text-fg-subtle"><AdminText>{"Sample pictures and plans to upload while you practise. They are kept separately and are always available."}</AdminText></p>
                      <ul className="flex flex-col gap-1.5">
                        {SAMPLE_FILES.map((f) => (
                          <li key={f.name}>
                            <a href={"/simba-demo/" + f.name} download className="border-border bg-surface-raised hover:border-accent flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors">
                              <Download aria-hidden className="text-accent size-4 shrink-0" />
                              <span className="min-w-0 flex-1">
                                <span className="text-body-sm block font-medium"><AdminText>{f.label}</AdminText></span>
                                <span className="text-caption text-fg-subtle block truncate"><AdminText>{f.use}</AdminText></span>
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {activeTab === "page" && (
                  <div className="flex flex-col gap-4">
                    {extra && (
                      <div className="flex flex-col gap-3">
                        <p className="text-h5 text-fg"><AdminText>{extra.title}</AdminText></p>
                        <p className="text-body-sm text-fg-muted"><AdminText>{extra.about}</AdminText></p>
                        <div>
                          <p className="text-label text-fg-subtle uppercase"><AdminText>{"What to do here"}</AdminText></p>
                          <ol className="text-body-sm text-fg mt-1 list-decimal space-y-1 pl-5">
                            {extra.steps.map((s) => (
                              <li key={s}><AdminText>{s}</AdminText></li>
                            ))}
                          </ol>
                        </div>
                        {extra.check && (
                          <div>
                            <p className="text-label text-fg-subtle uppercase"><AdminText>{"Check before you leave"}</AdminText></p>
                            <ul className="text-body-sm text-fg-muted mt-1 list-disc space-y-1 pl-5">
                              {extra.check.map((s) => (
                                <li key={s}><AdminText>{s}</AdminText></li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    {guide && (
                      <div className="flex flex-col gap-3">
                        {!extra && <p className="text-h5 text-fg"><AdminText>{guide.label}</AdminText></p>}
                        {extra && <p className="text-label text-fg-subtle uppercase">From the admin guide: <AdminText>{guide.label}</AdminText></p>}
                        <p className="text-body-sm text-fg-muted"><AdminText>{guide.summary}</AdminText></p>
                        <ul className="text-body-sm text-fg list-disc space-y-1.5 pl-5">
                          {(showAllNotes ? guide.details : guide.details.slice(0, 3)).map((d) => (
                            <li key={d.slice(0, 40)}><AdminText>{d}</AdminText></li>
                          ))}
                        </ul>
                        {guide.details.length > 3 && (
                          <button type="button" onClick={() => setShowAllNotes((v) => !v)} className="text-body-sm text-accent self-start font-semibold">
                            {showAllNotes ? "Show less" : `Show all ${guide.details.length} notes`}
                          </button>
                        )}
                      </div>
                    )}
                    {!guide && !extra && (
                      <p className="text-body-sm text-fg-muted">
                        I do not have a written guide for this exact page, but I can still explain any button, switch or field here. Press <b><AdminText>{"Explain what I click"}</AdminText></b> above and click it.
                      </p>
                    )}
                    <Link href="/admin/help" className="text-body-sm text-accent inline-flex items-center gap-1.5 font-semibold">
                      <AdminText>{"Open the full Admin Guide "}</AdminText><ArrowRight aria-hidden className="size-4" />
                    </Link>
                  </div>
                )}

                {activeTab === "project" && showProject && status?.project && (
                  <div className="flex flex-col gap-5">
                    <div className="flex items-center gap-4">
                      <Ring percent={projectPercent} />
                      <div className="min-w-0">
                        <p className="text-body-sm text-fg truncate font-semibold">{status.project.name}</p>
                        <p className="text-caption text-fg-subtle"><AdminText values={{ percent: projectPercent }}>{"{percent}% set up · live, updates as you save"}</AdminText></p>
                      </div>
                    </div>
                    <NextCard row={projectNext} who="this project" />
                    <Checklist rows={projectRows} />
                  </div>
                )}

                {activeTab === "ask" && (
                  <div className="flex flex-col gap-4">
                    <div className="relative">
                      <Search aria-hidden className="text-fg-subtle pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                      <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ask in English or বাংলা — e.g. নতুন কিস্তি / notice kemne dibo?"
                        aria-label={adminCopy("Ask Simba")}
                        className="bg-surface text-body-sm text-fg placeholder:text-fg-subtle h-11 w-full rounded-full border border-transparent pr-4 pl-10 outline-none focus:border-accent"
                      />
                    </div>
                    {notice && (
                      <div className="bg-error-soft text-error rounded-xl p-3">
                        <p className="text-body-sm font-semibold">Just now on this page: {notice.title ?? "a problem"}</p>
                        <p className="text-caption mt-0.5">“<AdminText>{notice.message}</AdminText>”</p>
                        <ul className="text-body-sm mt-2 list-disc space-y-0.5 pl-4">
                          {notice.fix?.map((f) => (
                            <li key={f}><AdminText>{f}</AdminText></li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {q ? (
                      <>
                        {results.some((r) => r.tour) && <p className="text-label text-fg-subtle uppercase">I found a walk-through for this</p>}
                        <ul className="flex flex-col gap-1.5">
                          {results.map((r) => (
                            <AskRow key={r.key} result={r} onTour={startTour} />
                          ))}
                        </ul>
                        {!results.some((r) => r.tour || r.score >= 8) && (
                          <div className="border-border bg-surface-raised flex flex-col gap-2 rounded-2xl border p-4">
                            <p className="text-body-sm text-fg font-semibold">I do not have a tutorial for this yet</p>
                            <p className="text-body-sm text-fg-muted">
                              Copy your question together with the whole admin guide, then paste it into any AI chat (free or paid). It will guide you step by step — in বাংলা if you write in বাংলা.
                            </p>
                            <CopyForAi problem={query} primary />
                          </div>
                        )}
                        {results.length > 0 && results.some((r) => r.tour || r.score >= 8) && (
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-caption text-fg-subtle">Not what you meant?</p>
                            <CopyForAi problem={query} />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <p className="text-label text-fg-subtle uppercase">Common questions</p>
                        <ul className="flex flex-col gap-1.5">
                          {FAQ.map((f) => (
                            <FaqRow key={f.q} item={f} />
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {/* the avatar */}
      {showWelcomeOffer && (
        <div className="bg-surface-raised border-border text-body-sm text-fg fixed right-6 bottom-28 z-[60] w-64 rounded-2xl rounded-br-sm border px-4 py-3 shadow-lg">
          <p>
            Hi, I am <b>Simba</b>. {tourDone ? "Press me any time you are stuck." : "Want a one-minute tour of the panel?"}
          </p>
          {!tourDone && (
            <div className="mt-2.5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setGreeted(true);
                  startTour(WELCOME_TOUR);
                }}
                className="text-accent font-semibold"
              >
                Quick tour
              </button>
              <button
                type="button"
                onClick={() => {
                  setGreeted(true);
                  startTour(buildFullTour(role));
                }}
                className="text-accent font-semibold"
              >
                Every option
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    window.sessionStorage.setItem("simba-greeted", "1");
                  } catch {
                    /* fine */
                  }
                  setGreeted(true);
                }}
                className="text-fg-subtle"
              >
                Not now
              </button>
            </div>
          )}
        </div>
      )}
      {tour && <SimbaTour tour={tour.tour} index={tour.index} pathname={pathname} note={tourNote} hold={tourHold} auto={tourAuto} playing={tourPlaying} onTogglePlay={() => setTourPlaying((v) => !v)} onIndex={(i) => setTour((t) => (t ? { ...t, index: i } : t))} onStop={stopTour} />}
      {/* The launcher lives in the top bar (AdminHeader's SimbaLauncher); it talks to us with window events. */}
    </div>
  );
}

/** Copies "my problem + the whole admin guide" so any AI chat can walk the person through it. */
function CopyForAi({ problem, primary }: { problem: string; primary?: boolean }) {
  const [done, setDone] = useState(false);
  async function copy() {
    const text = buildAiPrompt(problem);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setDone(true);
    window.setTimeout(() => setDone(false), 4000);
  }
  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "text-body-sm inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2 font-semibold transition-colors",
        primary ? "bg-accent text-accent-foreground" : "border-border text-fg hover:bg-surface border",
      )}
    >
      {done ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
      {done ? "Copied — paste it in an AI chat" : "Copy guide + my problem"}
    </button>
  );
}

function FaqRow({ item }: { item: (typeof FAQ)[number] }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="border-border bg-surface-raised overflow-hidden rounded-xl border">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="hover:bg-surface flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left">
        <span className="text-body-sm font-medium">{item.q}</span>
        <ChevronDown aria-hidden className={cn("text-fg-subtle size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-border border-t px-3 py-3">
          <ul className="text-body-sm text-fg-muted list-disc space-y-1 pl-5">
            {item.a.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          {item.href && (
            <Link href={item.href} className="text-body-sm text-accent mt-2 inline-flex items-center gap-1.5 font-semibold">
              {item.hrefLabel ?? "Open"} <ArrowRight aria-hidden className="size-4" />
            </Link>
          )}
        </div>
      )}
    </li>
  );
}

const DOT = { high: "bg-error", medium: "bg-[#f59e0b]", low: "bg-fg-subtle" } as const;

function AttentionList({ title, items, empty, loading }: { title: string; items?: { id: string; text: string; href: string; severity: "high" | "medium" | "low" }[]; empty: string; loading: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-label text-fg-subtle uppercase"><AdminText>{title}</AdminText></p>
      {loading ? (
        <p className="text-body-sm text-fg-muted"><AdminText>{"Checking…"}</AdminText></p>
      ) : !items || items.length === 0 ? (
        <p className="text-body-sm text-fg-muted"><AdminText>{empty}</AdminText></p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((i) => (
            <li key={i.id}>
              <Link href={i.href} className="border-border bg-surface-raised hover:border-accent flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors">
                <span aria-hidden className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", DOT[i.severity])} />
                <span className="text-body-sm flex-1"><AdminText>{i.text}</AdminText></span>
                <ArrowRight aria-hidden className="text-fg-subtle mt-1 size-4 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AskRow({ result, onTour }: { result: AskResult; onTour: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="border-border bg-surface-raised overflow-hidden rounded-xl border">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="hover:bg-surface flex w-full items-start gap-3 px-3 py-2.5 text-left">
        <span className="min-w-0 flex-1">
          <span className="text-caption text-fg-subtle block uppercase">{result.kind}</span>
          <span className="text-body-sm block font-medium"><AdminText>{result.title}</AdminText></span>
          {!open && <span className="text-caption text-fg-muted line-clamp-2 block">{result.snippet}</span>}
        </span>
        <ChevronDown aria-hidden className={cn("text-fg-subtle mt-1 size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-border border-t px-3 py-3">
          <p className="text-body-sm text-fg-muted">{result.snippet}</p>
          {result.lines && (
            <ul className="text-body-sm text-fg mt-2 list-disc space-y-1 pl-5">
              {result.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {result.tour && (TOURS[result.tour] || LESSONS.some((l) => l.id === result.tour)) && (
              <button type="button" onClick={() => onTour(result.tour!)} className="text-body-sm bg-accent text-accent-foreground inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-semibold">
                <Play aria-hidden className="size-3.5" />
                <AdminText>{"Show me on screen"}</AdminText>
              </button>
            )}
            {result.href && (
              <Link href={result.href} className="text-body-sm text-accent inline-flex items-center gap-1.5 font-semibold">
                <AdminText>{"Open it "}</AdminText><ArrowRight aria-hidden className="size-4" />
              </Link>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
