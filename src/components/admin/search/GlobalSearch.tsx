"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Building2,
  Plus,
  UserPlus,
  ReceiptText,
  PiggyBank,
  ShoppingCart,
  CalendarClock,
  MessageSquareText,
  FileUp,
  Bell,
} from "lucide-react";
import { runAdminSearch } from "@/features/search/actions";
import { hasPermission } from "@/lib/permissions";
import type { SearchResult } from "@/features/search";
import type { User } from "@/types/user";

export interface GlobalSearchProps {
  user: User;
}

export const QUICK_ACTIONS: { label: string; href: string; icon: typeof Plus; permission?: Parameters<typeof hasPermission>[1] }[] = [
  { label: "Add Project", href: "/admin/projects/new", icon: Building2, permission: "project.create" },
  { label: "Add Unit", href: "/admin/properties/new", icon: Plus, permission: "unit.manage" },
  { label: "Add Owner", href: "/admin/customers/new", icon: UserPlus, permission: "customer.create" },
  { label: "Record Payment", href: "/admin/sales/payments/new", icon: ReceiptText, permission: "finance.manage" },
  { label: "Add Expense", href: "/admin/finance/expenses/new", icon: PiggyBank, permission: "finance.manage" },
  { label: "Add Material Purchase", href: "/admin/procurement/purchases/new", icon: ShoppingCart, permission: "procurement.manage" },
  { label: "Create Booking", href: "/admin/sales/bookings/new", icon: CalendarClock, permission: "sales.create" },
  { label: "Add Lead", href: "/admin/leads/new", icon: MessageSquareText, permission: "lead.manage" },
  { label: "Upload Document", href: "/admin/documents/new", icon: FileUp, permission: "documents.upload" },
  { label: "Create Reminder", href: "/admin/reminders/new", icon: Bell, permission: "reminders.manage" },
];

/** Prompt 10 — the one universal search + quick-actions entry point, replacing the disabled header search input. */
export function GlobalSearch({ user }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const requestIdRef = useRef(0);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    requestIdRef.current += 1;
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setResults([]);
    const requestId = requestIdRef.current;
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const found = await runAdminSearch(value);
        if (requestIdRef.current === requestId) setResults(found);
      });
    }, 250);
  }

  function handleSelect(href: string) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(href);
  }

  const quickActions = QUICK_ACTIONS.filter((a) => !a.permission || hasPermission(user.role, a.permission));
  const showQuickActions = query.trim().length === 0 && quickActions.length > 0;

  return (
    <div ref={containerRef} className="relative hidden max-w-sm flex-1 sm:block">
      <Search aria-hidden className="text-fg-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <input
        type="search"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Search projects, units, owners, leads…"
        aria-label="Search"
        className="text-body-sm h-10 w-full rounded-md border border-border-strong bg-surface pl-9 pr-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
      />

      {open && (query.trim().length >= 2 || showQuickActions) && (
        <div className="border-border bg-surface-raised absolute top-full left-0 z-40 mt-2 w-[28rem] max-w-[90vw] overflow-hidden rounded-lg border shadow-lg">
          {query.trim().length >= 2 ? (
            <div className="max-h-96 overflow-y-auto py-1.5">
              {isPending && results.length === 0 ? (
                <p className="text-body-sm text-fg-subtle px-4 py-3">Searching…</p>
              ) : results.length === 0 ? (
                <p className="text-body-sm text-fg-subtle px-4 py-3">No matches for &ldquo;{query}&rdquo;.</p>
              ) : (
                results.map((r) => (
                  <button
                    key={`${r.type}:${r.id}`}
                    type="button"
                    onClick={() => handleSelect(r.href)}
                    className="hover:bg-surface flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-body-sm text-fg truncate font-medium">{r.title}</p>
                      <p className="text-caption text-fg-subtle truncate">
                        {r.subtitle}
                        {r.projectName ? ` · ${r.projectName}` : ""}
                      </p>
                    </div>
                    <span className="text-caption text-fg-subtle bg-surface shrink-0 rounded-full px-2 py-0.5">{r.type}</span>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="py-1.5">
              <p className="text-label text-fg-subtle px-4 py-1.5 uppercase">Quick Actions</p>
              {quickActions.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  onClick={() => setOpen(false)}
                  className="hover:bg-surface flex items-center gap-3 px-4 py-2 transition-colors"
                >
                  <a.icon aria-hidden className="text-fg-subtle size-4 shrink-0" />
                  <span className="text-body-sm text-fg">{a.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
