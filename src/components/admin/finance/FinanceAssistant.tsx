"use client";

import { AdminText, useAdminLanguage } from "@/components/admin/AdminLanguage";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { financePage, type FinanceAssistantContext, type FinanceSelection } from "@/lib/financeAssistant";
import { installmentMinorUnits, parseInstallmentAmount } from "@/lib/goalInstallmentAllocation";
import { formatBDT } from "@/lib/format";

export const FINANCE_SELECT_EVENT = "shopno:finance-assistant-selection";
export const FINANCE_PROJECT_EVENT = "shopno:finance-assistant-project";
const LIVE_UPDATE_INTERVAL = 5000;

export function setFinanceAssistantProject(project: string) {
  window.dispatchEvent(new CustomEvent(FINANCE_PROJECT_EVENT, { detail: { path: window.location.pathname, project } }));
}

export function ExplainFinanceButton({ selection, label = "Explain" }: { selection: FinanceSelection; label?: string }) {
  return (
    <button type="button" className="text-accent hover:bg-accent-soft rounded-md px-2 py-1 text-sm font-medium"
      onClick={() => window.dispatchEvent(new CustomEvent(FINANCE_SELECT_EVENT, { detail: { path: window.location.pathname, selection } }))}>
      <AdminText>{label}</AdminText>
    </button>
  );
}

export function FinanceMode({ selection, projectFilter, onClear, onClose }: {
  selection?: FinanceSelection;
  projectFilter?: string;
  onClear: () => void;
  onClose: () => void;
}) {
  const { t } = useAdminLanguage();
  const path = usePathname();
  const params = useSearchParams();
  const page = financePage(path);
  const [result, setResult] = useState<{ key: string; data?: FinanceAssistantContext; error?: string }>();
  const [proposal, setProposal] = useState("");
  const [reviewKey, setReviewKey] = useState<string>();
  const project = projectFilter ?? (params.get("project") ?? params.get("projectId") ?? "");
  const query = new URLSearchParams({ path });
  if (project && project !== "all") query.set("project", project);
  const draft = params.get("id");
  if (draft && page?.tab === "calculation") query.set("draft", draft);
  if (selection) {
    query.set("kind", selection.kind);
    query.set("id", selection.id);
  }
  const queryString = query.toString();
  const key = queryString;

  const enabled = !!page;
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let pending = false;
    async function load() {
      if (document.hidden || pending) return;
      pending = true;
      try {
        const response = await fetch(`/api/admin/finance-assistant?${queryString}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) {
          if (!controller.signal.aborted) setResult({ key, error: response.status === 404 ? "Finance context is unavailable for this page or selection." : "Could not load finance context." });
          return;
        }
        const data: FinanceAssistantContext = await response.json();
        if (!controller.signal.aborted) setResult({ key, data });
      } catch {
        if (!controller.signal.aborted) setResult({ key, error: "Could not load finance context. Retrying automatically." });
      } finally {
        pending = false;
      }
    }
    void load();
    const live = window.setInterval(load, LIVE_UPDATE_INTERVAL);
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", load);
    return () => {
      controller.abort();
      window.clearInterval(live);
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", load);
    };
  }, [enabled, key, queryString]);

  if (!page) return null;
  const current = result?.key === key ? result : undefined;
  const data = current?.data;
  const cents = parseInstallmentAmount(proposal);
  const difference = cents !== null && data?.availableBudget !== undefined ? (installmentMinorUnits(data.availableBudget) - cents) / 100 : null;
  const memberEstimate = cents !== null && data?.contributionRatio !== undefined ? Math.round(cents * data.contributionRatio) / 100 : null;

  return (
    <section aria-label={t("Finance mode")} className="space-y-3">
      <div className="border-border border-b pb-3">
        <h2 className="text-h4">{t(data?.title ?? "Current finance page")}{data?.projectName ? ` · ${data.projectName}` : ""}</h2>
      </div>
      {selection && <button type="button" className="text-accent text-sm underline" onClick={onClear}><AdminText>{"Clear row selection"}</AdminText></button>}
      {!current && <p role="status" className="text-fg-muted text-sm"><AdminText>{"Loading finance context…"}</AdminText></p>}
      {current?.error && <p role="alert" className="text-error text-sm">{t(current.error)}</p>}
      {data && (
        <div className="space-y-4">
          {data.facts.length > 0 && <dl className="divide-border divide-y text-sm">
            {data.facts.map((fact, index) => <div key={`${index}:${fact.label}`} className="py-2">
              <div className="flex justify-between gap-3"><dt>{t(fact.label)}</dt><dd className="text-right font-medium tabular-nums">{t(fact.value)}</dd></div>
              {fact.basis && <p className="text-fg-muted mt-1 text-xs">{t(fact.basis)}</p>}
            </div>)}
          </dl>}
          {data.notes?.map((note) => <p key={note} className="text-fg-muted text-sm">{t(note)}</p>)}
          {(data.availableBudget !== undefined || data.contributionRatio !== undefined) && (
            <div className="bg-surface space-y-2 rounded-lg p-3 text-sm">
              <label className="flex flex-col gap-1"><AdminText>{"Compare a proposed project amount (BDT)"}</AdminText>
                <input value={proposal} inputMode="decimal" className="border-border bg-surface-raised rounded-md border px-2 py-1.5"
                  onChange={(event) => setProposal(event.target.value)} />
              </label>
              {difference !== null && <p aria-live="polite" className={difference < 0 ? "text-error" : undefined}>
                {t(difference < 0 ? "Over budget by" : "Budget remaining would be")} {formatBDT(Math.abs(difference), 2)}
              </p>}
              {memberEstimate !== null && <p aria-live="polite"><AdminText>{"Estimated share at the saved contribution ratio: "}</AdminText>{formatBDT(memberEstimate, 2)}</p>}
              {proposal && cents === null && <p className="text-error"><AdminText>{"Enter a non-negative amount with up to two decimal places."}</AdminText></p>}
            </div>
          )}
          {!!data.links?.length && (
            reviewKey === key ? <div className="border-border space-y-2 rounded-lg border p-3 text-sm">
              <p><AdminText>{"Open the normal finance screen to review the details. Any record changes require submitting the form there."}</AdminText></p>
              <div className="flex flex-wrap gap-3">
                {data.links.map((link) => <Link key={link.href} href={link.href} onClick={onClose} className="text-accent underline">{t(link.label)}</Link>)}
                <button type="button" className="text-fg-muted" onClick={() => setReviewKey(undefined)}><AdminText>{"Cancel"}</AdminText></button>
              </div>
            </div> : <button type="button" className="text-accent text-sm font-medium" onClick={() => setReviewKey(key)}><AdminText>{"Review next steps"}</AdminText></button>
          )}
        </div>
      )}
    </section>
  );
}
