"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { useAdminLanguage } from "@/components/admin/AdminLanguage";
import { IconButton } from "@/components/ui/IconButton";
import { updateHomeFeaturedProjects } from "@/features/projectContent/actions";

type ProjectOption = { id: string; name: string; location: string };

export function HomeFeaturedProjectsEditor({ projects, savedIds, defaultIds, canEdit }: {
  projects: ProjectOption[];
  savedIds: string[] | null;
  defaultIds: string[];
  canEdit: boolean;
}) {
  const { locale } = useAdminLanguage();
  const bn = locale === "bn";
  const [isPending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const [ids, setOptimisticIds] = useOptimistic(savedIds, (_previous, next: string[] | null) => next);
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const selected = (ids ?? defaultIds).flatMap((id) => projectById.get(id) ?? []);
  const selectedIds = selected.map((project) => project.id);
  const available = projects.filter((project) => !selectedIds.includes(project.id));

  function update(next: string[] | null) {
    setFailed(false);
    startTransition(async () => {
      setOptimisticIds(next);
      try {
        setFailed(!(await updateHomeFeaturedProjects(next)));
      } catch {
        setFailed(true);
      }
    });
  }

  function move(index: number, offset: -1 | 1) {
    const next = [...selectedIds];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    update(next);
  }

  return (
    <section aria-labelledby="home-featured-heading" className="border-border bg-surface-raised mb-6 rounded-2xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="home-featured-heading" className="text-lg font-semibold">{bn ? "হোমপেজের নির্বাচিত প্রজেক্ট" : "Homepage featured projects"}</h2>
          <p className="text-fg-muted mt-1 max-w-prose text-sm">
            {bn ? "মোবাইল হোমপেজে প্রজেক্টগুলো এই ক্রমে দেখা যাবে। পরিবর্তন নিজে থেকেই সংরক্ষিত হয়।" : "Projects appear in this order on the mobile homepage. Changes save automatically."}
          </p>
        </div>
        <Link href="/#featured-projects" target="_blank" rel="noreferrer" className="text-accent inline-flex min-h-9 items-center rounded-full px-3 text-sm font-medium underline underline-offset-4">
          {bn ? "হোমপেজ দেখুন" : "View homepage"}
        </Link>
      </div>

      {selected.length > 0 ? (
        <ol className="border-border divide-border mt-4 divide-y overflow-hidden rounded-xl border">
          {selected.map((project, index) => (
            <li key={project.id} className="flex min-h-14 items-center gap-3 px-3 py-2">
              <span aria-hidden className="bg-surface text-fg-muted grid size-7 shrink-0 place-items-center rounded-full text-xs tabular-nums">{(index + 1).toLocaleString(bn ? "bn" : "en")}</span>
              <div className="min-w-0 flex-1">
                <p className="text-fg text-sm font-medium">{project.name}</p>
                <p className="text-fg-muted text-xs">{project.location}</p>
              </div>
              {canEdit && (
                <div className="flex shrink-0 items-center gap-1">
                  <IconButton icon={ArrowUp} size="sm" title={bn ? "ওপরে নিন" : "Move up"} disabled={isPending || index === 0} onClick={() => move(index, -1)} label={bn ? `${project.name} ওপরে নিন` : `Move ${project.name} up`} />
                  <IconButton icon={ArrowDown} size="sm" title={bn ? "নিচে নিন" : "Move down"} disabled={isPending || index === selected.length - 1} onClick={() => move(index, 1)} label={bn ? `${project.name} নিচে নিন` : `Move ${project.name} down`} />
                  <IconButton icon={X} size="sm" title={bn ? "বাদ দিন" : "Remove"} disabled={isPending} onClick={() => update(selectedIds.filter((id) => id !== project.id))} label={bn ? `${project.name} বাদ দিন` : `Remove ${project.name} from homepage`} />
                </div>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-fg-muted mt-4 text-sm">{bn ? "তালিকা খালি থাকলে হোমপেজে এই অংশটি দেখা যাবে না।" : "An empty list hides this section on the homepage."}</p>
      )}

      {canEdit && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <select
            aria-label={bn ? "হোমপেজে প্রজেক্ট যোগ করুন" : "Add project to homepage"}
            value=""
            disabled={isPending || available.length === 0}
            onChange={(event) => update([...selectedIds, event.currentTarget.value])}
            className="border-border bg-bg text-fg focus-visible:outline-accent h-10 max-w-full rounded-lg border px-3 text-sm disabled:opacity-60"
          >
            <option value="" disabled>{bn ? "প্রজেক্ট যোগ করুন" : "Add a project"}</option>
            {available.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          {ids !== null && (
            <button type="button" disabled={isPending} onClick={() => update(null)} className="text-accent min-h-10 text-sm underline underline-offset-4 disabled:opacity-60">
              {bn ? "ডিফল্ট ক্রম ফিরিয়ে আনুন" : "Restore default order"}
            </button>
          )}
          <span role="status" className="text-fg-muted text-sm">
            {isPending ? (bn ? "সংরক্ষণ হচ্ছে…" : "Saving…") : ids === null ? (bn ? "ডিফল্ট ক্রম" : "Default order") : (bn ? "নিজস্ব ক্রম" : "Custom order")}
          </span>
        </div>
      )}
      {failed && <p role="alert" className="text-error mt-2 text-sm">{bn ? "পরিবর্তন সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।" : "Could not save the change. Please try again."}</p>}
    </section>
  );
}
