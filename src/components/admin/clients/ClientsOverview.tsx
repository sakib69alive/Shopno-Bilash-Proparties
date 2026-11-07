"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, useTransition, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, FileUp, Pencil, Plus, Send, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PortalLinkControls, type PortalLinkSummary } from "@/components/admin/users/PortalLinkControls";
import { formatBDT } from "@/lib/format";
import { cn } from "@/lib/utils";
import { setSaleOwnerVisibility } from "@/features/sales/priceActions";
import { savePortalView, saveClientPlan, saveClientsTitles, sendClientDocument, sendClientMessage, setClientExtraSection } from "@/features/clientsOverview/actions";

export interface ClientRow {
  id: string;
  name: string;
  phone: string;
  hasAccount: boolean;
  link?: PortalLinkSummary;
  projectIds: string[];
  flats: { unitId: string; saleId: string; sizeSqft: number; hideMoney: boolean; hidePlan: boolean; hideConstruction: boolean; unit: string; projectName: string; price: number; paid: number; remaining: number }[];
  plan?: { amount?: number; date?: string; note?: string };
  inExtra: boolean;
  tint: number;
  lastSeenAt?: string;
  lastMessage?: { title: string; createdAt: string; readAt?: string };
}

export interface ClientsOverviewProps {
  rows: ClientRow[];
  projects: { id: string; name: string }[];
  title: string;
  extraTitle: string;
  canEdit: boolean;
  canSendDocument: boolean;
  canManageLinks: boolean;
}

