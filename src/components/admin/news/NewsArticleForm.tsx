"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { AdminImageField } from "@/components/admin/settings/AdminImageField";
import { ProjectGalleryField } from "@/components/admin/projectContent/ProjectGalleryField";
import { NEWS_CATEGORIES, type NewsArticle } from "@/content/news";
import type { NewsFormState } from "@/features/news/actions";
import type { Project } from "@/content/projects";

export interface NewsArticleFormProps {
  action: (state: NewsFormState, formData: FormData) => Promise<NewsFormState>;
  article?: NewsArticle;
  projects: Project[];
  submitLabel: string;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {label}
    </Button>
  );
}

const CATEGORY_OPTIONS = NEWS_CATEGORIES.map((c) => ({ value: c, label: c }));

/** Shared by the create and edit admin pages — `action` is the only thing that differs between them (see each page for how it's bound). */
export function NewsArticleForm({ action, article, projects, submitLabel }: NewsArticleFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <Input label="Title" name="title" required defaultValue={article?.title} placeholder="Article title" />

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Category"
          name="category"
          required
          options={CATEGORY_OPTIONS}
          defaultValue={article?.category}
          placeholder="Choose a category"
        />
        <Input
          label="Date"
          name="date"
          required
          defaultValue={article?.date}
          placeholder="e.g. September 2026"
          helperText="Displayed as-is, e.g. a month/year or a full date."
        />
      </div>

      <Textarea
        label="Excerpt"
        name="excerpt"
        required
        rows={2}
        defaultValue={article?.excerpt}
        placeholder="One or two sentences shown in News listings."
      />

      <Textarea
        label="Content"
        name="content"
        required
        rows={8}
        defaultValue={article?.content.join("\n")}
        placeholder="One paragraph per line."
        helperText="Each line becomes one paragraph on the article page."
      />

      <fieldset className="border-border flex flex-col gap-5 rounded-md border p-4">
        <legend className="text-label px-1.5">Photos</legend>
        <AdminImageField
          label={article ? "Replace cover photo (optional)" : "Cover photo"}
          name="coverImage"
          currentSrc={article?.coverImage.src}
          helperText="Shown at the top of the article and on the News list. JPG, PNG or WEBP."
        />
        <Input
          label="Cover image alt text"
          name="coverImageAlt"
          defaultValue={article?.coverImage.alt}
          placeholder="Describes the cover image for screen readers"
        />
        <ProjectGalleryField images={article?.images ?? []} />
      </fieldset>

      <Select
        label="Related project (optional)"
        name="projectSlug"
        defaultValue={article?.projectSlug ?? ""}
        options={[{ value: "", label: "None" }, ...projects.map((p) => ({ value: p.slug, label: p.name }))]}
      />

      <Switch
        name="featured"
        label="Featured"
        description="Shown as the lead story on the public News page."
        defaultChecked={article?.featured}
      />

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
