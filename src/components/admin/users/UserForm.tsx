"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ROLES, ROLE_LABELS, PORTAL_ROLES, type RoleName } from "@/config/roles";
import type { User } from "@/types/user";
import type { Project } from "@/types/project";
import type { UserFormState } from "@/features/users/actions";

export interface UserFormProps {
  action: (state: UserFormState, formData: FormData) => Promise<UserFormState>;
  user?: User;
  projects: Project[];
  submitLabel: string;
}

/** These two roles always see every project (`src/lib/projectScope.ts`) — assigning specific projects to them would be a no-op, so the control is hidden rather than shown-but-ignored. */
const SEES_ALL_PROJECTS: RoleName[] = ["super_admin", "managing_director"];
/** Portal (owner) accounts never browse the Admin's project-scoped screens — their access is governed by which owner record they're linked to, not `assignedProjectIds` — so this staff-only control is hidden for them too. */
const NO_PROJECT_ASSIGNMENT: RoleName[] = [...SEES_ALL_PROJECTS, ...PORTAL_ROLES];

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {label}
    </Button>
  );
}

const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "invited", label: "Invited" },
  { value: "suspended", label: "Suspended" },
  { value: "disabled", label: "Disabled" },
];

/** Password is required on create, optional on edit (leave blank to keep the current one) — the same account, either way, never a separate "reset password" flow. */
export function UserForm({ action, user, projects, submitLabel }: UserFormProps) {
  const [state, formAction] = useActionState(action, {});
  const [role, setRole] = useState<string>(user?.role ?? "");
  const showProjectAssignment = role !== "" && !NO_PROJECT_ASSIGNMENT.includes(role as RoleName);
  const assignedProjectIds = new Set(user?.assignedProjectIds ?? []);

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <Input label="Name" name="name" required defaultValue={user?.name} placeholder="Full name" />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Email" name="email" type="email" required defaultValue={user?.email} placeholder="you@example.com" />
        <Input label="Phone (optional)" name="phone" defaultValue={user?.phone} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Role"
          name="role"
          required
          options={ROLE_OPTIONS}
          defaultValue={user?.role}
          placeholder="Choose a role"
          onChange={(e) => setRole(e.target.value)}
        />
        <Select label="Status" name="status" required options={STATUS_OPTIONS} defaultValue={user?.status} placeholder="Choose a status" />
      </div>

      <Input
        label={user ? "New Password (optional)" : "Password"}
        name="password"
        type="password"
        required={!user}
        placeholder={user ? "Leave blank to keep the current password" : "At least 8 characters"}
      />

      {showProjectAssignment && (
        <div className="flex flex-col gap-2">
          <p className="text-label text-fg-muted">Assigned Projects</p>
          <p className="text-caption text-fg-subtle">
            Which projects this person can see. Leave empty and they will see nothing in Properties, Construction, Sales, Expenses, or Cost Allocations until assigned.
          </p>
          {projects.length === 0 ? (
            <p className="text-body-sm text-fg-subtle">No projects exist yet.</p>
          ) : (
            <div className="border-border bg-surface-raised flex flex-col gap-2 rounded-md border p-3">
              {projects.map((project) => (
                <label key={project.id} className="text-body-sm text-fg flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="assignedProjectIds"
                    value={project.id}
                    defaultChecked={assignedProjectIds.has(project.id)}
                    className="accent-accent size-4"
                  />
                  {project.name}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </PersistForm>
  );
}
