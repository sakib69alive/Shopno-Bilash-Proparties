"use client";

import { AdminText, useAdminLanguage } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { getMoneyOverview } from "@/features/finance/moneyOverview";
import { formatBDT, formatDate } from "@/lib/format";

type Overview = Awaited<ReturnType<typeof getMoneyOverview>>;
const LIVE_UPDATE_INTERVAL = 5000;

export function MoneyOverview({ data: initialData, projects, projectId: initialProjectId }: {
  data: Overview;
  projects: { id: string; name: string }[];
  projectId?: string;
}) {
  const { t } = useAdminLanguage();
  const requestedProject = useSearchParams().get("project");
  const projectId = projects.find((project) => project.id === requestedProject)?.id;
  const [snapshot, setSnapshot] = useState<{ projectId?: string; data: Overview }>();
  const [failure, setFailure] = useState<{ projectId?: string }>();
  const data = snapshot && snapshot.projectId === projectId ? snapshot.data : projectId === initialProjectId ? initialData : undefined;
  const failed = failure && failure.projectId === projectId;

  useEffect(() => {
    const controller = new AbortController();
    const query = projectId ? `?project=${encodeURIComponent(projectId)}` : "";
    let pending = false;

    async function update() {
      if (document.hidden || pending) return;
      pending = true;
      try {
        const response = await fetch(`/api/admin/money-overview${query}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Could not load the finance overview");
        const overview: Overview = await response.json();
        if (!controller.signal.aborted) {
          setSnapshot({ projectId, data: overview });
          setFailure(undefined);
        }
      } catch {
        if (!controller.signal.aborted) setFailure({ projectId });
      } finally {
        pending = false;
      }
    }

    void update();
    const timer = window.setInterval(update, LIVE_UPDATE_INTERVAL);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [projectId]);

  return (
    <section aria-label={t("Finance overview")} className="space-y-5 px-4 pt-5 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-h3"><AdminText>{"Finance overview"}</AdminText></h2>
          <p className="text-body-sm text-fg-muted mt-1"><AdminText>{"Review the budget, collections and bills before recording your next transaction."}</AdminText></p>
        </div>
        <label className="text-body-sm flex flex-col gap-1">
          <AdminText>{"Project"}</AdminText>
          <select value={projectId ?? ""} className="border-border bg-surface-raised min-h-9 rounded-lg border px-2"
            onChange={(event) => {
              const url = new URL(window.location.href);
              if (event.target.value) url.searchParams.set("project", event.target.value);
              else url.searchParams.delete("project");
              window.history.replaceState(null, "", url);
            }}>
            <option value=""><AdminText>{"All accessible projects"}</AdminText></option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </label>
      </div>
      <p role="status" className={failed || !data ? "text-body-sm text-fg-muted" : "sr-only"}>
        {t(failed ? "Could not update the finance overview. Retrying automatically." : !data ? "Loading project totals…" : "")}
      </p>
      {data && <MoneyOverviewTotals data={data} projects={projects} />}
    </section>
  );
}

function MoneyOverviewTotals({ data, projects }: { data: Overview; projects: { id: string; name: string }[] }) {
  const { t } = useAdminLanguage();
  const remaining = data.budget === null ? null : data.budget - data.spent;
  const names = new Map(projects.map((project) => [project.id, project.name]));
  const cards = [
    ["Planned budget", data.budget, "Sum of saved budget lines."],
    ["Costs so far", data.spent, "Materials orders, verified expenses and contractor payments, with cost adjustments."],
    ["Budget remaining", remaining, "Planned budget minus costs so far. This is separate from available cash."],
    ["Money received", data.received, "Recorded customer payments and owner contributions."],
    ["Still to collect", data.outstanding, "Remaining flat sale balances and owner contributions, before fines."],
    ["Known supplier bills to pay", data.supplierPayable, "Unpaid materials purchases. Partial balances need manual review."],
  ] as const;
  const showAmount = (value: number | null) => value === null ? t("No budget set") : formatBDT(value, 2);
  const day = (date: string) => formatDate(new Date(`${date.slice(0, 10)}T12:00:00`));

  return (
    <>
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value, caption]) => (
          <div key={label} className="border-border bg-surface-raised min-w-0 rounded-xl border p-4">
            <dt className="text-body-sm text-fg-muted">{t(label)}</dt>
            <dd className="text-h3 mt-1 break-words tabular-nums">{showAmount(value)}</dd>
            <dd className="text-caption text-fg-muted mt-2">{t(caption)}</dd>
          </div>
        ))}
      </dl>
      <p className="text-body-sm text-fg-muted"><AdminText>{"Available cash needs a reconciled cash or bank balance. This dashboard shows recorded receipts and project costs."}</AdminText></p>
      {(data.overdueCount > 0 || data.partialPurchases > 0 || (remaining !== null && remaining < 0)) && (
        <ul className="border-border bg-surface-raised space-y-1 rounded-xl border p-4 text-sm">
          {remaining !== null && remaining < 0 && <li className="text-error"><AdminText values={{ amount: formatBDT(-remaining, 2) }}>{"Costs exceed the saved budget by {amount}."}</AdminText></li>}
          {!!data.overdueCount && <li><AdminText values={{ count: data.overdueCount }}>{data.overdueCount === 1 ? "{count} collection schedule entry is overdue." : "{count} collection schedule entries are overdue."}</AdminText></li>}
          {!!data.partialPurchases && <li><AdminText values={{ count: data.partialPurchases }}>{data.partialPurchases === 1 ? "{count} partially paid supplier purchase needs balance review." : "{count} partially paid supplier purchases need balance review."}</AdminText></li>}
        </ul>
      )}
      <div className="grid gap-3 xl:grid-cols-3">
        <div className="border-border bg-surface-raised rounded-xl border p-4">
          <h3 className="text-h4"><AdminText>{"Largest cost categories"}</AdminText></h3>
          {data.categories.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {data.categories.map(([label, value]) => <li className="flex justify-between gap-2" key={label}><span>{label}</span><span className="shrink-0 tabular-nums">{formatBDT(value, 2)}</span></li>)}
            </ul>
          ) : <p className="text-body-sm text-fg-muted mt-2"><AdminText>{"No project costs recorded."}</AdminText></p>}
        </div>
        <div className="border-border bg-surface-raised rounded-xl border p-4">
          <h3 className="text-h4"><AdminText>{"Upcoming and overdue collections"}</AdminText></h3>
          <p className="text-caption text-fg-muted mt-1"><AdminText>{"Overdue and due in the next 30 days. Installment balances follow payments assigned to the schedule."}</AdminText></p>
          {data.dueSoon.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {data.dueSoon.map((row) => <li className="flex justify-between gap-2" key={row.id}>
                <span>{row.label}<span className={`block text-xs ${row.date.slice(0, 10) < data.today ? "text-error" : "text-fg-muted"}`}>{names.get(row.projectId ?? "") ?? t("Project")} · {day(row.date)}</span></span>
                <span className="shrink-0 tabular-nums">{formatBDT(row.amount, 2)}</span>
              </li>)}
            </ul>
          ) : <p className="text-body-sm text-fg-muted mt-2"><AdminText>{"Nothing due in this period."}</AdminText></p>}
          <Link href="/admin/sales/installments" className="text-accent mt-3 inline-block text-sm"><AdminText>{"View flat sale installments"}</AdminText></Link>
        </div>
        <div className="border-border bg-surface-raised rounded-xl border p-4">
          <h3 className="text-h4"><AdminText>{"Recent costs and payments"}</AdminText></h3>
          {data.recent.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {data.recent.map((row) => <li className="flex justify-between gap-2" key={`${row.direction}:${row.id}`}>
                <span>{row.label}<span className="text-fg-muted block text-xs">{names.get(row.projectId ?? "") ?? t("Unassigned")} · {day(row.date)}</span></span>
                <span className="shrink-0 tabular-nums">{t(row.direction === "received" ? "Received" : "Cost")} · {formatBDT(row.amount, 2)}</span>
              </li>)}
            </ul>
          ) : <p className="text-body-sm text-fg-muted mt-2"><AdminText>{"No activity recorded."}</AdminText></p>}
        </div>
      </div>
    </>
  );
}
