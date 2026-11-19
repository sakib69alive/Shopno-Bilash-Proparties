"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { blueprintPreviewSrc } from "@/lib/blueprintPreview";

export function BlueprintImage({ src, alt, detail = false, vectorKey, vectorDelay = 0, ...props }: Omit<ComponentProps<"img">, "src" | "srcSet" | "onError" | "alt"> & {
  src: string;
  alt: string;
  detail?: boolean;
  /** Restore the original vector for a settled zoom. A new key starts a new glide. */
  vectorKey?: string;
  vectorDelay?: number;
}) {
  const preview = blueprintPreviewSrc(src, detail);
  const requestedVector = vectorKey && preview !== src ? `${src}:${vectorKey}` : undefined;
  const [decodedVector, setDecodedVector] = useState<string>();
  const useVector = requestedVector !== undefined && decodedVector === requestedVector;

  useEffect(() => {
    if (!requestedVector) return;
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      const image = new Image();
      image.src = src;
      // Keep the lightweight preview visible while the original downloads and parses.
      void image.decode().then(() => {
        if (!cancelled) setDecodedVector(requestedVector);
      }).catch(() => {});
    }, vectorDelay);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [requestedVector, src, vectorDelay]);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- each source already has a bounded bitmap size.
    <img
      key={preview}
      {...props}
      src={useVector ? src : preview}
      alt={alt}
      draggable={false}
      decoding="async"
      onError={(event) => {
        if (event.currentTarget.getAttribute("src") === preview && preview !== src) event.currentTarget.src = src;
      }}
    />
  );
}
