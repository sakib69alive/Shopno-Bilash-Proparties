"use client";

import { AdminText } from "../AdminLanguage";
import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, ImageOff, Images, Loader2, UploadCloud } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

const CONFIRM_PHRASE = "RESTORE";

interface RestoreSummary {
  tables: number;
  rows: number;
  files: number;
  skippedTables: string[];
}

/**
 * The full backup/restore control panel. Downloads are plain links (not
 * fetch+blob) — a `Content-Disposition: attachment` response triggers the
 * browser's native save flow on desktop and mobile alike, with no extra
 * plumbing and no size limit imposed by holding the whole zip in JS memory
 * twice. Restore is the one truly dangerous action here (it replaces the
 * live database), so it's gated behind an explicit warning plus typing a
 * confirmation phrase — the same "can't happen by accident" bar as
 * deleting an account, not a plain confirm() dialog.
 */
export function BackupPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; summary?: RestoreSummary; error?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canRestore = !!file && confirmText === CONFIRM_PHRASE && !restoring;

  async function handleRestore() {
    if (!file) return;
    setRestoring(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.set("backup", file);
      const response = await fetch("/api/admin/backup/restore", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) {
        setResult({ ok: false, error: body.error ?? "Restore failed for an unknown reason." });
      } else {
        setResult({ ok: true, summary: body.summary });
        setFile(null);
        setConfirmText("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch {
      setResult({ ok: false, error: "Couldn't reach the server — check your connection and try again." });
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-h3"><AdminText>{"Download a Backup"}</AdminText></h2>
          <p className="text-body-sm text-fg-muted mt-1">
            <AdminText>{"Everything in the admin panel — every project, unit, sale, payment, expense, owner, document record, plus all the public-site content you edit here (About/Our Story, Founder Profile, Company Policy, News, Gallery captions, Settings). Saves straight to your device; nothing is kept on our server."}</AdminText>
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <a href="/api/admin/backup?mode=full" className="border-border-strong bg-surface-raised flex flex-col gap-3 rounded-lg border p-5">
            <Images aria-hidden className="text-accent size-6" />
            <div>
              <p className="text-body font-semibold text-fg"><AdminText>{"Full Backup"}</AdminText></p>
              <p className="text-body-sm text-fg-muted mt-1">
                <AdminText>{"All data, plus every uploaded photo and document. Larger file, takes longer — the complete picture."}</AdminText>
              </p>
            </div>
            <span className={cn(buttonVariants({ size: "sm" }), "mt-auto w-full")}>
              <Download aria-hidden className="size-4" />
              <AdminText>{"Download Full Backup"}</AdminText>
            </span>
          </a>

          <a href="/api/admin/backup?mode=data" className="border-border-strong bg-surface-raised flex flex-col gap-3 rounded-lg border p-5">
            <ImageOff aria-hidden className="text-fg-muted size-6" />
            <div>
              <p className="text-body font-semibold text-fg"><AdminText>{"Data Only"}</AdminText></p>
              <p className="text-body-sm text-fg-muted mt-1">
                <AdminText>{"Every record and number, no images or documents. Small, fast — good for a quick, frequent backup."}</AdminText>
              </p>
            </div>
            <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-auto w-full")}>
              <Download aria-hidden className="size-4" />
              <AdminText>{"Download Data Only"}</AdminText>
            </span>
          </a>
        </div>
      </section>

      <section className="border-border border-t pt-8">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-h3"><AdminText>{"Restore From a Backup"}</AdminText></h2>
            <p className="text-body-sm text-fg-muted mt-1">
              <AdminText>{"Pick a backup .zip downloaded from this page — everything in it goes back to exactly where it came from automatically, no manual sorting needed."}</AdminText>
            </p>
          </div>

          <div role="alert" className="bg-warning-soft text-warning flex items-start gap-2.5 rounded-md px-3.5 py-3">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            <p className="text-body-sm">
              <AdminText>{"This replaces all current data with the backup’s contents — anything added or changed since that backup was taken will be lost. This can’t be undone. If unsure, download a fresh backup first."}</AdminText>
            </p>
          </div>

          <Input
            ref={fileInputRef}
            label="Backup File"
            name="backup"
            type="file"
            accept=".zip"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
            }}
          />

          <Input
            label={'Type "RESTORE" to confirm'}
            name="confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            autoComplete="off"
          />

          {result && !result.ok && (
            <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <p className="text-body-sm"><AdminText>{result.error ?? "Restore failed for an unknown reason."}</AdminText></p>
            </div>
          )}

          {result?.ok && result.summary && (
            <div role="status" className="bg-success-soft text-success flex items-start gap-2.5 rounded-md px-3.5 py-3">
              <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
              <div className="text-body-sm">
                <p>
                  <AdminText values={{ tables: result.summary.tables, rows: result.summary.rows.toLocaleString(), files: result.summary.files.toLocaleString() }}>{result.summary.files > 0 ? "Restored {tables} tables, {rows} records, {files} files." : "Restored {tables} tables, {rows} records."}</AdminText>
                </p>
                {result.summary.skippedTables.length > 0 && (
                  <p className="mt-1 opacity-80">
                    <AdminText values={{ tables: result.summary.skippedTables.join(", ") }}>{"Skipped (not part of this version): {tables}"}</AdminText>
                  </p>
                )}
                <p className="mt-2 font-medium"><AdminText>{"Reload the page now to see the restored data."}</AdminText></p>
              </div>
            </div>
          )}

          <Button variant="destructive" disabled={!canRestore} onClick={handleRestore} className="w-fit">
            {restoring ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <UploadCloud aria-hidden className="size-4" />}
            <AdminText>{restoring ? "Restoring…" : "Restore Now"}</AdminText>
          </Button>
        </div>
      </section>
    </div>
  );
}
