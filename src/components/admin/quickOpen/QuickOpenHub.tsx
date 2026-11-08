"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { hasPermission } from "@/lib/permissions";
import { CLIENT_PAGE_SECTIONS, NEED_LABELS, PUBLIC_PAGE_SECTIONS, type QuickItem } from "@/config/quickOpen";
import { MONEY_PAGE_SECTIONS } from "@/config/quickOpenMoney";
import { QUICK_GUIDES } from "@/config/quickOpenGuides";
import type { RoleName } from "@/config/roles";
import { cn } from "@/lib/utils";
import { CustomerPicker, type PickRecipient } from "@/components/admin/statements/CustomerPicker";

export interface QuickOption {
  value: string;
  label: string;
  /** Only for clients: which kind of person this is. */
  kind?: "customer" | "shareholder" | "landowner";
  /** Public projects only: the web address name some screens filter by. */
  slug?: string;
  /** Customers only: the projects they have a flat in (lets a multi-client button pick everyone of one project). */
  projectIds?: string[];
}

export interface QuickOpenOptions {
  webProject: QuickOption[];
  webProperty: QuickOption[];
  project: QuickOption[];
  client: QuickOption[];
  unit?: QuickOption[];
  sale?: QuickOption[];
}

export interface QuickOpenHubProps {
  board: "public" | "client" | "money";
  role: RoleName;
  options: QuickOpenOptions;
  /** Client board: per project id, the flats and customers it can jump straight to (values `unit:ID` / `customer:ID`). */
  jump?: Record<string, QuickOption[]>;
}

const CLIENT_PATHS = { customer: "customers", shareholder: "shareholders", landowner: "landowners" } as const;
const KIND_LABELS = { customer: "Customer", shareholder: "Shareholder", landowner: "Landowner" } as const;

function buildHref(item: QuickItem, option: QuickOption | undefined): string {
  let href = item.href;
  if (item.need !== "none" && option) {
    const id = item.need === "client" ? option.value.split(":")[1] : option.value;
    href = href.replaceAll("{id}", encodeURIComponent(id)).replaceAll("{slug}", encodeURIComponent(option.slug ?? ""));
    if (option.kind) {
      href = href.replaceAll("{path}", CLIENT_PATHS[option.kind]).replaceAll("{ownerType}", option.kind);
    }
  }
  return href;
}

/** The record a project-level button can jump to instead of the project tab: one flat, or one customer of the project. */
function jumpHref(value: string): string {
  const [kind, id] = value.split(":");
  return kind === "unit" ? `/admin/properties/${encodeURIComponent(id)}` : `/admin/customers/${encodeURIComponent(id)}`;
}

/**
 * The "quick open" board used by the Public page and Client page entries
 * in the sidebar. Every button is one thing the admin panel can change.
 * Pressing one opens a panel with a plain explanation (what it does, how to
 * do it) on the right and, on the left, a picker if it needs a project /
 * property / client; Go then jumps straight to the right screen (and, for
 * forms, the right section of it). Project buttons on the client board also
 * offer an optional "go straight to this flat / customer" shortcut.
 */
export function QuickOpenHub({ board, role, options, jump }: QuickOpenHubProps) {
  const sections = board === "public" ? PUBLIC_PAGE_SECTIONS : board === "money" ? MONEY_PAGE_SECTIONS : CLIENT_PAGE_SECTIONS;
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  const visibleSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) =>
              (!item.permission || hasPermission(role, item.permission)) &&
              (!q || item.label.toLowerCase().includes(q) || item.hint.toLowerCase().includes(q) || section.title.toLowerCase().includes(q)),
          ),
        }))
        .filter((section) => section.items.length > 0),
    [sections, role, q],
  );

  function pick(item: QuickItem) {
    if (selectedId === item.id) {
      setSelectedId(null);
      return;
    }
    setSelectedId(item.id);
    // Wait a tick so the panel exists before scrolling to it.
    setTimeout(() => panelRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 50);
  }

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6">
      <div className="relative max-w-md">
        <Search aria-hidden className="text-fg-subtle pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a button…"
          aria-label="Search a button"
          className="bg-surface text-body-sm text-fg placeholder:text-fg-subtle h-11 w-full rounded-full border border-transparent pr-4 pl-10 outline-none focus:border-accent"
        />
      </div>

      {visibleSections.length === 0 && <p className="text-body-sm text-fg-muted">Nothing matches “{query}”.</p>}

      {visibleSections.map((section) => {
        const selected = section.items.find((i) => i.id === selectedId);
        return (
          <section key={section.title} aria-labelledby={`qs-${section.title}`} className="flex flex-col gap-3">
            <div>
              <h2 id={`qs-${section.title}`} className="text-h5 text-fg">
                {section.title}
              </h2>
              <p className="text-body-sm text-fg-muted mt-0.5 max-w-2xl">{section.blurb}</p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = item.id === selectedId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-expanded={active}
                    onClick={() => pick(item)}
                    className={cn(
                      "border-border bg-surface-raised hover:border-accent flex min-h-[3.75rem] w-full items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                      active && "border-accent bg-accent-soft",
                    )}
                  >
                    <span className="bg-accent-soft text-accent-strong flex size-9 shrink-0 items-center justify-center rounded-md">
                      <Icon aria-hidden className="size-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="text-body-sm text-fg block font-medium">{item.label}</span>
                      <span className="text-caption text-fg-subtle block">{item.hint}</span>
                    </span>
                    <ArrowRight aria-hidden className="text-fg-subtle size-4 shrink-0" />
                  </button>
                );
              })}
            </div>

            {selected && (
              <Panel
                key={selected.id}
                item={selected}
                options={selected.need === "none" ? [] : (options[selected.need] ?? [])}
                projects={options.project}
                jump={jump}
                panelRef={panelRef}
                onGo={(href) => router.push(href)}
              />
            )}
          </section>
        );
      })}
    </div>
  );
}

