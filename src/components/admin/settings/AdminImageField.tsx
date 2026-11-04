"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";

export interface AdminImageFieldProps {
  label: string;
  name: string;
  removeName?: string;
  currentSrc?: string;
  helperText?: string;
  /** Also accept SVG (blueprints and other line drawings). */
  allowSvg?: boolean;
}

/**
 * A file input with a live thumbnail — the currently-saved image (if any),
 * swapped for an instant client-side preview of whatever's just been
 * chosen (via `URL.createObjectURL`, no upload needed to see it), plus an
 * optional "remove" checkbox. Used for every Founder Profile image field
 * so choosing/replacing/removing a photo feels like a real image manager,
 * not a bare `<input type="file">`.
 */
export function AdminImageField({ label, name, removeName, currentSrc, helperText, allowSvg = false }: AdminImageFieldProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const shown = preview ?? currentSrc;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="border-border bg-surface relative size-20 shrink-0 overflow-hidden rounded-md border">
        {shown ? (
          <Image src={shown} alt="" fill sizes="80px" className="object-cover" />
        ) : (
          <div className="text-fg-subtle flex h-full items-center justify-center">
            <ImageIcon aria-hidden className="size-6" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <Input
          label={label}
          name={name}
          type="file"
          accept={allowSvg ? ".jpg,.jpeg,.png,.webp,.svg" : ".jpg,.jpeg,.png,.webp"}
          helperText={helperText}
          onChange={(e) => {
            const file = e.target.files?.[0];
            setPreview(file ? URL.createObjectURL(file) : null);
          }}
        />
        {removeName && currentSrc && <Checkbox name={removeName} label="Remove this image" />}
      </div>
    </div>
  );
}
