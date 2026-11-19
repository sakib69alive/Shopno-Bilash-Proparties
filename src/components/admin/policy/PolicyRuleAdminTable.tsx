"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { IconButton } from "@/components/ui/IconButton";
import { buttonVariants } from "@/components/ui/Button";
import { deletePolicyRule } from "@/features/policyRules/actions";
import type { PolicyRule } from "@/types/policyRule";
import { cn } from "@/lib/utils";

export interface PolicyRuleAdminTableProps {
  rules: PolicyRule[];
  canDelete: boolean;
}

export function PolicyRuleAdminTable({ rules, canDelete }: PolicyRuleAdminTableProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(rule: PolicyRule, index: number) {
    if (!window.confirm(`Delete Rule ${index + 1}? This can't be undone.`)) return;
    startTransition(() => {
      deletePolicyRule(rule.id);
    });
  }

  const columns: DataTableColumn<PolicyRule>[] = [
    {
      key: "order",
      header: "#",
      render: (r) => <span className="text-numeric text-fg-subtle">{rules.indexOf(r) + 1}</span>,
    },
    {
      key: "text",
      header: "Rule",
      render: (r) => (
        <div>
          <p className="text-fg font-medium">{r.title}</p>
          <p className="text-fg-subtle line-clamp-2">{r.text}</p>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => {
        const index = rules.indexOf(r);
        return (
          <span className="flex items-center justify-end gap-1">
            <Link href={`/admin/content/policy/${r.id}/edit`}>
              <IconButton icon={Pencil} label={`Edit Rule ${index + 1}`} size="sm" />
            </Link>
            {canDelete && (
              <IconButton
                icon={Trash2}
                label={`Delete Rule ${index + 1}`}
                size="sm"
                disabled={isPending}
                onClick={() => handleDelete(r, index)}
                className="hover:text-error"
              />
            )}
          </span>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rules}
      getRowId={(r) => r.id}
      emptyTitle="No policy rules yet."
      emptyDescription="Add your first rule to publish the public Company Policy page — it stays hidden from visitors until then."
      emptyAction={
        <Link href="/admin/content/policy/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
          <AdminText>{"New Rule"}</AdminText>
        </Link>
      }
    />
  );
}
