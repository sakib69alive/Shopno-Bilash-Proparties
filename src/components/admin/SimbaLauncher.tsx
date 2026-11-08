"use client";

import { useEffect, useState } from "react";

/** The quiet "Guide" button in the admin top bar. It opens/closes the Simba panel (SimbaAgent) via window events. */
export function SimbaLauncher() {
  const [state, setState] = useState({ open: false, attention: false });
  useEffect(() => {
    const onState = (e: Event) => setState((e as CustomEvent<{ open: boolean; attention: boolean }>).detail);
    window.addEventListener("simba:state", onState);
    return () => window.removeEventListener("simba:state", onState);
  }, []);
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("simba:toggle"))}
      aria-label={state.open ? "Close Simba" : "Open Simba, your admin helper"}
      className="border-border bg-surface-raised text-fg hover:border-border-strong flex h-10 items-center gap-2 rounded-full border py-0.5 pr-3.5 pl-0.5 transition-colors"
    >
      <img src="/simba.webp" alt="" className="size-9 rounded-full object-cover" />
      <span className="text-body-sm font-medium">{state.open ? "Close" : "Guide"}</span>
      {state.attention && !state.open && <span aria-hidden className="bg-accent size-2 rounded-full" />}
    </button>
  );
}
