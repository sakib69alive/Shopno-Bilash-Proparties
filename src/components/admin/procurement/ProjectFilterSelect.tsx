"use client";

import { useUiLanguage } from "@/components/ui/UiLanguage";
import { AdminText } from "@/components/admin/AdminLanguage";
import { useRouter } from "next/navigation";
import type { Project } from "@/types/project";

export function ProjectFilterSelect({ projects, value, basePath }: { projects: Project[]; value?: string; basePath: string }) {
  const { t: adminCopy } = useUiLanguage();
  const router = useRouter();

  return (
    <select
      value={value ?? ""}
      onChange={(e) => router.push(`${basePath}?projectId=${e.target.value}`)}
      aria-label={adminCopy("Filter by project")}
      className="text-body-sm h-10 rounded-md border border-border-strong bg-surface-raised px-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
    >
      {!value && <option value=""><AdminText>{"Choose a project"}</AdminText></option>}
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
