"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { AdminImageField } from "@/components/admin/settings/AdminImageField";
import type { FounderProfile } from "@/types/founderProfile";
import type { FounderProfileFormState } from "@/features/founderProfile/actions";
import { FOUNDER_GALLERY_SLOTS } from "@/features/founderProfile/constants";

export interface FounderProfileFormProps {
  action: (state: FounderProfileFormState, formData: FormData) => Promise<FounderProfileFormState>;
  profile: FounderProfile;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Save Changes
    </Button>
  );
}

export function FounderProfileForm({ action, profile }: FounderProfileFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <h2 className="text-label text-fg-subtle uppercase">Basic Information</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Name" name="name" required defaultValue={profile.name} />
        <Input label="Title / Role" name="title" required defaultValue={profile.title} placeholder="e.g. Founder & Managing Director" />
      </div>
      <Input
        label="Hero Intro (optional)"
        name="intro"
        defaultValue={profile.intro}
        placeholder="A short tagline shown on the hero, e.g. 20 years building homes people trust."
      />
      <AdminImageField
        label={profile.photo ? "Replace Portrait (optional)" : "Portrait (optional)"}
        name="photo"
        removeName="photo-remove"
        currentSrc={profile.photo}
        helperText={profile.photo ? "Leave empty to keep the current photo." : "JPG, PNG or WEBP, up to 15MB. This is the hero image."}
      />

      <h2 className="text-label text-fg-subtle mt-2 uppercase">Story</h2>
      <Textarea label="Biography / Journey" name="bio" rows={7} required defaultValue={profile.bio} placeholder="The founder's story — background, journey, approach to real estate." />

      <h2 className="text-label text-fg-subtle mt-2 uppercase">Founder Statement</h2>
      <Textarea
        label="Statement / Message (optional)"
        name="statement"
        rows={4}
        defaultValue={profile.statement}
        placeholder="A personal message or quote, shown as its own highlighted section."
      />

      <h2 className="text-label text-fg-subtle mt-2 uppercase">Vision & Philosophy</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <Textarea label="Vision (optional)" name="vision" rows={3} defaultValue={profile.vision} />
        <Textarea label="Mission (optional)" name="mission" rows={3} defaultValue={profile.mission} />
      </div>
      <Textarea label="Philosophy (optional)" name="philosophy" rows={3} defaultValue={profile.philosophy} />
      <Textarea
        label="Leadership Principles / Core Beliefs (optional)"
        name="principles"
        rows={4}
        defaultValue={profile.principles.join("\n")}
        placeholder={"One per line, e.g.\nEvery project is judged by what it's worth a decade from now\nTransparency with every buyer, every time"}
        helperText="One principle per line."
      />

      <h2 className="text-label text-fg-subtle mt-2 uppercase">Highlights</h2>
      <Textarea
        label="Milestones / Highlights (optional)"
        name="highlights"
        rows={4}
        defaultValue={profile.highlights.join("\n")}
        placeholder={"One per line, e.g.\nFounded Shopno Bilash Properties in 2018\n15+ years in real estate development"}
        helperText="One highlight per line — shown as a bulleted list."
      />

      <h2 className="text-label text-fg-subtle mt-2 uppercase">Gallery</h2>
      <p className="text-body-sm text-fg-subtle -mt-2">Up to {FOUNDER_GALLERY_SLOTS} additional photos — at a project, on site, with the team.</p>
      {Array.from({ length: FOUNDER_GALLERY_SLOTS }, (_, i) => {
        const existing = profile.gallery[i];
        return (
          <div key={i} className="border-border flex flex-col gap-4 rounded-lg border p-4">
            <p className="text-label text-fg-subtle uppercase">Image {i + 1}</p>
            <AdminImageField
              label={existing ? "Replace Image (optional)" : "Image (optional)"}
              name={`gallery-${i}-image`}
              removeName={`gallery-${i}-remove`}
              currentSrc={existing?.src}
            />
            <Input label="Caption (optional)" name={`gallery-${i}-caption`} defaultValue={existing?.caption} />
          </div>
        );
      })}

      <div className="flex items-center gap-3">
        <SubmitButton />
      </div>
    </PersistForm>
  );
}