/** One fixed time zone and locale, so the server's text and the browser's are identical. */
function absolute(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

function agoText(iso: string, now: number): string {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** "5 min ago · 3 Nov 2026, 4:20 pm" — the "ago" part appears once the page is in the browser (it depends on the clock). */
function When({ iso }: { iso?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!iso) return <span className="text-fg-subtle">never</span>;
  return (
    <span>
      {now !== null && <span className="font-semibold">{agoText(iso, now)} · </span>}
      {absolute(iso)}
    </span>
  );
}

/**
 * One colour per client, worked out from the client's own number (handed out once, in order, on the server). The hue jumps by the
 * golden angle each time, so neighbours in the list are always far apart; the lightness and strength change in a repeating pattern so
 * even clients with a close hue differ. The solid dot is the same colour at full strength — easy to match by eye.
 */
function tintOf(n: number): { bg: string; dot: string } {
  const hue = (n * 137.508) % 360;
  const l = [88, 80, 93][n % 3];
  const s = [80, 90, 70][Math.floor(n / 3) % 3];
  return { bg: `hsl(${hue.toFixed(0)} ${s}% ${l}%)`, dot: `hsl(${hue.toFixed(0)} 80% 45%)` };
}
const ColorsContext = createContext(true);
function chipStyle(on: boolean, tint: number): CSSProperties | undefined {
  return on ? { backgroundColor: tintOf(tint).bg } : undefined;
}
function Dot({ on, tint }: { on: boolean; tint: number }) {
  if (!on) return null;
  return <span aria-hidden className="mr-2 inline-block size-2.5 shrink-0 rounded-full align-middle" style={{ backgroundColor: tintOf(tint).dot }} />;
}

const NAME_CHIP =
  "text-body-sm border-border-strong bg-surface-raised hover:border-accent hover:text-accent min-h-11 rounded-full border px-4 py-2 text-left transition-[transform,border-color,color] active:scale-95";

export function ClientsOverview({ rows, projects, title, extraTitle, canEdit, canSendDocument, canManageLinks }: ClientsOverviewProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingTitles, setEditingTitles] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);
  const [extraDraft, setExtraDraft] = useState(extraTitle);
  const [isPending, startTransition] = useTransition();
  const [pickValue, setPickValue] = useState("");
  const router = useRouter();
  const [colors, setColors] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem("clients-colors") === "off") setColors(false);
    } catch {
      // storage unavailable — colours stay on
    }
  }, []);
  function toggleColors() {
    setColors((v) => {
      try {
        localStorage.setItem("clients-colors", v ? "off" : "on");
      } catch {
        // ignore
      }
      return !v;
    });
  }

  const open = rows.find((r) => r.id === openId) ?? null;
  const extraRows = rows.filter((r) => r.inExtra);
  // Who still needs their link, and who has a link but has not visited.
  const noLink = rows.filter((r) => !r.link?.enabled);
  const neverOpened = rows.filter((r) => r.link?.enabled && r.link.useCount === 0 && !r.lastSeenAt);
  const regular = rows.filter((r) => !r.inExtra);

  const groups = useMemo(() => {
    const list = projects
      .map((p) => ({ key: p.id, name: p.name, clients: regular.filter((r) => r.projectIds.includes(p.id)) }))
      .filter((g) => g.clients.length > 0);
    const loose = regular.filter((r) => r.projectIds.length === 0);
    if (loose.length > 0) list.push({ key: "none", name: "No flat yet", clients: loose });
    return list;
  }, [projects, regular]);

  function saveTitles() {
    startTransition(async () => {
      await saveClientsTitles(titleDraft, extraDraft);
      setEditingTitles(false);
      router.refresh();
    });
  }

  function toggleExtra(id: string, on: boolean) {
    startTransition(async () => {
      await setClientExtraSection(id, on);
      router.refresh();
    });
  }

  return (
    <ColorsContext.Provider value={colors}>
    <div className="mx-auto flex max-w-4xl flex-col gap-10">
      <div className="-mb-4 flex justify-end">
        <button type="button" role="switch" aria-checked={colors} onClick={toggleColors} className="border-border-strong bg-surface-raised flex h-10 items-center gap-2.5 rounded-full border px-4 text-sm font-semibold">
          <span className="flex -space-x-1" aria-hidden>
            {[0, 4, 3].map((i) => (
              <span key={i} className="size-3.5 rounded-full border border-black/10" style={{ backgroundColor: colors ? tintOf(i * 4).dot : "#e5e1d6" }} />
            ))}
          </span>
          Colours {colors ? "on" : "off"}
        </button>
      </div>
      <header className="text-center">
        {editingTitles ? (
          <div className="mx-auto flex max-w-md flex-col gap-3 text-left">
            <Input label="Title at the top" value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} maxLength={80} />
            <Input label="Heading of the extra section at the bottom" value={extraDraft} onChange={(e) => setExtraDraft(e.target.value)} maxLength={80} />
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={saveTitles} loading={isPending}>
                <Check aria-hidden className="size-4" /> Save
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setEditingTitles(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="font-serif-display text-fg text-[2.25rem] leading-tight sm:text-[3rem]">{title}</h2>
            <p className="text-fg-subtle mt-1 text-sm">
              {rows.length} client{rows.length === 1 ? "" : "s"} · {projects.length} project{projects.length === 1 ? "" : "s"}
            </p>
            {canEdit && (
              <button type="button" onClick={() => setEditingTitles(true)} className="text-accent mt-2 inline-flex items-center gap-1.5 text-sm font-semibold">
                <Pencil aria-hidden className="size-3.5" /> Change the titles
              </button>
            )}
          </>
        )}
      </header>

      {(noLink.length > 0 || neverOpened.length > 0) && (
        <section className="grid gap-4 sm:grid-cols-2">
          <AttentionList title="Link not made / sent yet" hint="No link has been copied for these clients." rows={noLink} onOpen={setOpenId} tone="warning" />
          <AttentionList title="Have a link, never opened it" hint="Link was made, but they have not visited yet." rows={neverOpened} onOpen={setOpenId} tone="error" />
        </section>
      )}

      {groups.length === 0 && <p className="text-fg-muted text-center">No clients yet.</p>}

      {groups.map((g) => (
        <section key={g.key}>
          <h3 className="font-serif-display text-fg mb-3 text-[1.75rem] leading-tight">
            {g.name} <span className="text-fg-subtle font-sans text-sm">· {g.clients.length}</span>
          </h3>
          <ul className="flex flex-wrap gap-2.5">
            {g.clients.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setOpenId(c.id)} className={NAME_CHIP} style={chipStyle(colors, c.tint)}>
                  <Dot on={colors} tint={c.tint} />
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="border-border border-t pt-8">
        <h3 className="font-serif-display text-fg text-[1.5rem] leading-tight">{extraTitle}</h3>
        <p className="text-fg-subtle mt-1 text-sm">Shown only here, not again under the projects above.</p>
        {extraRows.length === 0 ? (
          <p className="text-fg-muted border-border mt-4 rounded-2xl border border-dashed p-5 text-sm">No one added yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {extraRows.map((c) => (
              <li key={c.id} className="border-border bg-surface-raised flex items-start justify-between gap-3 rounded-2xl border p-4" style={chipStyle(colors, c.tint)}>
                <button type="button" onClick={() => setOpenId(c.id)} className="min-w-0 text-left">
                  <span className="text-body text-fg block font-semibold">
                    <Dot on={colors} tint={c.tint} />
                    {c.name}
                  </span>
                  <span className="text-caption text-fg-subtle mt-0.5 block">
                    {c.flats.length === 0 ? "No flat yet" : c.flats.map((f) => `${f.projectName} · ${f.unit}`).join("  ·  ")}
                  </span>
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => toggleExtra(c.id, false)}
                    disabled={isPending}
                    aria-label={`Remove ${c.name} from this section`}
                    title="Remove from this section"
                    className="hover:bg-surface text-fg-subtle hover:text-error flex size-9 shrink-0 items-center justify-center rounded-full transition-colors"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canEdit && regular.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <select
              value={pickValue}
              onChange={(e) => setPickValue(e.target.value)}
              aria-label="Choose a client to add"
              className="text-body-sm border-border-strong bg-surface-raised h-11 min-w-0 flex-1 rounded-md border px-3 sm:max-w-xs sm:flex-none"
            >
              <option value="">Choose a client…</option>
              {regular.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.flats.length > 1 ? ` (${c.flats.length} flats)` : ""}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!pickValue || isPending}
              onClick={() => {
                toggleExtra(pickValue, true);
                setPickValue("");
              }}
            >
              <Plus aria-hidden className="size-4" /> Add here
            </Button>
          </div>
        )}
      </section>

      {open && (
        <ClientPanel
          key={open.id}
          row={open}
          canEdit={canEdit}
          canSendDocument={canSendDocument}
          canManageLinks={canManageLinks}
          onClose={() => setOpenId(null)}
          onToggleExtra={(on) => toggleExtra(open.id, on)}
        />
      )}
    </div>
    </ColorsContext.Provider>
  );
}

function AttentionList({ title, hint, rows, onOpen, tone }: { title: string; hint: string; rows: ClientRow[]; onOpen: (id: string) => void; tone: "warning" | "error" }) {
  const [all, setAll] = useState(false);
  const colors = useContext(ColorsContext);
  const shown = all ? rows : rows.slice(0, 8);
  return (
    <div className={cn("rounded-2xl border p-4", tone === "warning" ? "border-warning/40 bg-warning-soft" : "border-error/30 bg-error-soft")}>
      <h3 className="text-fg text-sm font-semibold">
        {title} <span className="text-fg-subtle font-normal">· {rows.length}</span>
      </h3>
      <p className="text-fg-subtle mt-0.5 text-xs">{hint}</p>
      {rows.length === 0 ? (
        <p className="text-fg-muted mt-3 text-sm">Everyone is done.</p>
      ) : (
        <>
          <ul className="mt-3 flex flex-wrap gap-2">
            {shown.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onOpen(c.id)} className="bg-surface-raised border-border-strong min-h-9 rounded-full border px-3 py-1 text-sm" style={chipStyle(colors, c.tint)}>
                  <Dot on={colors} tint={c.tint} />
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
          {rows.length > 8 && (
            <button type="button" onClick={() => setAll((v) => !v)} className="text-accent mt-2 text-xs font-semibold">
              {all ? "Show fewer" : `Show all ${rows.length}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** One flat of this client: its size, and the switches for what the client's app shows about it. Every change saves the moment it is made. */
function FlatViewControls({ clientId, flat, canEdit }: { clientId: string; flat: ClientRow["flats"][number]; canEdit: boolean }) {
  const router = useRouter();
  const [size, setSize] = useState(String(flat.sizeSqft || ""));
  const [hideMoney, setHideMoney] = useState(flat.hideMoney);
  const [hidePlan, setHidePlan] = useState(flat.hidePlan);
  const [hideConstruction, setHideConstruction] = useState(flat.hideConstruction);
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  function save(next: { size?: string; plan?: boolean; construction?: boolean }) {
    setNote(null);
    const sizeText = (next.size ?? size).replace(/,/g, "").trim();
    startTransition(async () => {
      const result = await savePortalView(clientId, flat.unitId, {
        sizeSqft: sizeText === "" ? undefined : Number(sizeText),
        hidePlan: next.plan ?? hidePlan,
        hideConstruction: next.construction ?? hideConstruction,
      });
      setNote(result.error ? { text: result.error, ok: false } : { text: "Saved.", ok: true });
      if (!result.error) router.refresh();
    });
  }

  function toggleMoney(hide: boolean) {
    setHideMoney(hide);
    setNote(null);
    startTransition(async () => {
      await setSaleOwnerVisibility(flat.saleId, !hide);
      setNote({ text: "Saved.", ok: true });
      router.refresh();
    });
  }

  const Switch = ({ label, shown, onChange }: { label: string; shown: boolean; onChange: (shown: boolean) => void }) => (
    <button
      type="button"
      role="switch"
      aria-checked={shown}
      disabled={!canEdit || pending}
      onClick={() => onChange(!shown)}
      className={cn("flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border px-3.5 text-left text-sm whitespace-nowrap transition-colors", shown ? "border-success/40 bg-success-soft text-success" : "border-border-strong bg-surface text-fg-muted")}
    >
      <span className="font-medium">{label}</span>
      <span className="flex items-center gap-1 text-xs font-semibold">
        {shown ? <Eye aria-hidden className="size-3.5" /> : <EyeOff aria-hidden className="size-3.5" />}
        {shown ? "Shown" : "Hidden"}
      </span>
    </button>
  );

  return (
    <li className="border-border bg-surface-raised flex flex-col gap-3 rounded-xl border px-3.5 py-3 text-sm">
      <span className="flex justify-between gap-3">
        <span className="font-semibold">
          {flat.projectName} · {flat.unit}
        </span>
        <span className="text-fg-subtle tabular-nums">{formatBDT(flat.price)}</span>
      </span>
      <span className="text-fg-muted tabular-nums">
        {flat.saleId ? `${formatBDT(flat.paid)} paid · ${formatBDT(flat.remaining)} left` : "No sale recorded for this flat"}
      </span>
      <div className="flex items-end gap-2">
        <label className="text-caption text-fg-subtle flex flex-col gap-1">
          Size (sqft)
          <input
            inputMode="numeric"
            value={size}
            disabled={!canEdit}
            onChange={(e) => setSize(e.target.value)}
            className="text-body-sm border-border-strong bg-surface h-10 w-32 rounded-md border px-3 text-fg outline-none focus:border-accent"
          />
        </label>
        {canEdit && (
          <Button type="button" size="sm" variant="outline" loading={pending} disabled={size.replace(/,/g, "").trim() === String(flat.sizeSqft)} onClick={() => save({})}>
            Save size
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {flat.saleId && <Switch label="Payments" shown={!hideMoney} onChange={(shown) => toggleMoney(!shown)} />}
        <Switch
          label="Floor plan"
          shown={!hidePlan}
          onChange={(shown) => {
            setHidePlan(!shown);
            save({ plan: !shown });
          }}
        />
        <Switch
          label="Construction"
          shown={!hideConstruction}
          onChange={(shown) => {
            setHideConstruction(!shown);
            save({ construction: !shown });
          }}
        />
      </div>
      {note && <span className={cn("text-xs font-medium", note.ok ? "text-success" : "text-error")}>{note.text}</span>}
    </li>
  );
}

function ClientPanel({
  row,
  canEdit,
  canSendDocument,
  canManageLinks,
  onClose,
  onToggleExtra,
}: {
  row: ClientRow;
  canEdit: boolean;
  canSendDocument: boolean;
  canManageLinks: boolean;
  onClose: () => void;
  onToggleExtra: (on: boolean) => void;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(row.plan?.amount !== undefined ? String(row.plan.amount) : "");
  const [date, setDate] = useState(row.plan?.date ?? "");
  const [note, setNote] = useState(row.plan?.note ?? "");
  const [message, setMessage] = useState("");
  const [docName, setDocName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Live: while the panel is open the page re-reads the client's activity every 15 seconds.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(t);
  }, [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function run(task: () => Promise<{ error?: string }>, doneText: string, after?: () => void) {
    setStatus(null);
    startTransition(async () => {
      const result = await task();
      if (result.error) setStatus({ text: result.error, ok: false });
      else {
        setStatus({ text: doneText, ok: true });
        after?.();
        router.refresh();
      }
    });
  }

  const planChanged = (row.plan?.amount !== undefined ? String(row.plan.amount) : "") !== amount || (row.plan?.date ?? "") !== date || (row.plan?.note ?? "") !== note;
  const lastMsg = row.lastMessage;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end" role="dialog" aria-modal="true" aria-label={row.name}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/45" />
      <div className="bg-bg relative flex h-full w-full max-w-lg flex-col overflow-y-auto shadow-2xl">
        <div className="bg-bg border-border sticky top-0 z-10 flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            <p className="text-label text-fg-subtle uppercase">Client</p>
            <h3 className="font-serif-display text-fg truncate text-[1.75rem] leading-tight">{row.name}</h3>
            <p className="text-fg-subtle text-sm">{row.phone}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="border-border flex size-11 shrink-0 items-center justify-center rounded-full border">
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <div className="flex flex-col gap-7 px-5 py-6">
          {/* Link */}
          <section>
            <h4 className="text-label text-fg-subtle mb-2 uppercase">Their link</h4>
            {canManageLinks ? (
              <PortalLinkControls variant="full" ownerType="customer" ownerId={row.id} ownerName={row.name} phone={row.phone} summary={row.link} />
            ) : (
              <p className="text-fg-muted text-sm">You don&apos;t have permission to make or copy links.</p>
            )}
          </section>

          {/* What they will pay */}
          <section className="flex flex-col gap-3">
            <h4 className="text-label text-fg-subtle uppercase">What they will pay</h4>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Amount (৳)" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50000" disabled={!canEdit} />
              <Input label="On this day" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!canEdit} />
            </div>
            <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. after selling the land" maxLength={300} disabled={!canEdit} />
            {row.plan && (row.plan.amount !== undefined || row.plan.date) && !planChanged && (
              <p className="bg-accent-soft text-fg rounded-md px-3 py-2 text-sm">
                Expecting <span className="font-semibold">{row.plan.amount !== undefined ? formatBDT(row.plan.amount) : "an amount not set"}</span>
                {row.plan.date && <> on <span className="font-semibold">{new Date(row.plan.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span></>}.
              </p>
            )}
            {canEdit && (
              <div>
                <Button type="button" size="sm" disabled={!planChanged} loading={isPending} onClick={() => run(() => saveClientPlan(row.id, amount, date, note), "Saved.")}>
                  <Check aria-hidden className="size-4" /> Save
                </Button>
              </div>
            )}
            <p className="text-caption text-fg-subtle">This is only your plan for the client — it does not change what they owe or have paid.</p>
          </section>

          {/* Activity — live */}
          <section className="border-border bg-surface-raised flex flex-col gap-3 rounded-2xl border p-4">
            <h4 className="text-label text-fg-subtle flex items-center gap-2 uppercase">
              Their activity <span className="bg-success inline-block size-2 animate-pulse rounded-full" aria-label="live" />
            </h4>
            {!row.hasAccount && <p className="text-fg-muted text-sm">No app account yet — copy their link above and send it; their activity shows here after they open it.</p>}
            <div className="grid gap-3 text-sm">
              <div>
                <p className="text-caption text-fg-subtle uppercase">Last in the app</p>
                <p className="mt-0.5"><When iso={row.lastSeenAt} /></p>
              </div>
              {row.link && (
                <div>
                  <p className="text-caption text-fg-subtle uppercase">Link opened</p>
                  <p className="mt-0.5">
                    {row.link.useCount} time{row.link.useCount === 1 ? "" : "s"}
                    {row.link.lastUsedAt && <> · last <When iso={row.link.lastUsedAt} /></>}
                  </p>
                </div>
              )}
              <div>
                <p className="text-caption text-fg-subtle uppercase">Your last message to them</p>
                {lastMsg ? (
                  <>
                    <p className="mt-0.5 font-medium">{lastMsg.title}</p>
                    <p className={cn("mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", lastMsg.readAt ? "bg-success-soft text-success" : "bg-warning-soft text-warning")}>
                      {lastMsg.readAt ? <Eye aria-hidden className="size-3.5" /> : <EyeOff aria-hidden className="size-3.5" />}
                      {lastMsg.readAt ? "Seen" : "Not seen yet"}
                    </p>
                    <p className="text-fg-subtle mt-1 text-xs">
                      Sent <When iso={lastMsg.createdAt} />
                      {lastMsg.readAt && <> · seen <When iso={lastMsg.readAt} /></>}
                    </p>
                  </>
                ) : (
                  <p className="text-fg-subtle mt-0.5">Nothing sent yet.</p>
                )}
              </div>
            </div>
          </section>

          {/* Message */}
          {canEdit && (
            <section className="flex flex-col gap-2">
              <h4 className="text-label text-fg-subtle uppercase">Send a message</h4>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Write a short message — they will see it in their app."
                className="text-body border-border-strong bg-surface-raised w-full rounded-md border px-3.5 py-3 outline-none focus:border-accent"
              />
              <div>
                <Button type="button" size="sm" disabled={message.trim().length < 2} loading={isPending} onClick={() => run(() => sendClientMessage(row.id, message), "Message sent.", () => setMessage(""))}>
                  <Send aria-hidden className="size-4" /> Send
                </Button>
              </div>
            </section>
          )}

          {/* Document */}
          {canSendDocument && (
            <section className="flex flex-col gap-3">
              <h4 className="text-label text-fg-subtle uppercase">Send a document</h4>
              <Input label="Name (optional)" value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="e.g. Booking letter" />
              <input ref={fileRef} type="file" className="text-body-sm file:bg-surface-raised file:border-border-strong block w-full file:mr-3 file:rounded-md file:border file:px-3 file:py-2" />
              <div>
                <Button
                  type="button"
                  size="sm"
                  loading={isPending}
                  onClick={() => {
                    const file = fileRef.current?.files?.[0];
                    if (!file) {
                      setStatus({ text: "Choose a file first.", ok: false });
                      return;
                    }
                    const fd = new FormData();
                    fd.set("file", file);
                    fd.set("name", docName);
                    run(() => sendClientDocument(row.id, fd), "Document sent to the client.", () => {
                      setDocName("");
                      if (fileRef.current) fileRef.current.value = "";
                    });
                  }}
                >
                  <FileUp aria-hidden className="size-4" /> Send document
                </Button>
              </div>
            </section>
          )}

          {status && (
            <p role="status" className={cn("rounded-md px-3 py-2 text-sm", status.ok ? "bg-success-soft text-success" : "bg-error-soft text-error")}>
              {status.text}
            </p>
          )}

          {/* Flats */}
          <section className="flex flex-col gap-2">
            <h4 className="text-label text-fg-subtle uppercase">Their flats — and what they see in the app</h4>
            {row.flats.length === 0 ? (
              <p className="text-fg-muted text-sm">No flat yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {row.flats.map((f) => (
                  <FlatViewControls key={f.saleId} clientId={row.id} flat={f} canEdit={canEdit} />
                ))}
              </ul>
            )}
          </section>

          <div className="border-border flex flex-wrap items-center gap-2 border-t pt-5">
            <Link href={`/admin/customers/${row.id}`} className="text-accent text-sm font-semibold">Open full record</Link>
            <span className="text-fg-subtle">·</span>
            <Link href={`/admin/sales/payments/new?customerId=${row.id}`} className="text-accent inline-flex items-center gap-1 text-sm font-semibold">
              <Wallet aria-hidden className="size-3.5" /> Record a payment
            </Link>
            {canEdit && (
              <>
                <span className="text-fg-subtle">·</span>
                <button type="button" onClick={() => onToggleExtra(!row.inExtra)} className="text-accent text-sm font-semibold">
                  {row.inExtra ? "Remove from the extra section" : "Put in the extra section"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
