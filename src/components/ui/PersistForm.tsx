"use client";

import { useEffect, useRef, type ComponentProps, type Ref, type SubmitEvent } from "react";

type Snapshot = Map<string, FormDataEntryValue[]>;

/** Put back what was typed. File choices cannot be restored by a page (the browser forbids it), so those are skipped. */
function restore(form: HTMLFormElement, snap: Snapshot) {
  for (const el of Array.from(form.elements)) {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) continue;
    const name = el.name;
    if (!name || !snap.has(name)) continue;
    const values = snap.get(name)!.filter((v): v is string => typeof v === "string");
    if (el instanceof HTMLInputElement) {
      if (el.type === "file" || el.type === "password") continue;
      if (el.type === "checkbox" || el.type === "radio") {
        el.checked = values.includes(el.value);
        continue;
      }
    }
    if (el instanceof HTMLSelectElement && el.multiple) {
      for (const opt of Array.from(el.options)) opt.selected = values.includes(opt.value);
      continue;
    }
    if (values.length > 0 && el.value !== values[0]) el.value = values[0];
  }
}

/**
 * A drop-in `<PersistForm state={state} action={formAction}>` that does not throw away what you typed when the server says "no".
 *
 * React clears a form after every submit; so a single mistake (a missing field, a too-short description) used to wipe the whole form.
 * This keeps the action exactly as it is (pending state, redirects and all), notes what was typed at the moment of sending, and — if the
 * answer that comes back has an `error` — puts it all back. When the save succeeds the form clears as usual.
 */
export function PersistForm({ state, ref, onSubmitCapture, ...props }: ComponentProps<"form"> & { state?: { error?: string } | unknown; ref?: Ref<HTMLFormElement> }) {
  const inner = useRef<HTMLFormElement | null>(null);
  const snapshot = useRef<Snapshot | null>(null);
  const mounted = useRef(false);

  function setRefs(node: HTMLFormElement | null) {
    inner.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as { current: HTMLFormElement | null }).current = node;
  }

  function capture(e: SubmitEvent<HTMLFormElement>) {
    const snap: Snapshot = new Map();
    new FormData(e.currentTarget).forEach((value, key) => {
      snap.set(key, [...(snap.get(key) ?? []), value]);
    });
    snapshot.current = snap;
    onSubmitCapture?.(e);
  }

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const error = (state as { error?: string } | null | undefined)?.error;
    const form = inner.current;
    const snap = snapshot.current;
    if (!error || !form || !snap) return;
    // React empties the form just after the answer arrives — put the typing back right after that.
    const t = setTimeout(() => restore(form, snap), 0);
    restore(form, snap);
    return () => clearTimeout(t);
  }, [state]);

  return <form ref={setRefs} onSubmitCapture={capture} {...props} />;
}
