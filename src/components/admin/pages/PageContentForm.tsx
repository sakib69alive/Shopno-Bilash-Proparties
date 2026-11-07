"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { PageContent } from "@/content/legal";
import type { PageContentFormState } from "@/features/pages/actions";

export interface PageContentFormProps {
  action: (state: PageContentFormState, formData: FormData) => Promise<PageContentFormState>;
  page: PageContent;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Save Changes
    </Button>
  );
}

/**
 * Editing here means changing wording — the section *structure* (how many
 * sections, their order) is fixed by the page's existing content, not
 * addable/removable through this form. See `features/pages/repository.ts`
 * for why the scope stops there.
 */
export function PageContentForm({ action, page }: PageContentFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-2xl flex-col gap-6">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <input type="hidden" name="sectionCount" value={page.sections.length} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Title" name="title" required defaultValue={page.title} />
        <Input label="Last Updated" name="lastUpdated" required defaultValue={page.lastUpdated} placeholder="e.g. September 2026" />
      </div>

      <Input label="Eyebrow" name="eyebrow" defaultValue={page.eyebrow} placeholder="e.g. Legal" />

      <Textarea label="Intro" name="intro" required rows={3} defaultValue={page.intro} />

      <div className="flex flex-col gap-5 border-t border-border pt-5">
        <h2 className="text-label text-fg-subtle uppercase">Sections</h2>
        {page.sections.map((section, i) => (
          <div key={i} className="border-border bg-surface-raised flex flex-col gap-3 rounded-lg border p-4">
            <Input label={`Section ${i + 1} Heading`} name={`section-${i}-heading`} required defaultValue={section.heading} />
            <Textarea
              label="Body"
              name={`section-${i}-body`}
              required
              rows={4}
              defaultValue={section.body.join("\n")}
              helperText="One paragraph per line."
            />
            <Textarea
              label="Bulleted List (optional)"
              name={`section-${i}-list`}
              rows={3}
              defaultValue={section.list?.join("\n")}
              helperText="One item per line. Leave empty for no list."
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton />
      </div>
    </PersistForm>
  );
}
