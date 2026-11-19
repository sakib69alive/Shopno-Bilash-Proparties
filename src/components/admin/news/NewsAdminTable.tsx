"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { useTransition } from "react";
import { Pencil, Star, Trash2 } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { IconButton } from "@/components/ui/IconButton";
import { buttonVariants } from "@/components/ui/Button";
import { deleteNewsArticle } from "@/features/news/actions";
import type { NewsArticle } from "@/content/news";
import { cn } from "@/lib/utils";

export interface NewsAdminTableProps {
  articles: NewsArticle[];
  canDelete: boolean;
}

export function NewsAdminTable({ articles, canDelete }: NewsAdminTableProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(article: NewsArticle) {
    if (!window.confirm(`Delete "${article.title}"? This can't be undone.`)) return;
    startTransition(() => {
      deleteNewsArticle(article.id);
    });
  }

  const columns: DataTableColumn<NewsArticle>[] = [
    {
      key: "title",
      header: "Title",
      render: (a) => (
        <span className="flex items-center gap-2">
          {a.featured && <Star aria-hidden className="text-accent size-3.5 shrink-0 fill-current" />}
          <span className="text-fg">{a.title}</span>
        </span>
      ),
    },
    { key: "category", header: "Category", render: (a) => a.category },
    { key: "date", header: "Date", render: (a) => a.date },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (a) => (
        <span className="flex items-center justify-end gap-1">
          <Link href={`/admin/content/news/${a.id}/edit`}>
            <IconButton icon={Pencil} label={`Edit ${a.title}`} size="sm" />
          </Link>
          {canDelete && (
            <IconButton
              icon={Trash2}
              label={`Delete ${a.title}`}
              size="sm"
              disabled={isPending}
              onClick={() => handleDelete(a)}
              className="hover:text-error"
            />
          )}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={articles}
      getRowId={(a) => a.id}
      emptyTitle="No articles yet."
      emptyDescription="Create the first News article to publish it on the public site."
      emptyAction={
        <Link href="/admin/content/news/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
          <AdminText>{"New Article"}</AdminText>
        </Link>
      }
    />
  );
}