function Panel({
  item,
  options,
  projects,
  jump,
  panelRef,
  onGo,
}: {
  item: QuickItem;
  options: QuickOption[];
  projects: QuickOption[];
  jump?: Record<string, QuickOption[]>;
  panelRef: React.RefObject<HTMLDivElement | null>;
  onGo: (href: string) => void;
}) {
  const [choice, setChoice] = useState("");
  const [jumpChoice, setJumpChoice] = useState("");
  const guide = QUICK_GUIDES[item.id];
  const needs = item.need !== "none";
  const copy = item.need === "none" ? null : NEED_LABELS[item.need];
  const option = options.find((o) => o.value === choice);
  const blocked = item.customerOnly && option?.kind && option.kind !== "customer";
  const jumpOptions = item.id.startsWith("cp-") && choice ? (jump?.[choice] ?? []) : [];
  // A multi-client button: tick several customers (by project if you like) instead of choosing one.
  const multi = !!item.multi && item.need === "client";
  const [multiPicked, setMultiPicked] = useState<Set<string>>(new Set());
  const customers: PickRecipient[] = options.filter((o) => o.kind === "customer").map((o) => ({ id: o.value.split(":")[1], name: o.label, projectIds: o.projectIds }));
  const ready = multi ? multiPicked.size > 0 : !needs || (!!option && !blocked);

  function go() {
    if (multi) return onGo(item.href.replaceAll("{ids}", encodeURIComponent(Array.from(multiPicked).join(","))));
    if (jumpChoice && jumpOptions.some((j) => j.value === jumpChoice)) return onGo(jumpHref(jumpChoice));
    onGo(buildHref(item, option));
  }

  return (
    <div ref={panelRef} className="border-accent bg-surface-raised grid gap-5 rounded-lg border p-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <div className="flex flex-col gap-3">
        <p className="text-body-sm text-fg font-semibold">{item.label}</p>
        {multi && (
          <>
            <p className="text-caption text-fg-subtle -mb-1">Tick one client or many. Choose a project to see only its customers, then Select all.</p>
            <CustomerPicker
              recipients={customers}
              projects={projects.map((p) => ({ value: p.value, label: p.label }))}
              picked={multiPicked}
              onPicked={setMultiPicked}
              showPhone={false}
            />
          </>
        )}
        {!multi &&
          needs &&
          copy &&
          (options.length === 0 ? (
            <p className="text-body-sm text-fg-muted">There is nothing to choose from yet.</p>
          ) : (
            <Select
              label={copy.question}
              value={choice}
              onChange={(e) => {
                setChoice(e.target.value);
                setJumpChoice("");
              }}
              placeholder={copy.placeholder}
              options={options.map((o) => ({ value: o.value, label: o.kind ? `${o.label} — ${KIND_LABELS[o.kind]}` : o.label }))}
            />
          ))}
        {blocked && <p className="text-caption text-error">This only works for customers. Pick a customer.</p>}
        {jumpOptions.length > 0 && (
          <Select
            label="Shortcut (optional): go straight to a flat or customer of this project"
            value={jumpChoice}
            onChange={(e) => setJumpChoice(e.target.value)}
            options={[{ value: "", label: "No shortcut — just open the tab" }, ...jumpOptions.map((j) => ({ value: j.value, label: j.label }))]}
          />
        )}
        <div>
          <Button type="button" disabled={!ready} onClick={go}>
            {multi && multiPicked.size > 0 ? `Go with ${multiPicked.size} client${multiPicked.size === 1 ? "" : "s"}` : needs ? "Go" : "Open"}
            <ArrowRight aria-hidden className="size-4" />
          </Button>
        </div>
      </div>

      {guide && (
        <div className="bg-surface flex flex-col gap-3 rounded-md p-4">
          <div>
            <p className="text-label text-fg-subtle uppercase">What this does</p>
            <p className="text-body-sm text-fg mt-1">{guide.what}</p>
          </div>
          <div>
            <p className="text-label text-fg-subtle uppercase">How to do it</p>
            <ol className="text-body-sm text-fg mt-1 list-decimal space-y-1 pl-5">
              {guide.how.map((step) => (
                <li key={step}>{step}</li>
              ))}
              {jumpOptions.length > 0 && <li>Optional: pick a flat or customer in the shortcut box to skip straight to their page.</li>}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
