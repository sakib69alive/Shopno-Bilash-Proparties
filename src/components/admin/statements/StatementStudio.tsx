"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bold,
  Check,
  Copy,
  Download,
  FileImage,
  FileText,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Megaphone,
  UserRound,
  Building2,
  CalendarDays,
  LoaderCircle,
  PenLine,
  Plus,
  Quote,
  Receipt,
  Sparkles,
  Table2,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { LetterheadPages } from "@/components/admin/statements/LetterheadPages";
import { generateStatement } from "@/features/statements/actions";
import { formatDate } from "@/lib/format";
import { copyFirstPageImage, downloadPdf, downloadPng, safeFileName } from "@/lib/studio/exportDocument";
import { padBrief } from "@/lib/studio/aiBrief";
import { parseMarkdownToBlocks } from "@/lib/studio/markdown";
import { NOTICE_TEMPLATES, TEMPLATE_GROUPS, defaultValues, fillTemplate, findTemplate } from "@/lib/studio/templates";
import { PAGE_H, PAGE_W, type StudioDocument, type StudioLetterhead } from "@/lib/studio/types";
import type { StatementInput } from "@/features/statements/builders";

export interface StudioOption {
  value: string;
  label: string;
}
export interface StudioSaleOption extends StudioOption {
  customerId: string;
}
export interface StudioPaymentOption extends StudioOption {
  customerId: string;
}

type Kind = StatementInput["kind"];

const KINDS: { kind: Kind; label: string; hint: string; icon: typeof Megaphone }[] = [
  { kind: "announcement", label: "Notice", hint: "Announcement or letter on the letterhead", icon: Megaphone },
  { kind: "receipt", label: "Payment receipt", hint: "After a payment: paid now, total paid, remaining", icon: Receipt },
  { kind: "client", label: "Client statement", hint: "What a customer has paid, and what is left", icon: UserRound },
  { kind: "project", label: "Project summary", hint: "Money received and spent on a project", icon: Building2 },
  { kind: "daily", label: "Daily report", hint: "One day's money in and out", icon: CalendarDays },
];

type ToolId = "bold" | "italic" | "heading" | "bullets" | "numbers" | "quote" | "table";
const TOOLS: { id: ToolId; label: string; icon: typeof Bold }[] = [
  { id: "bold", label: "Bold", icon: Bold },
  { id: "italic", label: "Italic", icon: Italic },
  { id: "heading", label: "Heading", icon: Heading2 },
  { id: "bullets", label: "Bullet list", icon: List },
  { id: "numbers", label: "Numbered list", icon: ListOrdered },
  { id: "quote", label: "Quote", icon: Quote },
  { id: "table", label: "Table", icon: Table2 },
];

const EMPTY_DOC: StudioDocument = { kind: "", title: "", date: "", reference: "", blocks: [] };

const todayIso = () => new Date().toISOString().slice(0, 10);

