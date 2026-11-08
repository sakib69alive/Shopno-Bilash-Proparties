"use client";

import { useEffect, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { SendToPagesPanel } from "@/components/admin/statements/SendToPagesPanel";
import type { PickRecipient } from "@/components/admin/statements/CustomerPicker";

/** Add one file (a PDF or picture — from a phone, an AI, anywhere) and send it to one or many clients' pages. */
export function SendDocumentForm({ recipients, projects, initialPicked }: { recipients: PickRecipient[]; projects: { value: string; label: string }[]; initialPicked: string[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the preview address belongs to the chosen file
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function take(f: File | undefined) {
    if (!f) return;
    if (!/\.(pdf|png|jpe?g|webp|svg|docx?)$/i.test(f.name)) return setError("Please choose a PDF, a picture (PNG, JPG, WebP) or a Word file.");
    if (f.size > 15 * 1024 * 1024) return setError("That file is bigger than 15 MB. Please choose a smaller one.");
    setError(null);
    setFile(f);
  }

  const isPdf = !!file && /\.pdf$/i.test(file.name);
  const isImage = !!file && /\.(png|jpe?g|webp|svg)$/i.test(file.name);

  return (
    <div className="grid gap-6 p-4 sm:p-6 xl:grid-cols-[26rem_1fr]">
      <div className="flex flex-col gap-4">
        <div className="border-border bg-surface-raised flex flex-col gap-3 rounded-xl border p-4">
          <p className="text-body-sm text-fg font-semibold">1. Add the file</p>
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              take(e.dataTransfer.files?.[0]);
            }}
            className="border-border-strong text-body-sm text-fg hover:bg-surface flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-6 text-center transition-colors"
          >
            <Upload aria-hidden className="text-accent size-4 shrink-0" />
            {file ? "Choose a different file" : "Choose a PDF or picture"}
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.svg,.doc,.docx,application/pdf,image/*"
              className="sr-only"
              onChange={(e) => {
                take(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {file && (
            <div className="bg-surface flex items-center gap-2 rounded-md px-3 py-2">
              <FileText aria-hidden className="text-accent size-4 shrink-0" />
              <span className="text-body-sm text-fg min-w-0 flex-1 truncate">{file.name}</span>
              <button type="button" onClick={() => setFile(null)} aria-label="Remove the file" className="text-fg-subtle hover:text-error">
                <X aria-hidden className="size-4" />
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="text-caption text-error">
              {error}
            </p>
          )}
          <p className="text-caption text-fg-subtle">From a phone, an AI, a scanner — any file up to 15 MB.</p>
        </div>

        <SendToPagesPanel
          recipients={recipients}
          projects={projects}
          initialPicked={initialPicked}
          defaultName={file ? file.name.replace(/\.[^.]+$/, "") : "Document"}
          getFile={async () => {
            if (!file) throw new Error("no file");
            return file;
          }}
          blockedReason={file ? undefined : "Add the file first."}
        />
      </div>

      <div className="min-w-0">
        {file && previewUrl ? (
          <div className="bg-surface border-border overflow-hidden rounded-xl border">
            {isPdf ? (
              <iframe title={`Preview of ${file.name}`} src={`${previewUrl}#view=FitH`} className="h-[80vh] w-full" />
            ) : isImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- a local blob URL, not a site image
              <img src={previewUrl} alt={file.name} className="mx-auto max-h-[80vh] w-auto max-w-full" />
            ) : (
              <p className="text-body-sm text-fg-muted p-6">No preview for this kind of file, but it will be sent as it is.</p>
            )}
          </div>
        ) : (
          <div className="border-border text-fg-subtle flex min-h-[20rem] flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 text-center">
            <FileText aria-hidden className="size-6" />
            <p className="text-body-sm max-w-sm">Add a file on the left and it appears here. Then choose the clients and press Send.</p>
          </div>
        )}
      </div>
    </div>
  );
}
