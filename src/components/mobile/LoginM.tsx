"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Lock, Mail, Smartphone } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { OwnerLoginFlow } from "@/components/auth/OwnerLoginFlow";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Mode = "choose" | "owner" | "staff";

const COPY: Record<Exclude<Mode, "choose">, { title: string; hint: string }> = {
  owner: { title: "Property owner", hint: "Sign in with your registered phone number." },
  staff: { title: "Staff", hint: "Sign in with your work email and password." },
};

function ChoiceButton({
  icon,
  title,
  hint,
  primary,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex min-h-[4.5rem] w-full items-center gap-3.5 rounded-[1.75rem] p-2.5 pr-3 text-left transition-[transform,box-shadow] duration-150 active:scale-[0.98]",
        primary
          ? "bg-accent text-accent-foreground shadow-[0_10px_24px_rgb(var(--shadow-color)/0.22)]"
          : "bg-surface-raised border-border-strong text-fg border shadow-sm",
      )}
    >
      <span
        className={cn(
          "flex size-[3.25rem] shrink-0 items-center justify-center rounded-full",
          primary ? "bg-bg text-accent" : "bg-accent-soft text-accent",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="font-display block text-base leading-tight font-semibold">{title}</span>
        <span className={cn("mt-0.5 block text-[0.8125rem] leading-snug", primary ? "text-white/70" : "text-fg-muted")}>
          {hint}
        </span>
      </span>
      <span
        aria-hidden
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-active:translate-x-0.5",
          primary ? "bg-white/15" : "bg-surface",
        )}
      >
        <ArrowRight className="size-[18px]" />
      </span>
    </button>
  );
}

/**
 * Phone sign-in screen: a rounded card with the logo, a serif welcome, a
 * photo of one of our developments, then two large choices — property owner
 * (phone + PIN) or staff (email + password). Picking one swaps in the same
 * working form the desktop page uses; nothing about authentication changes,
 * and there is no third-party sign-in because the platform has none.
 */
export function LoginM({ logo }: { logo: ReactNode }) {
  const [mode, setMode] = useState<Mode>("choose");

  return (
    <div className="bg-surface flex min-h-svh w-full flex-col justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="bg-bg border-border flex min-h-[calc(100svh-1.5rem)] flex-col rounded-[var(--m-radius-hero)] border px-5 pt-6 pb-6 shadow-sm">
        <div className="flex items-center justify-between">
          {mode === "choose" ? (
            <Link href="/" aria-label="Back to the website" className="text-fg-muted -ml-2 flex size-11 items-center justify-center rounded-full">
              <ArrowLeft aria-hidden className="size-5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setMode("choose")}
              aria-label="Back to sign-in options"
              className="text-fg-muted -ml-2 flex size-11 items-center justify-center rounded-full"
            >
              <ArrowLeft aria-hidden className="size-5" />
            </button>
          )}
          {logo}
          <span aria-hidden className="size-11" />
        </div>

        {mode === "choose" ? (
          <div className="flex flex-1 flex-col">
            <h1 className="font-serif-display mt-5 text-center text-[2.5rem] leading-[1.05] text-balance">Welcome back.</h1>
            <p className="text-fg-muted mx-auto mt-3 max-w-[18rem] text-center text-[0.9375rem] leading-relaxed">
              Your property, payments and construction updates — all in one private place.
            </p>

            {/* White-background artwork: multiply lets the page's ivory show through, and the sleeve runs off the card edge.
                The transparent layer on top takes the pointer events, so a right-click / long-press / drag lands on it instead of the
                picture. That only deters casual saving — a screenshot or the network tab always gets the file. */}
            <div
              className="relative -mr-5 flex flex-1 items-center justify-end pt-4 select-none"
              onContextMenu={(e) => e.preventDefault()}
            >
              <Image
                src="/login-house.webp"
                alt="A hand holding a model of a modern two-storey house"
                width={1100}
                height={974}
                priority
                unoptimized
                draggable={false}
                className="pointer-events-none h-auto max-h-72 w-auto max-w-full object-contain mix-blend-multiply"
              />
              <span aria-hidden className="absolute inset-0 z-10" />
            </div>

            <div className="mt-6 flex flex-col gap-3.5">
              <ChoiceButton
                primary
                icon={<Smartphone aria-hidden className="size-5" />}
                title="Continue as Owner"
                hint="Phone number and PIN"
                onClick={() => setMode("owner")}
              />
              <ChoiceButton
                icon={<Mail aria-hidden className="size-5" />}
                title="Continue as Staff"
                hint="Email and password"
                onClick={() => setMode("staff")}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col pt-6">
            <h1 className="font-serif-display text-[2.25rem] leading-[1.05]">{COPY[mode].title}</h1>
            <p className="text-fg-muted mt-2 text-[0.9375rem]">{COPY[mode].hint}</p>
            <div className="mt-6">{mode === "owner" ? <OwnerLoginFlow /> : <LoginForm />}</div>
          </div>
        )}

        <p className="text-caption text-fg-subtle mt-6 flex items-center justify-center gap-1.5 text-center">
          <Lock aria-hidden className="size-3.5 shrink-0" />
          Private access — staff and authorized portal users only.
        </p>
      </div>
    </div>
  );
}
