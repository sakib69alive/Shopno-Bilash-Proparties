import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CalculationEditor } from "@/components/admin/finance/CalculationEditor";
import { getFinanceCalculation } from "@/features/finance/calculations";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import type { CalculationInput } from "@/lib/financeCalculation";

export default async function FinanceCalculations({ searchParams }: { searchParams: Promise<{ id?: string; saved?: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "finance.view")) notFound();
  const { id, saved } = await searchParams;
  const [selected, recent] = await Promise.all([
    id ? getFinanceCalculation(user.id, id) : null,
    prisma.financeCalculation.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, data: true },
    }),
  ]);
  if (id && !selected) notFound();
  return (
    <>
      <AdminPageHeader title={<AdminText>{"Calculation workspace"}</AdminText>} description={<AdminText>{"Try out costs or split an amount. Saving here creates a personal draft and leaves the finance records unchanged."}</AdminText>}
        breadcrumbs={[{ label: "Money page", href: "/admin/money-page" }, { label: "Calculations", localize: true }]} />
      <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0">
          {saved === "1" && selected && <p role="status" className="text-success mb-3 text-sm"><AdminText>{"Draft saved."}</AdminText></p>}
          <CalculationEditor key={selected ? `${selected.id}:${selected.revision}` : "new"} initial={selected?.data}
            id={selected?.id} revision={selected?.revision ?? 0} canPost={hasPermission(user.role, "finance.manage")} />
        </div>
        <aside className="border-border bg-surface-raised h-fit rounded-xl border p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-h4"><AdminText>{"Saved drafts"}</AdminText></h2>
            <Link href="/admin/finance/calculations" className="text-accent text-sm font-medium"><AdminText>{"New draft"}</AdminText></Link>
          </div>
          {recent.length === 0 && <p className="text-fg-muted mt-3 text-sm"><AdminText>{"No saved calculations yet."}</AdminText></p>}
          <ul className="mt-2 space-y-1">
            {recent.map((row) => (
              <li key={row.id}>
                <Link aria-current={row.id === id ? "page" : undefined} href={`/admin/finance/calculations?id=${encodeURIComponent(row.id)}`}
                  className="hover:bg-surface aria-[current=page]:bg-accent-soft block break-words rounded-md px-2 py-2 text-sm">
                  {(row.data as unknown as CalculationInput).name}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
