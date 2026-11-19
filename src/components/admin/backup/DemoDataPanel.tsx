"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
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
        <h2 className="text-h5"><AdminText>{"What this does"}</AdminText></h2>
        <div className="text-body-sm mt-3 grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-label text-error uppercase"><AdminText>{"Removed"}</AdminText></p>
            <ul className="text-fg-muted mt-1.5 list-disc space-y-1 pl-5">
              <li><AdminText>{"Projects, buildings, floors, units, parking"}</AdminText></li>
              <li><AdminText>{"Customers, shareholders, landowners and their app sign-ins"}</AdminText></li>
              <li><AdminText>{"Sales, bookings, installments, payments, budgets, cost splits"}</AdminText></li>
              <li><AdminText>{"Expenses, vendors, materials, purchases, stock"}</AdminText></li>
              <li><AdminText>{"Construction, documents, notifications, reminders, leads"}</AdminText></li>
            </ul>
          </div>
          <div>
            <p className="text-label text-accent uppercase"><AdminText>{"Always kept"}</AdminText></p>
            <ul className="text-fg-muted mt-1.5 list-disc space-y-1 pl-5">
              <li><AdminText>{"Staff accounts and their passwords"}</AdminText></li>
              <li><AdminText>{"Company settings (logo, contact, social)"}</AdminText></li>
              <li><AdminText>{"Website page wording and the founder profile"}</AdminText></li>
              <li><AdminText>{"The audit log"}</AdminText></li>
            </ul>
          </div>
        </div>
        <label className="border-border-strong mt-5 flex cursor-pointer items-start gap-3 rounded-lg border p-3.5">
          <input type="checkbox" checked={website} onChange={(e) => setWebsite(e.target.checked)} className="accent-accent mt-1 size-4" />
          <span>
            <span className="text-body-sm block font-medium"><AdminText>{"Also clear the public website content"}</AdminText></span>
            <span className="text-caption text-fg-subtle block"><AdminText>{"Website projects and properties, news, gallery, team, our story and company policy. Untick to keep the site as it is."}</AdminText></span>
          </span>
        </label>
        <p className="text-caption text-fg-subtle mt-3"><AdminText>{"Uploaded picture and document files are not deleted from storage; they simply stop being used."}</AdminText></p>
      </section>

      <section className="border-error/40 bg-error-soft rounded-xl border p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle aria-hidden className="text-error mt-0.5 size-5 shrink-0" />
          <div>
            <h2 className="text-h5 text-error"><AdminText>{"This cannot be undone"}</AdminText></h2>
            <p className="text-body-sm text-fg mt-1"><AdminText>{"The only way back is a backup. Download one now."}</AdminText></p>
            <a href="/api/admin/backup?mode=full" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-3")}>
              <Download aria-hidden className="size-4" />
              <AdminText>{"Download a full backup"}</AdminText>
            </a>
          </div>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="accent-accent mt-1 size-4" />
          <span className="text-body-sm"><AdminText>{"I have downloaded a backup, or I am sure I do not need one."}</AdminText></span>
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
