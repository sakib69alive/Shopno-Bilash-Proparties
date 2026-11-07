"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, CheckCircle2, ClipboardCopy, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { BLUEPRINT_LIGHT_LINE_STYLE, BLUEPRINT_LIGHT_STYLE } from "@/components/portal/BlueprintPaper";
import { checkBlueprintSvg, type BlueprintSvgReport } from "@/lib/blueprintSvg";
import { AI_CAN_DO, AI_MUST_KEEP, WORKFLOW_STEPS, MARKER_KIND_INFO, createPrompt, editPrompt, markersPrompt, mergeMarkerGroups, type FlatDetails, type MarkerKind } from "@/content/blueprintAiGuide";

/** A read-only prompt that is as tall as its text — so there is no inner scroll bar, the page just scrolls. */
function PromptBox({ label, name, value }: { label: string; name: string; value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight + 2}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [value]);
  return <Textarea ref={ref} label={label} name={name} value={value} readOnly rows={6} className="resize-none overflow-hidden font-mono text-xs leading-relaxed" onFocus={(e) => e.currentTarget.select()} />;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older/insecure contexts: fall back to a hidden textarea.
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Button type="button" size="sm" onClick={copy}>
      {copied ? <Check aria-hidden className="size-4" /> : <ClipboardCopy aria-hidden className="size-4" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

function Checker() {
  const [report, setReport] = useState<BlueprintSvgReport | null>(null);
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setReport(null);
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    const result = checkBlueprintSvg(text);
    setReport(result);
    if (/^\s*(<\?xml|<svg|<!)/i.test(text)) setPreviewUrl(URL.createObjectURL(new Blob([text], { type: "image/svg+xml" })));
  }

  return (
    <div className="flex flex-col gap-4">
      <Input label="SVG file to check" name="svg" type="file" accept=".svg,image/svg+xml" onChange={(e) => onFile(e.target.files?.[0])} />

      {report && (
        <div className="grid gap-4 md:grid-cols-[1fr_16rem]">
          <div className="flex flex-col gap-3">
            <div
              role="status"
              className={report.ok ? "bg-success-soft text-success flex items-start gap-2.5 rounded-md px-3.5 py-3" : "bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3"}
            >
              {report.ok ? <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" /> : <XCircle aria-hidden className="mt-0.5 size-4 shrink-0" />}
              <p className="text-body-sm">
                <strong>{fileName}</strong> — {report.ok ? (report.warnings.length === 0 ? "passes every check. It will upload and draw cleanly." : "can be uploaded, but see the notes below.") : "would be refused on upload."}
              </p>
            </div>

            <p className="text-body-sm text-fg-muted">
              {report.stats.elements} shapes · {report.stats.paths} paths · {Math.round(report.stats.bytes / 1024) || "<1"} KB · {report.stats.hasViewBox ? "viewBox present" : "no viewBox"} · {report.rooms.length > 0 ? `${report.rooms.length} rooms found (${report.rooms.map((r) => r.label).join(", ")})` : "no room markers"}{report.areas.length > 0 ? ` · ${report.areas.filter((a) => a.kind === "flat").length} flat marker(s), ${report.areas.filter((a) => a.kind === "parking").length} parking bay marker(s)` : ""}
            </p>

            {report.fixes.length > 0 && (
              <p className="text-body-sm text-fg-muted">
                <strong>Fixed automatically on upload:</strong> {report.fixes.join(" ")}
              </p>
            )}

            {report.errors.length > 0 && (
              <div>
                <h3 className="text-label text-error mb-1.5 uppercase">Must fix</h3>
                <ul className="text-body-sm text-fg flex list-disc flex-col gap-1.5 pl-5">
                  {report.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {report.warnings.length > 0 && (
              <div>
                <h3 className="text-label text-warning mb-1.5 flex items-center gap-1.5 uppercase">
                  <AlertTriangle aria-hidden className="size-3.5" /> Better to fix
                </h3>
                <ul className="text-body-sm text-fg flex list-disc flex-col gap-1.5 pl-5">
                  {report.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            {(report.errors.length > 0 || report.warnings.length > 0) && (
              <p className="text-body-sm text-fg-muted">Copy the lines above back to the AI and ask it to fix them, then check the new file again.</p>
            )}
          </div>

          {previewUrl && (
            <div style={BLUEPRINT_LIGHT_STYLE} className="relative isolate aspect-[3/4] overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the file being checked, same recolouring as the client screen */}
              <img src={previewUrl} alt="Preview of the plan on the blueprint sheet" draggable={false} style={BLUEPRINT_LIGHT_LINE_STYLE} className="absolute inset-0 size-full object-contain p-3 mix-blend-screen select-none" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** A short "what is this prompt for / what can I change" card shown beside each master prompt on wide screens (below it on phones). */
function PromptNote({ title, forWhat, canChange, canAdd, cannot }: { title: string; forWhat: string; canChange: string[]; canAdd: string[]; cannot: string }) {
  const list = (items: string[]) => (
    <ul className="text-body-sm text-fg-muted mt-1.5 flex list-disc flex-col gap-1 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
  // The card rides down the column as the page scrolls, so the right side is never an empty gap next to a long prompt. Done with a
  // transform measured on scroll — `position: sticky` misbehaves in this app's browser setup (see the admin header/sidebar fixes).
  const cellRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const TOP = 88; // just below the fixed admin header
    let raf = 0;
    const update = () => {
      raf = 0;
      const cell = cellRef.current;
      const card = cardRef.current;
      if (!cell || !card) return;
      if (window.innerWidth < 1024) {
        card.style.transform = "";
        return;
      }
      const room = cell.offsetHeight - card.offsetHeight;
      const y = Math.max(0, Math.min(room, TOP - cell.getBoundingClientRect().top));
      card.style.transform = y > 0 ? `translateY(${Math.round(y)}px)` : "";
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);
    const watch = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onScroll) : null;
    if (watch && cellRef.current) watch.observe(cellRef.current);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      watch?.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={cellRef} className="min-w-0">
    <aside ref={cardRef} className="border-border bg-surface flex flex-col gap-4 rounded-2xl border p-4 will-change-transform">
      <div>
        <p className="text-label text-accent uppercase">{title}</p>
        <p className="text-body-sm text-fg-muted mt-1.5">{forWhat}</p>
      </div>
      <div>
        <p className="text-body-sm text-fg font-medium">Custom: what you can change</p>
        {list(canChange)}
      </div>
      <div>
        <p className="text-body-sm text-fg font-medium">Custom: what you can add</p>
        {list(canAdd)}
      </div>
      <p className="text-body-sm text-fg-muted border-border border-t pt-3">
        <strong className="text-fg">Not possible:</strong> {cannot}
      </p>
    </aside>
    </div>
  );
}

export function BlueprintAiPanel() {
  const [details, setDetails] = useState<FlatDetails>({ name: "", bedrooms: "", bathrooms: "", balconies: "", sizeSqft: "", notes: "" });
  const [change, setChange] = useState("");
  const set = (key: keyof FlatDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDetails((d) => ({ ...d, [key]: e.target.value }));

  const create = useMemo(() => createPrompt(details), [details]);
  const edit = useMemo(() => editPrompt(change), [change]);

  return (
    <div className="flex max-w-6xl flex-col gap-10">
      <section>
        <h2 className="text-h3">The whole job, in order</h2>
        <p className="text-body-sm text-fg-muted mt-1 max-w-3xl">
          From the architect&rsquo;s drawing to what a client sees in their app: do the steps top to bottom. Steps 1–4 are on this page, in the same order as below; steps 5 and 6 are in the other two tabs.
          The AI never redesigns anything — it copies the drawing exactly, and what it gets wrong you fix by hand.
        </p>
        <ol className="mt-4 flex max-w-4xl flex-col gap-3">
          {WORKFLOW_STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="bg-accent text-accent-foreground text-label flex size-7 shrink-0 items-center justify-center rounded-full">{i + 1}</span>
              <div className="text-body-sm text-fg-muted">
                <p>
                  <strong className="text-fg">{step.title}.</strong> {step.body}
                </p>
                {step.anchor && (
                  <a href={`#${step.anchor}`} className="text-accent mt-1 inline-block font-semibold underline">
                    Go to step {i + 1} ↓
                  </a>
                )}
                {step.link && (
                  <Link href={step.link.href} className="text-accent mt-1 inline-block font-semibold underline">
                    {step.link.label} →
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div id="step-1" className="border-border grid scroll-mt-24 gap-8 border-t pt-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="flex min-w-0 flex-col gap-4">
        <div>
          <h2 className="text-h3">Step 1 · Make the SVG — copy an architect&rsquo;s drawing exactly</h2>
          <p className="text-body-sm text-fg-muted mt-1">Optional: fill in the flat so the AI can double-check the picture. Leave blank to use the prompt as it is.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-5">
          <Input label="Flat" name="name" value={details.name} onChange={set("name")} placeholder="A-502" />
          <Input label="Bedrooms" name="bedrooms" value={details.bedrooms} onChange={set("bedrooms")} inputMode="numeric" placeholder="3" />
          <Input label="Bathrooms" name="bathrooms" value={details.bathrooms} onChange={set("bathrooms")} inputMode="numeric" placeholder="3" />
          <Input label="Balconies" name="balconies" value={details.balconies} onChange={set("balconies")} inputMode="numeric" placeholder="3" />
          <Input label="Size (sq ft)" name="size" value={details.sizeSqft} onChange={set("sizeSqft")} inputMode="numeric" placeholder="1450" />
        </div>
        <Input label="Anything the picture doesn't show" name="notes" value={details.notes} onChange={set("notes")} placeholder="e.g. balcony faces east; the second bedroom has an attached bath" />
        <div>
          <CopyButton text={create} label="Copy prompt" />
        </div>
        <details className="text-body-sm">
          <summary className="text-accent cursor-pointer font-semibold">Show the prompt text</summary>
          <PromptBox label="Prompt (select all to copy by hand)" name="create" value={create} />
        </details>
      </section>
      <PromptNote
        title="Step 1 · Copy a drawing"
        forWhat="Use this the FIRST time, to turn the architect's drawing (SVG, JPG, PNG, PDF, CAD export or a photo) into the blueprint SVG. Attach the drawing to the AI chat, then paste this prompt."
        canChange={[
          "Flat name, bedrooms, bathrooms, balconies, size — the AI uses them only to double-check its copy.",
          "Leave every box empty if you like; the prompt still works.",
        ]}
        canAdd={[
          "Anything the picture doesn't show, in the notes box: which way a balcony faces, which bedroom has an attached bath, which room is the servant/store room.",
          "Parking bay numbering, or “make one SVG per floor” for a multi-page PDF.",
          "A room to leave out.",
        ]}
        cannot="the AI will not move, resize or remove any wall, column, door or label — it copies the drawing exactly."
      />
      </div>

      <MarkerSection />

      <section id="step-3" className="border-border flex scroll-mt-24 flex-col gap-4 border-t pt-8">
        <div>
          <h2 className="text-h3">Step 3 · Check the file before uploading</h2>
          <p className="text-body-sm text-fg-muted mt-1">Drop the finished .svg file here. Nothing is uploaded or saved — it is checked right in your browser.</p>
        </div>
        <Checker />
      </section>

      <div id="step-4" className="border-border grid scroll-mt-24 gap-8 border-t pt-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="flex min-w-0 flex-col gap-4">
        <div>
          <h2 className="text-h3">Step 4 · Fix something (only if needed) — change an existing plan</h2>
          <p className="text-body-sm text-fg-muted mt-1">
            Describe the change, copy the prompt, then paste the plan&rsquo;s current SVG where it says so. The AI returns the whole updated plan.
          </p>
        </div>
        <Textarea label="What should change?" name="change" value={change} onChange={(e) => setChange(e.target.value)} rows={3} placeholder="Move the kitchen door to the other wall; make the Bed 2 bed a pair of single beds…" />
        <div>
          <CopyButton text={edit} label="Copy prompt" />
        </div>
        <details className="text-body-sm">
          <summary className="text-accent cursor-pointer font-semibold">Show the prompt text</summary>
          <PromptBox label="Prompt (select all to copy by hand)" name="edit" value={edit} />
        </details>
      </section>
      <PromptNote
        title="Step 4 · Change a plan"
        forWhat="Use this when you ALREADY have an SVG and want one specific fix. Describe the change, copy the prompt, then paste the whole current SVG at the bottom where it says so."
        canChange={[
          "A typo or number in a label (say exactly which one).",
          "Mirror the whole plan left↔right or top↔bottom for the opposite-hand flat.",
          "Rename a room, or fix a room-marker outline.",
          "Slim down a heavy SVG so it passes the checker.",
        ]}
        canAdd={[
          "Room markers (the room buttons) to a plan that has none.",
          "Flat and parking markers to a whole-floor or parking drawing.",
          "A variant of one flat type, if you say exactly where it differs.",
        ]}
        cannot="vague requests like “make it perfect”. Name the exact change, otherwise the AI keeps the plan as it is. Structure changes happen only if you clearly ask for them."
      />
      </div>

      <section className="border-border flex flex-col gap-4 border-t pt-8">
        <div>
          <h2 className="text-h3">Steps 5 &amp; 6 · Upload it, then give it to the right people</h2>
          <p className="text-body-sm text-fg-muted mt-1">Both happen in the other two tabs.</p>
        </div>
        <div className="grid max-w-4xl gap-4 md:grid-cols-2">
          {WORKFLOW_STEPS.filter((s) => s.link).map((s) => (
            <Link key={s.title} href={s.link!.href} className="border-border bg-surface-raised hover:border-accent flex flex-col gap-1.5 rounded-xl border-2 p-5 shadow-sm transition-colors">
              <span className="text-h4">
                {WORKFLOW_STEPS.indexOf(s) + 1} · {s.title}
              </span>
              <span className="text-body-sm text-fg-muted">{s.body}</span>
              <span className="text-accent text-body-sm mt-1 font-semibold">{s.link!.label} →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-border grid gap-6 border-t pt-8 md:grid-cols-2">
        <div>
          <h2 className="text-h4">What the AI can do</h2>
          <ul className="text-body-sm text-fg-muted mt-3 flex list-disc flex-col gap-2 pl-5">
            {AI_CAN_DO.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-h4">What must never change</h2>
          <ul className="text-body-sm text-fg-muted mt-3 flex list-disc flex-col gap-2 pl-5">
            {AI_MUST_KEEP.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-body-sm text-fg-muted mt-3">The prompts above already tell the AI all of this, and the upload checks it again.</p>
        </div>
      </section>

    </div>
  );
}

/** One short marker prompt (rooms, flats or parking bays): its own notes box, a Copy button, and the text tucked away until wanted. */
function MarkerPromptCard({ kind, step }: { kind: MarkerKind; step: string }) {
  const info = MARKER_KIND_INFO[kind];
  const [notes, setNotes] = useState("");
  const text = useMemo(() => markersPrompt(kind, notes), [kind, notes]);
  return (
    <div className="border-border bg-surface-raised flex min-w-0 flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <span className="bg-accent text-accent-foreground text-label flex size-7 shrink-0 items-center justify-center rounded-full">{step}</span>
        <div>
          <h3 className="text-h4">{info.title}</h3>
          <p className="text-caption text-fg-subtle">{info.when}</p>
        </div>
      </div>
      <Input label="Anything the AI should know (optional)" name={`markerNotes-${kind}`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={info.notesHint} />
      <div>
        <CopyButton text={text} label={`Copy ${info.title.toLowerCase()} prompt`} />
      </div>
      <details className="text-body-sm">
        <summary className="text-accent cursor-pointer font-semibold">Show the prompt text</summary>
        <PromptBox label="Prompt (select all to copy by hand)" name={`markers-${kind}`} value={text} />
      </details>
    </div>
  );
}

/**
 * Prompt 2 — markers for a ready SVG, in three SHORT prompts (rooms, flats, parking bays) given to the AI one at a time, so no single
 * answer is long enough to run out of room. Each answer is only its marker block; the tool below puts the blocks into the SVG.
 */
function MarkerSection() {
  const [svgText, setSvgText] = useState("");
  const [fileName, setFileName] = useState("");
  const [blocks, setBlocks] = useState<Record<MarkerKind, string>>({ rooms: "", flats: "", parking: "" });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ svg: string; added: string[]; report: BlueprintSvgReport } | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setSvgText(await file.text());
    setResult(null);
    setError(null);
  }

  function build() {
    setError(null);
    setResult(null);
    if (!svgText) return setError("Choose the finished SVG file first.");
    const merged = mergeMarkerGroups(svgText, [blocks.rooms, blocks.flats, blocks.parking]);
    if (merged.error || !merged.svg) return setError(merged.error ?? "Couldn't build the file.");
    setResult({ svg: merged.svg, added: merged.added, report: checkBlueprintSvg(merged.svg) });
  }

  function download() {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([result.svg], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName ? fileName.replace(/\.svg$/i, "") + "-with-markers.svg" : "plan-with-markers.svg";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div id="step-2" className="border-border flex scroll-mt-24 flex-col gap-6 border-t pt-8">
      <div>
        <h2 className="text-h3">Step 2 · Add the markers — rooms, flats and parking bays</h2>
        <p className="text-body-sm text-fg-muted mt-1 max-w-3xl">
          For a plan that is already finished. The AI never touches the drawing: it only writes the invisible markers, so the app finds the rooms, flats and parking bays by itself on upload. It is split into three short prompts, one at a time, so the AI never runs out of room.
        </p>
        <ol className="text-body-sm text-fg-muted mt-3 flex max-w-3xl list-decimal flex-col gap-1 pl-5">
          <li>
            Give the AI your SVG and press <strong className="text-fg">Copy</strong> on the <strong className="text-fg">Rooms</strong> card (a). Paste it. Save the block it returns.
          </li>
          <li>Do the same in a new message with the <strong className="text-fg">Flats</strong> card (b), then the <strong className="text-fg">Parking bays</strong> card (c). Skip any that the drawing does not need (a flat plan has no parking).</li>
          <li>Paste the blocks into the tool below. It puts them into the SVG and gives you the finished file.</li>
          <li>Upload that file. A marker in the wrong place is fixed by hand in the plan editor — you never redo the file.</li>
        </ol>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <MarkerPromptCard kind="rooms" step="a" />
        <MarkerPromptCard kind="flats" step="b" />
        <MarkerPromptCard kind="parking" step="c" />
      </div>

      <div className="bg-surface border-border flex flex-col gap-4 rounded-xl border p-5">
        <div>
          <h3 className="text-h4">Put the pieces together</h3>
          <p className="text-body-sm text-fg-muted mt-1">Nothing is uploaded or saved — this runs in your browser. Your original drawing is copied as it is; the blocks are added just before its closing tag.</p>
        </div>
        <div>
          <label className="text-body-sm mb-1 block font-semibold" htmlFor="merge-svg">
            1 · The finished SVG
          </label>
          <input id="merge-svg" type="file" accept=".svg,image/svg+xml" onChange={onFile} className="text-body-sm border-border-strong bg-surface-raised w-full max-w-xl rounded-md border px-3 py-2" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {(["rooms", "flats", "parking"] as const).map((k) => (
            <Textarea
              key={k}
              label={`2 · ${MARKER_KIND_INFO[k].title} block from the AI (optional)`}
              name={`block-${k}`}
              value={blocks[k]}
              onChange={(e) => {
                setBlocks((b) => ({ ...b, [k]: e.target.value }));
                setResult(null);
              }}
              rows={5}
              placeholder={`<g id="${k}"> … </g>`}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={build}>
            Build the finished SVG
          </Button>
          {result && (
            <Button type="button" variant="secondary" onClick={download}>
              Download the SVG
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="bg-error-soft text-error text-body-sm flex items-start gap-2 rounded-md px-3.5 py-3">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}
        {result && (
          <div role="status" className="text-body-sm flex flex-col gap-1.5">
            <p className="text-success flex items-center gap-1.5 font-semibold">
              <CheckCircle2 aria-hidden className="size-4" />
              Done — added: {result.added.join(", ")}.
            </p>
            <p className="text-fg-muted">
              Found in the file now: {result.report.rooms.length} {result.report.rooms.length === 1 ? "room" : "rooms"}, {result.report.areas.filter((a) => a.kind === "flat").length} flats, {result.report.areas.filter((a) => a.kind === "parking").length} parking bays.
            </p>
            {!result.report.ok &&
              result.report.errors.map((m) => (
                <p key={m} className="text-error flex items-start gap-1.5">
                  <XCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                  {m}
                </p>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
