"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Loader2, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

const CONFIRM_PHRASE = "REMOVE ALL DATA";

/**
 * Clears the practice data. Same bar as Restore (typed phrase), plus: a backup link right here, a tick that says a backup was taken
 * (or is not needed), and a choice about the public website's own content. Nothing is sent until every gate is passed.
 */
export function DemoDataPanel() {
  const [website, setWebsite] = useState(true);
  const [ack, setAck] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; total?: number; error?: string } | null>(null);

  const ready = ack && phrase === CONFIRM_PHRASE && !busy;

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/demo-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: phrase, website }),
      });
      const body = await res.json();
      if (!res.ok) setResult({ ok: false, error: body.error ?? "Removing the data failed." });
      else {
        setResult({ ok: true, total: body.result?.total ?? 0 });
        setPhrase("");
        setAck(false);
      }
    } catch {
      setResult({ ok: false, error: "Couldn't reach the server — check your connection. Nothing was changed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <section className="border-border bg-surface-raised rounded-xl border p-5">
        <h2 className="text-h5">What this does</h2>
        <div className="text-body-sm mt-3 grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-label text-error uppercase">Removed</p>
            <ul className="text-fg-muted mt-1.5 list-disc space-y-1 pl-5">
              <li>Projects, buildings, floors, units, parking</li>
              <li>Customers, shareholders, landowners and their app sign-ins</li>
              <li>Sales, bookings, installments, payments, budgets, cost splits</li>
              <li>Expenses, vendors, materials, purchases, stock</li>
              <li>Construction, documents, notifications, reminders, leads</li>
            </ul>
          </div>
          <div>
            <p className="text-label text-accent uppercase">Always kept</p>
            <ul className="text-fg-muted mt-1.5 list-disc space-y-1 pl-5">
              <li>Staff accounts and their passwords</li>
              <li>Company settings (logo, contact, social)</li>
              <li>Website page wording and the founder profile</li>
              <li>The audit log</li>
            </ul>
          </div>
        </div>
        <label className="border-border-strong mt-5 flex cursor-pointer items-start gap-3 rounded-lg border p-3.5">
          <input type="checkbox" checked={website} onChange={(e) => setWebsite(e.target.checked)} className="accent-accent mt-1 size-4" />
          <span>
            <span className="text-body-sm block font-medium">Also clear the public website content</span>
            <span className="text-caption text-fg-subtle block">Website projects and properties, news, gallery, team, our story and company policy. Untick to keep the site as it is.</span>
          </span>
        </label>
        <p className="text-caption text-fg-subtle mt-3">Uploaded picture and document files are not deleted from storage; they simply stop being used.</p>
      </section>

      <section className="border-error/40 bg-error-soft rounded-xl border p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle aria-hidden className="text-error mt-0.5 size-5 shrink-0" />
          <div>
            <h2 className="text-h5 text-error">This cannot be undone</h2>
            <p className="text-body-sm text-fg mt-1">The only way back is a backup. Download one now.</p>
            <a href="/api/admin/backup?mode=full" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-3")}>
              <Download aria-hidden className="size-4" />
              Download a full backup
            </a>
          </div>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="accent-accent mt-1 size-4" />
          <span className="text-body-sm">I have downloaded a backup, or I am sure I do not need one.</span>
        </label>

        <div className="mt-4 max-w-sm">
          <Input label={`Type ${CONFIRM_PHRASE} to confirm`} value={phrase} onChange={(e) => setPhrase(e.target.value)} autoComplete="off" placeholder={CONFIRM_PHRASE} />
        </div>

        <Button type="button" variant="primary" disabled={!ready} onClick={run} className="mt-4">
          {busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Trash2 aria-hidden className="size-4" />}
          {busy ? "Removing…" : "Remove all demo data"}
        </Button>

        {result && (
          <div role={result.ok ? "status" : "alert"} className={cn("text-body-sm mt-4 flex items-start gap-2 rounded-lg p-3", result.ok ? "bg-accent-soft text-accent-strong" : "bg-surface-raised text-error")}>
            {result.ok ? <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />}
            <span>{result.ok ? `Done. ${result.total} records were removed. Refresh the page to see the empty system.` : result.error}</span>
          </div>
        )}
      </section>
    </div>
  );
}
