"use client";

import { useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/Input";
import type { ProjectImage } from "@/content/projects";

/**
 * Project photos: every photo already on the project as a thumbnail with a
 * "remove" tick, plus a multi-file picker whose chosen photos are previewed
 * instantly (client-side, nothing uploaded until the form is saved). The
 * form posts `removeGallery` (one value per ticked photo, its `src`) and
 * `galleryImages` (the new files).
 */
export function ProjectGalleryField({ images }: { images: ProjectImage[] }) {
  const [previews, setPreviews] = useState<string[]>([]);

  return (
    <div className="flex flex-col gap-4">
      {images.length > 0 && (
        <div>
          <p className="text-label text-fg-muted mb-2">Current photos — tick any to remove</p>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {images.map((image) => (
              <li key={image.src}>
                <label className="border-border bg-surface relative block cursor-pointer overflow-hidden rounded-md border">
                  <span className="relative block aspect-square">
                    <Image src={image.src} alt={image.alt} fill sizes="120px" className="object-cover" />
                  </span>
                  <span className="text-caption flex items-center gap-2 px-2 py-1.5">
                    <input type="checkbox" name="removeGallery" value={image.src} className="size-4" />
                    Remove
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Input
        label="Add photos"
        name="galleryImages"
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp"
        helperText="Select several at once — progress shots of the ongoing building too. JPG, PNG or WEBP; keep the total under about 20MB per save."
        onChange={(e) => {
          setPreviews(Array.from(e.target.files ?? []).map((file) => URL.createObjectURL(file)));
        }}
      />

      {previews.length > 0 && (
        <ul className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {previews.map((src) => (
            <li key={src} className="border-border bg-surface relative aspect-square overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, not optimizable */}
              <img src={src} alt="" className="size-full object-cover" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
