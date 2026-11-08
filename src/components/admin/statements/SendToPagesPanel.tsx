"use client";

import { useState } from "react";
import { AlertTriangle, Check, LoaderCircle, Send } from "lucide-react";
import { CustomerPicker, type PickRecipient } from "@/components/admin/statements/CustomerPicker";
import { sendDocumentToClients } from "@/features/clientsOverview/actions";

/**
 * Sends the document on screen — the statement or notice made here, or a PDF / picture brought in (from an AI, a phone, anywhere) —
 * to the chosen clients' own pages. They find it under Documents in their app, and get an in-app message if they have an account.
 */
export function SendToPagesPanel({
  recipients,
  projects,
  defaultName,
  getFile,
  blockedReason,
  initialPicked,
}: {
  /** Clients already ticked when the panel opens. */
  initialPicked?: string[];
  recipients: PickRecipient[];
  projects: { value: string; label: string }[];
  defaultName: string;
  /** Builds the file to send (a made PDF, or the file that was added). */
  getFile: () => Promise<File>;
  blockedReason?: string;
}) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set((initialPicked ?? []).filter((id) => recipients.some((r) => r.id === id))));
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function send() {
    setBusy(true);
    setResult(null);
    try {
      const file = await getFile();
      const fd = new FormData();
      fd.set("file", file);
      fd.set("name", name.trim() || defaultName);
      const res = await sendDocumentToClients(Array.from(picked), fd);
      if (res.error) setResult({ ok: false, text: res.error });
      else {
        setResult({ ok: true, text: `Sent to ${res.sent} client${res.sent === 1 ? "" : "s"}. They will find it under Documents in their app.` });
        setPicked(new Set());
      }
    } catch {
      setResult({ ok: false, text: "Couldn't send it. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-border bg-surface-raised flex flex-col gap-3 rounded-xl border p-4">
      <div>
        <p className="text-body-sm text-fg flex items-center gap-2 font-semibold">
          <Send aria-hidden className="text-accent size-4" />
          Send this document to clients&apos; pages
        </p>
        <p className="text-caption text-fg-subtle mt-0.5 leading-snug">
          The document on the right goes into each chosen client&apos;s own page (Documents in their app). Works for a statement, a notice, or a PDF or picture you added.
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-caption text-fg-subtle">Name they will see</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={defaultName}
          className="text-body-sm border-border-strong bg-surface text-fg focus:border-accent h-10 w-full rounded-md border px-3 outline-none"
        />
      </label>

      <CustomerPicker recipients={recipients} projects={projects} picked={picked} onPicked={setPicked} showPhone={false} />

      {blockedReason && <p className="text-caption text-warning">{blockedReason}</p>}
      {result && (
        <div role={result.ok ? "status" : "alert"} className={result.ok ? "bg-success-soft text-success flex items-start gap-2 rounded-md px-3 py-2.5" : "bg-error-soft text-error flex items-start gap-2 rounded-md px-3 py-2.5"}>
          {result.ok ? <Check aria-hidden className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />}
          <p className="text-body-sm">{result.text}</p>
        </div>
      )}

      <button
        type="button"
        disabled={picked.size === 0 || busy || !!blockedReason}
        onClick={send}
        className="bg-accent text-accent-foreground text-body-sm inline-flex h-11 items-center justify-center gap-2 rounded-full font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Send aria-hidden className="size-4" />}
        {busy ? "Sending…" : picked.size === 0 ? "Choose clients first" : `Send to ${picked.size} client${picked.size === 1 ? "" : "s"}`}
      </button>
    </div>
  );
}