function newReference(prefix: string): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `SBP-${prefix}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/**
 * Statements & Notices: pick a kind of document and the letterhead page(s)
 * appear — live, as you type or change a choice. Text pasted from an AI chat
 * keeps its **bold**, headings, lists and tables. Download as PDF or image, or
 * copy the image, and send it anywhere. Everything comes from the real records
 * (or the typed text); nothing is saved on the site.
 */
export function StatementStudio({
  customers,
  sales,
  projects,
  allowFinance,
  letterhead: baseLetterhead,
  addresses = [],
  payments,
  initial,
}: {
  customers: StudioOption[];
  sales: StudioSaleOption[];
  projects: StudioOption[];
  allowFinance: boolean;
  letterhead: StudioLetterhead;
  /** Addresses the admin can print at the top of the letterhead: the company office first, then each project's address. */
  addresses?: { value: string; label: string; address: string }[];
  payments: StudioPaymentOption[];
  /** Opened from a payment's page: start on its receipt. */
  initial?: { kind?: Kind; paymentId?: string; customerId?: string };
}) {
  const initialPayment = payments.find((p) => p.value === initial?.paymentId);
  // Opened from a client's page: start on that client's statement (money is shown, so finance access only).
  const initialCustomer = allowFinance && !initialPayment ? customers.find((c) => c.value === initial?.customerId) : undefined;
  const [kind, setKind] = useState<Kind>(initialPayment && allowFinance ? "receipt" : initialCustomer ? "client" : "announcement");
  // Which address and phone number are printed at the top-right of the letterhead. Starts from Settings; the choice is remembered on this computer.
  const [addressChoice, setAddressChoice] = useState<string>("company");
  const [customAddress, setCustomAddress] = useState("");
  const [phone, setPhone] = useState(baseLetterhead.phone ?? "");
  /* eslint-disable react-hooks/set-state-in-effect -- reads the remembered choice once after mount; it can't be read during render without a server/browser mismatch */
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("sbp.letterhead") ?? "null") as { choice?: string; custom?: string; phone?: string } | null;
      if (!saved) return;
      if (saved.choice && (saved.choice === "company" || saved.choice === "custom" || addresses.some((a) => a.value === saved.choice))) setAddressChoice(saved.choice);
      if (typeof saved.custom === "string") setCustomAddress(saved.custom);
      if (typeof saved.phone === "string") setPhone(saved.phone);
    } catch {
      // No saved choice (private window / blocked storage) — the defaults above are fine.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      window.localStorage.setItem("sbp.letterhead", JSON.stringify({ choice: addressChoice, custom: customAddress, phone }));
    } catch {
      // Remembering is a convenience only.
    }
  }, [addressChoice, customAddress, phone]);
  const letterhead = useMemo<StudioLetterhead>(() => {
    const chosen =
      addressChoice === "custom" ? customAddress.trim() : addressChoice === "company" ? baseLetterhead.address : addresses.find((a) => a.value === addressChoice)?.address;
    return { ...baseLetterhead, address: chosen || undefined, phone: phone.trim() || undefined };
  }, [baseLetterhead, addresses, addressChoice, customAddress, phone]);

  const [error, setError] = useState<string | null>(null);
  const [serverDoc, setServerDoc] = useState<{ key: string; doc: StudioDocument; letterhead: StudioLetterhead } | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<null | "pdf" | "png" | "copy">(null);
  const [copied, setCopied] = useState(false);

  // Fields
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [signer, setSigner] = useState("");
  const [signerRole, setSignerRole] = useState("");
  const [noticeDate, setNoticeDate] = useState(todayIso());
  const [customerId, setCustomerId] = useState(initialPayment?.customerId ?? initialCustomer?.value ?? "");
  const [paymentId, setPaymentId] = useState(initialPayment?.value ?? "");
  const [saleId, setSaleId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [day, setDay] = useState(todayIso());
  const [noticeRef] = useState(() => newReference("NT"));
  const [withSignature, setWithSignature] = useState(false);
  const padRef = useRef<HTMLDivElement>(null);
  const [padBusy, setPadBusy] = useState<null | "pdf" | "png" | "brief">(null);
  const [briefCopied, setBriefCopied] = useState(false);
  const [templateId, setTemplateId] = useState(""); // "" = custom
  const [values, setValues] = useState<Record<string, string>>({});
  const template = findTemplate(templateId);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [stackH, setStackH] = useState(PAGE_H);

  const sheetsRef = useRef<HTMLDivElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);

  // Fit the A4 sheets to the width of the preview area.
  useEffect(() => {
    const el = previewBoxRef.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, Math.max(0.3, (el.clientWidth - 2) / PAGE_W)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  });

  // The notice is built right here from what is typed, so the sheet follows every keystroke.
  const noticeDoc = useMemo<StudioDocument | null>(() => {
    if (!title.trim() && !body.trim()) return null;
    const blocks = parseMarkdownToBlocks(fillTemplate(body, template, values));
    return { kind: "Notice", title: fillTemplate(title, template, values).trim() || "Notice", date: formatDate(new Date(noticeDate || todayIso())), reference: noticeRef, blocks };
  }, [title, body, noticeDate, noticeRef, template, values]);

  // The other documents come from the records, so they refresh (shortly after the last change) whenever a choice changes.
  const input: StatementInput | null = useMemo(() => {
    if (kind === "receipt") return paymentId ? { kind, paymentId } : null;
    if (kind === "client") return customerId ? { kind, customerId, saleId: saleId || undefined } : null;
    if (kind === "project") return projectId ? { kind, projectId, from: from || undefined, to: to || undefined } : null;
    if (kind === "daily") return day ? { kind, date: day, projectId: projectId || undefined } : null;
    return null;
  }, [kind, customerId, saleId, projectId, from, to, day, paymentId]);
  const inputKey = input ? JSON.stringify(input) : "";

  useEffect(() => {
    if (!input) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const res = await generateStatement(input);
      if (cancelled) return;
      setLoading(false);
      if ("error" in res) {
        setError(res.error);
        setServerDoc(null);
      } else {
        setError(null);
        setServerDoc({ key: inputKey, doc: res.doc, letterhead: res.letterhead });
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // `input` is fully described by `inputKey`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputKey]);

  const base = useMemo<{ doc: StudioDocument; letterhead: StudioLetterhead } | null>(
    () => (kind === "announcement" ? (noticeDoc ? { doc: noticeDoc, letterhead } : null) : serverDoc && serverDoc.key === inputKey ? { doc: serverDoc.doc, letterhead } : null),
    [kind, noticeDoc, letterhead, serverDoc, inputKey],
  );
  // The signature is optional: only added when the button is on.
  const active = useMemo(() => {
    if (!base) return null;
    if (!withSignature) return base;
    return {
      ...base,
      doc: { ...base.doc, blocks: [...base.doc.blocks, { type: "signature" as const, name: signer.trim() || undefined, role: signerRole.trim() || undefined }] },
    };
  }, [base, withSignature, signer, signerRole]);

  // The sheets decide how many pages there are (from the real content height), so follow their real height.
  const hasActive = active !== null;
  useEffect(() => {
    const el = sheetsRef.current;
    if (!el) return;
    const read = () => setStackH(el.offsetHeight || PAGE_H);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasActive]);

  // Nothing half-written may leave the building: while a template field is empty (or a "Write here" cell is
  // untouched) the PDF / image / copy stay locked, and the list says exactly what is missing.
  const missing = useMemo(() => {
    if (kind !== "announcement") return [] as string[];
    const out: string[] = [];
    const re = /\{\{\s*(\w+)\s*\}\}/g;
    for (const text of [title, body]) {
      for (const m of text.matchAll(re)) {
        const field = template?.fields.find((f) => f.key === m[1]);
        const label = field ? field.label : `{{${m[1]}}}`;
        if ((!field || !(values[m[1]] ?? "").trim()) && !out.includes(label)) out.push(label);
      }
    }
    if (/write here/i.test(body)) out.push("the “Write here” cells");
    return out;
  }, [kind, title, body, template, values]);
  const blocked = missing.length > 0;

  const customerSales = sales.filter((s) => s.customerId === customerId);
  const visibleKinds = KINDS.filter((k) => allowFinance || k.kind === "announcement");

  // Small formatting toolbar for the notice text: it inserts the same marks an AI chat would paste in.
  function format(tool: ToolId) {
    const ta = bodyRef.current;
    const start = ta?.selectionStart ?? body.length;
    const end = ta?.selectionEnd ?? body.length;
    let value = body;
    let from = start;
    let to = end;

    const wrap = (before: string, after: string, placeholder: string) => {
      const chosen = body.slice(start, end) || placeholder;
      value = body.slice(0, start) + before + chosen + after + body.slice(end);
      from = start + before.length;
      to = from + chosen.length;
    };
    const prefix = (mark: (i: number) => string, placeholder: string) => {
      const lineStart = body.lastIndexOf("\n", start - 1) + 1;
      const chosen = body.slice(lineStart, end) || placeholder;
      const out = chosen
        .split("\n")
        .map((line, i) => mark(i) + line)
        .join("\n");
      value = body.slice(0, lineStart) + out + body.slice(end);
      from = lineStart;
      to = lineStart + out.length;
    };

    if (tool === "bold") wrap("**", "**", "bold text");
    else if (tool === "italic") wrap("*", "*", "italic text");
    else if (tool === "heading") prefix(() => "## ", "Heading");
    else if (tool === "bullets") prefix(() => "- ", "Point");
    else if (tool === "numbers") prefix((i) => `${i + 1}. `, "Step");
    else if (tool === "quote") prefix(() => "> ", "Note");
    else {
      const table = "\n\n| Item | Detail |\n|---|---|\n| First | Write here |\n| Second | Write here |\n\n";
      value = body.slice(0, start) + table + body.slice(end);
      from = to = start + table.length;
    }

    setBody(value);
    requestAnimationFrame(() => {
      bodyRef.current?.focus();
      bodyRef.current?.setSelectionRange(from, to);
    });
  }

  function chooseTemplate(id: string) {
    setTemplateId(id);
    const t = findTemplate(id);
    if (!t) {
      setValues({});
      return;
    }
    const v = defaultValues(t);
    // With a single project there is nothing to choose.
    if (t.fields.some((f) => f.type === "project") && projects.length === 1) v.project = projects[0].label;
    setValues(v);
    setTitle(t.title);
    setBody(t.body);
  }

  // The blank letterhead ("pad") to hand to an AI, plus the instructions that go with it.
  async function padAction(action: "pdf" | "png" | "brief") {
    setPadBusy(action);
    setError(null);
    try {
      if (action === "brief") {
        await navigator.clipboard.writeText(padBrief(letterhead));
        setBriefCopied(true);
        window.setTimeout(() => setBriefCopied(false), 2200);
        return;
      }
      const page = padRef.current?.querySelector<HTMLElement>("[data-studio-page]");
      if (!page) return;
      if (action === "pdf") await downloadPdf([page], "Letterhead-pad");
      else await downloadPng([page], "Letterhead-pad");
    } catch {
      setError("Couldn't prepare the letterhead. Please try again.");
    } finally {
      setPadBusy(null);
    }
  }

  async function run(action: "pdf" | "png" | "copy") {
    if (!active || blocked) return;
    setBusy(action);
    setError(null);
    try {
      const pages = Array.from(sheetsRef.current?.querySelectorAll<HTMLElement>("[data-studio-page]") ?? []);
      const name = safeFileName(`${active.doc.kind}-${active.doc.title}`);
      if (action === "pdf") await downloadPdf(pages, name);
      else if (action === "png") await downloadPng(pages, name);
      else {
        const ok = await copyFirstPageImage(pages);
        if (!ok) setError("Your browser can't copy images — use Download image instead.");
        else {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        }
      }
    } catch {
      setError("Couldn't create the file. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const pageCount = active ? Math.max(1, Math.round((stackH + 24) / (PAGE_H + 24))) : 0;

  return (
    <div className="grid gap-6 p-4 sm:p-6 xl:grid-cols-[24rem_1fr]">
      {/* Controls */}
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-2">
          {visibleKinds.map(({ kind: k, label, hint, icon: Icon }) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setKind(k);
                setError(null);
              }}
              aria-pressed={kind === k}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors",
                kind === k ? "border-accent bg-accent-soft" : "border-border bg-surface-raised hover:bg-surface",
              )}
            >
              <Icon aria-hidden className={cn("size-5", kind === k ? "text-accent" : "text-fg-subtle")} />
              <span className="text-body-sm text-fg font-semibold">{label}</span>
              <span className="text-caption text-fg-subtle leading-snug">{hint}</span>
            </button>
          ))}
        </div>

        <div className="border-border bg-surface-raised flex flex-col gap-3 rounded-xl border p-4">
          <p className="text-label text-fg-subtle uppercase">Address &amp; phone on the letterhead</p>
          <Select
            label="Which address?"
            value={addressChoice}
            onChange={(e) => setAddressChoice(e.target.value)}
            options={[
              { value: "company", label: baseLetterhead.address ? `Company office — ${baseLetterhead.address}` : "Company office (not set in Settings yet)" },
              ...addresses.map((a) => ({ value: a.value, label: a.label })),
              { value: "custom", label: "Another address — type it" },
            ]}
          />
          {addressChoice === "custom" && (
            <Input label="Address" value={customAddress} onChange={(e) => setCustomAddress(e.target.value)} placeholder="e.g. House 14, Road 3, Dhanmondi, Dhaka" />
          )}
          <Input label="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +880 1712-345678" helperText="Printed under the address. Your choice is remembered on this computer. To change the default for everyone, edit Settings → Company." />
        </div>

        <div className="border-border bg-surface-raised flex flex-col gap-4 rounded-xl border p-4">
          {kind === "announcement" && (
            <>
              {/* Ready-made notices for the things written again and again: pick one, fill in the few details. */}
              <div className="flex flex-col gap-3">
                <p className="text-label text-fg-muted">Start from</p>
                <button
                  type="button"
                  onClick={() => chooseTemplate("")}
                  aria-pressed={templateId === ""}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors",
                    templateId === "" ? "border-accent bg-accent-soft text-fg" : "border-border bg-surface-raised text-fg-muted hover:bg-surface",
                  )}
                >
                  Custom — write your own
                </button>
                {TEMPLATE_GROUPS.map((g) => (
                  <div key={g}>
                    <p className="text-caption text-fg-subtle mb-1.5 uppercase">{g}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {NOTICE_TEMPLATES.filter((t) => t.group === g).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          title={t.hint}
                          onClick={() => chooseTemplate(t.id)}
                          aria-pressed={templateId === t.id}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                            templateId === t.id ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface-raised text-fg-muted hover:bg-surface hover:text-fg",
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {template && (
                <div className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-body-sm text-fg font-semibold">{template.label}</p>
                      <p className="text-caption text-fg-subtle">Fill in these — the text below updates by itself.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTitle(template.title);
                        setBody(template.body);
                      }}
                      className="text-caption text-accent hover:text-accent-strong shrink-0"
                    >
                      Reset text
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {template.fields.map((f) =>
                      f.type === "project" ? (
                        <Select
                          key={f.key}
                          label={f.label}
                          value={values[f.key] ?? ""}
                          onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                          options={projects.map((pr) => ({ value: pr.label, label: pr.label }))}
                          placeholder="Choose"
                        />
                      ) : (
                        <Input
                          key={f.key}
                          label={f.label}
                          type={f.type === "date" ? "date" : f.type === "time" ? "time" : f.type === "number" ? "number" : "text"}
                          value={values[f.key] ?? ""}
                          onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                        />
                      ),
                    )}
                  </div>
                </div>
              )}

              <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Office closed on Eid day" />
              <div className="-mb-2 flex flex-wrap items-center gap-1" role="toolbar" aria-label="Text formatting">
                {TOOLS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => format(id)}
                    title={label}
                    aria-label={label}
                    className="text-fg-muted hover:bg-surface hover:text-fg hover:border-border flex size-9 items-center justify-center rounded-md border border-transparent transition-colors"
                  >
                    <Icon aria-hidden className="size-4" />
                  </button>
                ))}
              </div>
              <Textarea
                ref={bodyRef}
                label="Text"
                rows={12}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type, or paste text copied from an AI chat. A blank line starts a new paragraph."
                helperText="Bold (**text**), # headings, - bullet lists, 1. numbered lists and | tables | from AI chats are kept as they are."
              />
              <Input label="Date" type="date" value={noticeDate} onChange={(e) => setNoticeDate(e.target.value)} />
            </>
          )}

          {kind === "receipt" && (
            <>
              <Select
                label="Customer"
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  // The newest payment of this customer is the one a receipt is usually wanted for.
                  setPaymentId(payments.find((p) => p.customerId === e.target.value)?.value ?? "");
                }}
                options={customers}
                placeholder="Choose a customer"
              />
              {customerId && (
                <Select
                  label="Payment"
                  value={paymentId}
                  onChange={(e) => setPaymentId(e.target.value)}
                  options={payments.filter((p) => p.customerId === customerId)}
                  placeholder="Choose a payment"
                />
              )}
              <p className="text-caption text-fg-subtle -mt-1">Newest payments first. The remaining amount on the receipt is an estimate from the recorded price and payments.</p>
            </>
          )}

          {kind === "client" && (
            <>
              <Select
                label="Customer"
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  setSaleId("");
                }}
                options={customers}
                placeholder="Choose a customer"
              />
              {customerSales.length > 1 && (
                <Select label="Flat" value={saleId} onChange={(e) => setSaleId(e.target.value)} options={customerSales} placeholder="All flats" />
              )}
            </>
          )}

          {kind === "project" && (
            <>
              <Select label="Project" value={projectId} onChange={(e) => setProjectId(e.target.value)} options={projects} placeholder="Choose a project" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="From (optional)" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                <Input label="To (optional)" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <p className="text-caption text-fg-subtle -mt-1">Leave the dates empty for everything so far.</p>
            </>
          )}

          {kind === "daily" && (
            <>
              <Input label="Date" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
              <Select label="Project" value={projectId} onChange={(e) => setProjectId(e.target.value)} options={projects} placeholder="All projects" />
            </>
          )}

          <div className="border-border border-t pt-4">
            {withSignature ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-label text-fg-muted">Signature</span>
                  <button type="button" onClick={() => setWithSignature(false)} className="text-caption text-fg-subtle hover:text-error inline-flex items-center gap-1">
                    <X aria-hidden className="size-3.5" />
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Signed by" value={signer} onChange={(e) => setSigner(e.target.value)} placeholder="Name (optional)" />
                  <Input label="Role" value={signerRole} onChange={(e) => setSignerRole(e.target.value)} placeholder="e.g. Managing Director" />
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => setWithSignature(true)}>
                <PenLine aria-hidden className="size-4" />
                <Plus aria-hidden className="-ml-1 size-3.5" />
                Add signature
              </Button>
            )}
          </div>

          {error && (
            <div role="alert" className="bg-error-soft text-error flex items-start gap-2 rounded-md px-3 py-2.5">
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <p className="text-body-sm">{error}</p>
            </div>
          )}

          {kind !== "announcement" && (
            <p className="text-caption text-fg-subtle inline-flex items-center gap-2">
              {loading ? <LoaderCircle aria-hidden className="size-3.5 animate-spin" /> : null}
              {loading ? "Updating the document…" : "The document updates as you change these."}
            </p>
          )}
        </div>

        {/* The blank letterhead for an AI: download it, give it to Claude (or any AI) with the details, let it write on the pad. */}
        <div className="border-border bg-surface-raised flex flex-col gap-3 rounded-xl border p-4">
          <div>
            <p className="text-body-sm text-fg font-semibold">Blank letterhead for an AI</p>
            <p className="text-caption text-fg-subtle mt-0.5 leading-snug">
              Download the empty pad, give it to Claude or any AI together with the instructions and your details — it writes on the pad. Paste the result back here.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => padAction("pdf")} loading={padBusy === "pdf"} disabled={padBusy !== null}>
              <FileText aria-hidden className="size-3.5" />
              Pad PDF
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => padAction("png")} loading={padBusy === "png"} disabled={padBusy !== null}>
              <FileImage aria-hidden className="size-3.5" />
              Pad image
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => padAction("brief")} loading={padBusy === "brief"} disabled={padBusy !== null}>
              {briefCopied ? <Check aria-hidden className="size-3.5" /> : <Sparkles aria-hidden className="size-3.5" />}
              {briefCopied ? "Copied" : "Copy AI instructions"}
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden copy of the blank pad, used only for the pad downloads. */}
      <div aria-hidden style={{ position: "fixed", left: -10000, top: 0 }}>
        <LetterheadPages ref={padRef} doc={EMPTY_DOC} letterhead={letterhead} pad />
      </div>

      {/* Preview */}
      <div className="min-w-0">
        {active ? (
          <>
            {blocked && (
              <div role="status" className="bg-warning-soft text-warning mb-3 flex items-start gap-2.5 rounded-lg px-3.5 py-3">
                <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
                <p className="text-body-sm">
                  <b>Not ready to download yet.</b> Fill in: {missing.join(", ")}. The PDF, image and copy unlock as soon as nothing is left blank.
                </p>
              </div>
            )}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Button type="button" onClick={() => run("pdf")} loading={busy === "pdf"} disabled={busy !== null || blocked}>
                <FileText aria-hidden className="size-4" />
                Download PDF
              </Button>
              <Button type="button" variant="secondary" onClick={() => run("png")} loading={busy === "png"} disabled={busy !== null || blocked}>
                <FileImage aria-hidden className="size-4" />
                Download image
              </Button>
              <Button type="button" variant="outline" onClick={() => run("copy")} loading={busy === "copy"} disabled={busy !== null || blocked}>
                {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
                {copied ? "Copied" : "Copy image"}
              </Button>
              <span className="text-caption text-fg-subtle ml-1">
                {pageCount} {pageCount === 1 ? "page" : "pages"} · A4
              </span>
            </div>

            <div ref={previewBoxRef} className="bg-surface border-border overflow-hidden rounded-xl border p-3 sm:p-5">
              {/* Scaled for the screen only; the export reads the unscaled sheets. */}
              <div style={{ width: PAGE_W * scale, height: stackH * scale }}>
                <div style={{ width: PAGE_W, transform: `scale(${scale})`, transformOrigin: "top left" }}>
                  <LetterheadPages ref={sheetsRef} doc={active.doc} letterhead={active.letterhead} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div ref={previewBoxRef} className="border-border text-fg-subtle flex min-h-[24rem] flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 text-center">
            {loading ? <LoaderCircle aria-hidden className="size-6 animate-spin" /> : <Download aria-hidden className="size-6" />}
            <p className="text-body-sm max-w-sm">
              {kind === "announcement"
                ? "Start typing (or paste) on the left — your notice appears here on the company letterhead, live."
                : "Choose from the options on the left and the document appears here, ready to download as a PDF or image."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
