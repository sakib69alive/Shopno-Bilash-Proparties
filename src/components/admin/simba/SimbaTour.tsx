"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Download, Pause, Play, X } from "lucide-react";
import type { Tour, TourStep } from "@/content/simba/tours";

const FIND_IN =
  "aside a, aside button, header a, header button, main a, main button, main h1, main h2, main h3, main legend, main label, main input, main select, main textarea, [role=tab], [role=dialog] button, [role=dialog] a";

const DEMO_MARKER = "Simba Demo";
const DEFAULT_DWELL = 3000;

function visible(el: Element): boolean {
  const r = (el as HTMLElement).getBoundingClientRect();
  return r.width > 0 && r.height > 0 && !el.closest("[data-simba]");
}

function textOf(el: Element): string {
  const h = el as HTMLElement;
  const input = el as HTMLInputElement;
  const label = input.labels?.[0]?.innerText ?? "";
  return `${h.getAttribute("aria-label") ?? ""} ${h.innerText ?? ""} ${label} ${input.placeholder ?? ""} ${h.getAttribute("name") ?? ""}`.toLowerCase();
}

function locate(terms: string[] | undefined, href?: string, sel?: string): HTMLElement | null {
  if (sel) {
    const picked = Array.from(document.querySelectorAll(sel)).find(visible) as HTMLElement | undefined;
    if (picked) return picked;
  }
  if (href) {
    const exact = Array.from(document.querySelectorAll(`aside a[href="${href}"], header a[href="${href}"]`)).find(visible) as HTMLElement | undefined;
    if (exact) return exact;
  }
  if (!terms || terms.length === 0) return null;
  const all = Array.from(document.querySelectorAll(FIND_IN)).filter(visible) as HTMLElement[];
  for (const term of terms) {
    const t = term.toLowerCase();
    // Prefer short, exact-ish matches (a button named "Edit") over long containers that merely mention the word.
    const hits = all.filter((el) => textOf(el).includes(t)).sort((a, b) => textOf(a).length - textOf(b).length);
    if (hits[0]) return hits[0];
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Acting: what Simba does by itself in "Do it for me" mode. Every write is a normal press of a normal button in the normal form, so
// the page's own checks apply. Deleting is restricted to a row whose name carries the demo marker — nothing else is ever pressed.
// ---------------------------------------------------------------------------------------------------------------------------

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function controlFor(el: HTMLElement | null): Control | null {
  if (!el) return null;
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) return el;
  if (el instanceof HTMLLabelElement && el.control) return el.control as Control;
  let cur: HTMLElement | null = el;
  for (let i = 0; i < 4 && cur; i++) {
    const found = cur.parentElement?.querySelector<Control>("input:not([type=hidden]):not([type=file]), select, textarea");
    if (found) return found;
    cur = cur.parentElement;
  }
  return null;
}

function setNative(el: Control, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

async function typeInto(el: Control, text: string, alive: () => boolean) {
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  el.focus();
  if (text === "@first" && !(el instanceof HTMLSelectElement)) return; // only a drop-down has a "first option"
  if (el instanceof HTMLSelectElement) {
    const options = Array.from(el.options).filter((o) => o.value !== "" && !o.disabled);
    // No guessing: if the wanted option is not there, nothing is chosen (so a required drop-down stays empty and the form will not submit).
    const pick = text === "@first" ? options[0] : options.find((o) => o.text.includes(text));
    if (pick) setNative(el, pick.value);
    return;
  }
  if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
    if (!el.checked) el.click();
    return;
  }
  if (el instanceof HTMLInputElement && el.type === "date") {
    setNative(el, text);
    return;
  }
  // Typed letter by letter so it can be watched; long text is typed in bigger bites.
  const bite = text.length > 60 ? 4 : text.length > 24 ? 2 : 1;
  setNative(el, "");
  for (let i = bite; i < text.length + bite && alive(); i += bite) {
    setNative(el, text.slice(0, Math.min(i, text.length)));
    await sleep(32);
  }
  if (alive()) setNative(el, text);
}

async function uploadInto(near: HTMLElement | null, fileName: string) {
  let cur: HTMLElement | null = near;
  let input: HTMLInputElement | null = null;
  for (let i = 0; i < 6 && cur && !input; i++) {
    input = cur.querySelector<HTMLInputElement>("input[type=file]");
    cur = cur.parentElement;
  }
  if (!input) return;
  const res = await fetch("/simba-demo/" + fileName);
  if (!res.ok) return;
  const blob = await res.blob();
  const file = new File([blob], fileName, { type: blob.type || (fileName.endsWith(".svg") ? "image/svg+xml" : "image/png") });
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

const isDelete = (b: HTMLElement) => /delete/i.test((b.getAttribute("aria-label") ?? "") + " " + b.innerText);

/** The delete button of a record whose name carries the demo marker — and only that. */
function findDemoDelete(): HTMLElement | null {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>("main button, main a, header button")).filter(isDelete);
  for (const b of buttons) {
    if ((b.getAttribute("aria-label") ?? "").includes(DEMO_MARKER)) return b;
    let cur: HTMLElement | null = b.parentElement;
    for (let i = 0; i < 8 && cur; i++) {
      const deletes = Array.from(cur.querySelectorAll<HTMLElement>("button, a")).filter(isDelete);
      if (deletes.length > 1) break; // this container holds other records too — stop climbing
      if ((cur.innerText ?? "").includes(DEMO_MARKER)) return b;
      cur = cur.parentElement;
    }
  }
  return null;
}

async function deleteDemo(alive: () => boolean): Promise<void> {
  const button = findDemoDelete();
  if (!button || !alive()) return;
  button.scrollIntoView({ block: "center", behavior: "smooth" });
  await sleep(900);
  if (!alive()) return;
  const original = window.confirm;
  // Agree only when the question names the demo record; anything else is refused.
  window.confirm = (message?: string) => String(message ?? "").includes(DEMO_MARKER);
  button.click();
  window.setTimeout(() => (window.confirm = original), 2500);
}

async function perform(step: TourStep, el: HTMLElement | null, alive: () => boolean): Promise<void> {
  if (step.cleanup) {
    await fetch("/api/admin/simba/cleanup", { method: "POST" }).catch(() => undefined);
    return;
  }
  if (step.del) return deleteDemo(alive);
  if (step.upload && step.file) return uploadInto(el, step.file.name);
  if (step.value !== undefined) {
    const control = controlFor(el);
    if (control) await typeInto(control, step.value, alive);
    return;
  }
  if (step.click && el) {
    await sleep(700);
    if (alive()) el.click();
  }
}

/**
 * The on-screen half of a walk-through: outlines the real button or field for the current step and shows a small card beside it
 * with what to do, plus Back / Next / Stop. In "Do it for me" mode it also types, chooses, uploads and presses by itself, and in
 * autoplay it moves on after a few seconds; Pause stops it wherever it is. It never blocks the page: in guide mode you can press the
 * outlined button yourself, then press Next.
 */
export function SimbaTour({
  tour,
  index,
  pathname,
  note,
  hold,
  auto,
  playing,
  onTogglePlay,
  onIndex,
  onStop,
}: {
  tour: Tour;
  index: number;
  pathname: string;
  note?: string;
  /** While a step opens another page: the path it is waiting for, or "none" when that page cannot be opened. */
  hold?: string;
  /** "Do it for me": perform the step's typing, uploading and pressing. */
  auto: boolean;
  /** Moving on by itself every few seconds. */
  playing: boolean;
  onTogglePlay: () => void;
  onIndex: (i: number) => void;
  onStop: (finished: boolean) => void;
}) {
  const step = tour.steps[index];
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number; inSidebar: boolean } | null>(null);
  const [ready, setReady] = useState(false);
  const targetRef = useRef<HTMLElement | null>(null);

  const waiting = !!step.go && hold !== "none" && hold !== pathname;
  const gaveUp = !!step.go && hold === "none";

  useEffect(() => {
    let tries = 0;
    let timer = 0;
    targetRef.current = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a new step (or page) is not ready until its target is looked for
    setReady(false);
    if (waiting) return;
    function look() {
      const el = gaveUp ? null : locate(step.find, step.href, step.sel);
      if (el) {
        targetRef.current = el;
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        timer = window.setTimeout(() => {
          place();
          setReady(true);
        }, 450);
        return;
      }
      tries += 1;
      if (!gaveUp && (step.find || step.href || step.sel) && tries < 16) timer = window.setTimeout(look, 250);
      else {
        setBox(null); // nothing to point at: show the step as a plain note
        setReady(true);
      }
    }
    function place() {
      const el = targetRef.current;
      if (!el || !document.contains(el)) return;
      const r = el.getBoundingClientRect();
      setBox({ left: r.left, top: r.top, width: r.width, height: r.height, inSidebar: !!el.closest("aside") });
    }
    look();
    const onMove = () => place();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [step, pathname, waiting, gaveUp]);

  // Do it for me + autoplay: act once per step, then stay a few seconds, then move on. Pausing cancels the wait but never undoes a step,
  // and a step's typing is only ever cut short by leaving that step (not by the card re-rendering).
  const last = index === tour.steps.length - 1;
  const keyRef = useRef("");
  const actRef = useRef<{ key: string; promise: Promise<void> } | null>(null);
  useEffect(() => {
    keyRef.current = tour.id + ":" + index;
  }, [tour.id, index]);
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    let timer = 0;
    const key = tour.id + ":" + index;
    (async () => {
      if (auto) {
        if (actRef.current?.key !== key) {
          actRef.current = { key, promise: perform(step, targetRef.current, () => keyRef.current === key).catch(() => undefined) };
        }
        await actRef.current.promise;
      }
      if (!alive || !playing) return;
      timer = window.setTimeout(() => {
        if (alive) (last ? onStop(true) : onIndex(index + 1));
      }, step.dwell ?? DEFAULT_DWELL);
    })();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the step becomes ready or playing changes
  }, [ready, playing, index, auto]);

  const cardWidth = 340;
  let cardStyle: React.CSSProperties;
  if (box) {
    const below = box.top + box.height + 16 + 260 < window.innerHeight;
    const left = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, box.left));
    if (box.inSidebar) cardStyle = { left: box.left + box.width + 18, top: Math.max(16, Math.min(window.innerHeight - 260, box.top - 20)) };
    else cardStyle = below ? { left, top: box.top + box.height + 14 } : { left, top: Math.max(16, box.top - 14 - 260) };
  } else {
    cardStyle = { right: 24, bottom: 120 };
  }

  return (
    <div data-simba>
      {box && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[84] rounded-lg border-[3px] border-[#f59e0b] shadow-[0_0_0_6px_rgb(245_158_11/0.25)] transition-all duration-200"
          style={{ left: box.left - 4, top: box.top - 4, width: box.width + 8, height: box.height + 8 }}
        />
      )}
      <div role="dialog" aria-label={tour.title} style={{ ...cardStyle, width: cardWidth }} className="border-border bg-surface-raised fixed z-[85] rounded-2xl border p-4 shadow-2xl transition-[left,top] duration-200">
        <div className="flex items-start justify-between gap-3">
          <p className="text-caption text-fg-subtle tracking-wide uppercase">
            {tour.title} · {index + 1}/{tour.steps.length}
            {auto && <span className="text-accent ml-1.5 font-semibold">· Simba is doing it</span>}
          </p>
          <button type="button" onClick={() => onStop(false)} aria-label="Stop the tour" className="text-fg-muted hover:bg-surface -mt-1 -mr-1 flex size-7 items-center justify-center rounded-full">
            <X aria-hidden className="size-4" />
          </button>
        </div>
        <p className="text-body-sm text-fg mt-2">{step.say}</p>
        {note && <p className="text-caption bg-error-soft text-error mt-2 rounded-lg px-3 py-2">{note}</p>}
        {step.example && (
          <p className="text-body-sm bg-accent-soft text-accent-strong mt-2 rounded-lg px-3 py-2">
            <span className="font-semibold">Try: </span>
            {step.example}
          </p>
        )}
        {step.file && (
          <a href={"/simba-demo/" + step.file.name} download className="text-body-sm text-accent mt-2 inline-flex items-center gap-1.5 font-semibold">
            <Download aria-hidden className="size-4" />
            Practice file: {step.file.label}
          </a>
        )}
        {step.careful && (
          <p role="note" className="text-caption bg-error-soft text-error mt-2 flex gap-2 rounded-lg px-3 py-2">
            <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            {step.careful}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" disabled={index === 0} onClick={() => onIndex(index - 1)} className="text-body-sm text-fg-muted inline-flex items-center gap-1 font-medium disabled:opacity-40">
            <ArrowLeft aria-hidden className="size-4" />
            Back
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={playing ? "Pause" : "Play automatically"}
            className="text-body-sm border-border text-fg inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold"
          >
            {playing ? <Pause aria-hidden className="size-3.5" /> : <Play aria-hidden className="size-3.5" />}
            {playing ? "Pause" : "Play"}
          </button>
          <button type="button" onClick={() => (last ? onStop(true) : onIndex(index + 1))} className="text-body-sm bg-accent text-accent-foreground inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-semibold">
            {last ? "Done" : "Next"}
            {!last && <ArrowRight aria-hidden className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
