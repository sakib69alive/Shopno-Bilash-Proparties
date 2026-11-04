"use client";

import { useId, useState, type FormEvent } from "react";
import { AlertTriangle, Building2, Check, ChevronDown, Mail, MessageSquare, Phone, Send, User } from "lucide-react";
import { contactPaths, hero } from "@/content/contact";
import {
  CONTACT_METHOD_OPTIONS,
  DEVELOPMENT_INTENTION_OPTIONS,
  INVESTMENT_INTEREST_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  submitEnquiry,
} from "@/components/contact/EnquiryForm";
import type { EnquiryContext, EnquiryProjectOption } from "@/components/contact/ContactExperience";
import { EnquirySuccessState } from "@/components/contact/EnquirySuccessState";
import { cn } from "@/lib/utils";
import { ChipRail } from "./ChipRail";
import { ContactActions } from "./ContactActions";
import { SelectField, TextAreaField, TextField } from "./Fields";

type Status = "idle" | "loading" | "success" | "error";
type Errors = Partial<Record<"name" | "phone" | "message", string>>;

/**
 * Phone enquiry page: serif headline, one-tap WhatsApp / Call, a chip row
 * for what the visitor wants, then a short form — name, phone, message —
 * with everything else folded into "Add more details". Phone is the
 * required contact (email optional), which is how most enquiries reach this
 * team; the desktop form is unchanged. Project / unit context from the URL
 * (the unit page's "Enquire" button) is shown and submitted as hidden fields.
 */
export function ContactM({ context, projects }: { context: EnquiryContext; projects: EnquiryProjectOption[] }) {
  const [type, setType] = useState(context.enquiryType ?? "general");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Errors>({});
  const [moreOpen, setMoreOpen] = useState(false);
  const moreId = useId();

  const selectedPath = contactPaths.find((p) => p.value === type);
  const projectOptions = projects.map((p) => ({ value: p.name, label: p.name }));
  const constructionTypeOptions = Array.from(new Set(projects.map((p) => p.projectType))).map((v) => ({
    value: v,
    label: v,
  }));

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();

    const next: Errors = {};
    if (!name) next.name = "Please enter your name.";
    if (!phone) next.phone = "Please enter a phone number we can reach you on.";
    if (!message) next.message = "Please add a short message.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setStatus("loading");
    try {
      await submitEnquiry();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="px-[var(--gutter)] pt-6 pb-8 lg:hidden">
      <p className="text-label text-fg-subtle uppercase">{hero.eyebrow}</p>
      <h1 className="font-serif-display mt-2 text-[2.5rem] leading-[1.05] text-balance">{hero.headline}</h1>
      <p className="text-fg-muted mt-3 text-base leading-relaxed">
        Tell us a little and our team will follow up directly — or reach us right now.
      </p>

      <ContactActions className="mt-5" />

      <div className="-mx-[var(--gutter)] mt-8">
        <p className="text-label text-fg-subtle mb-3 px-[var(--gutter)] uppercase">What can we help with?</p>
        <ChipRail
          label="Enquiry type"
          value={type}
          onValueChange={setType}
          chips={contactPaths.map((p) => ({ value: p.value, label: p.label }))}
        />
        {selectedPath && <p className="text-body-sm text-fg-muted mt-3 px-[var(--gutter)]">{selectedPath.description}</p>}
      </div>

      {status === "success" ? (
        <div className="mt-8">
          <EnquirySuccessState />
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-surface-raised border-border mt-8 flex flex-col gap-4 rounded-[var(--m-radius-hero)] border p-5 shadow-md"
        >
          {(context.projectName || context.unitName) && (
            <div className="bg-accent-soft flex items-center gap-3 rounded-[var(--m-radius-card)] p-3.5">
              <span className="bg-bg text-accent flex size-10 shrink-0 items-center justify-center rounded-full">
                <Building2 aria-hidden className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-caption text-fg-muted">Enquiring about</p>
                <p className="text-[0.9375rem] leading-snug font-semibold">{context.projectName}</p>
                {context.unitName && <p className="text-body-sm text-fg-muted">{context.unitName}</p>}
              </div>
            </div>
          )}

          <input type="hidden" name="enquiryType" value={type} />
          {context.projectName && <input type="hidden" name="project" value={context.projectName} />}
          {context.unitName && <input type="hidden" name="unit" value={context.unitName} />}

          <TextField name="name" icon={User} label="Full name" autoComplete="name" placeholder="Your name" error={errors.name} />
          <TextField
            name="phone"
            icon={Phone}
            type="tel"
            inputMode="tel"
            label="Phone"
            autoComplete="tel"
            placeholder="01XXX-XXXXXX"
            error={errors.phone}
          />
          <TextAreaField name="message" icon={MessageSquare} label="Message" rows={4} placeholder="How can we help?" error={errors.message} />

          <div className="border-border rounded-[var(--m-radius-card)] border">
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-controls={moreId}
              onClick={() => setMoreOpen((v) => !v)}
              className="flex min-h-14 w-full items-center justify-between px-4 text-left text-[0.9375rem] font-semibold"
            >
              Add more details
              <ChevronDown
                aria-hidden
                className={cn("text-fg-subtle size-5 transition-transform duration-200", moreOpen && "rotate-180")}
              />
            </button>
            <div
              id={moreId}
              inert={!moreOpen || undefined}
              className={cn(
                "grid transition-[grid-template-rows] duration-[250ms] ease-[var(--ease-standard)]",
                moreOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <div className="flex flex-col gap-5 px-4 pb-5">
                  <TextField name="email" icon={Mail} type="email" inputMode="email" label="Email" optional autoComplete="email" />
                  <SelectField
                    name="contactMethod"
                    label="Preferred contact method"
                    defaultValue="phone"
                    options={[...CONTACT_METHOD_OPTIONS].reverse()}
                  />

                  {(type === "property" || type === "project") && (
                    <>
                      {!context.projectName && (
                        <SelectField
                          name="projectOfInterest"
                          label="Project"
                          optional
                          placeholder="Select a development"
                          options={projectOptions}
                        />
                      )}
                      {type === "property" && !context.unitName && (
                        <TextField name="unitOfInterest" label="Property / unit" optional placeholder="e.g. 3-bedroom, 5th floor" />
                      )}
                      {type === "property" && (
                        <>
                          <SelectField
                            name="propertyType"
                            label="Property type"
                            optional
                            placeholder="Any"
                            options={PROPERTY_TYPE_OPTIONS}
                          />
                          <TextField name="budget" label="Approximate budget" optional placeholder="e.g. ৳80 Lakh – ৳1.2 Crore" />
                        </>
                      )}
                    </>
                  )}

                  {type === "land-jv" && (
                    <>
                      <TextField name="landLocation" label="Land location" optional placeholder="e.g. Uttara, Dhaka" />
                      <TextField name="landSize" label="Approximate land size" optional placeholder="e.g. 5 Katha" />
                      <SelectField
                        name="developmentIntention"
                        label="Development intention"
                        optional
                        placeholder="Select one"
                        options={DEVELOPMENT_INTENTION_OPTIONS}
                      />
                    </>
                  )}

                  {type === "investment" && (
                    <>
                      <SelectField
                        name="investmentInterest"
                        label="Interest type"
                        optional
                        placeholder="Select one"
                        options={INVESTMENT_INTEREST_OPTIONS}
                      />
                      {!context.projectName && (
                        <SelectField
                          name="projectOfInterest"
                          label="Project / opportunity"
                          optional
                          placeholder="Any / not sure yet"
                          options={projectOptions}
                        />
                      )}
                    </>
                  )}

                  {type === "construction" && (
                    <>
                      <SelectField
                        name="constructionProjectType"
                        label="Project type"
                        optional
                        placeholder="Select one"
                        options={constructionTypeOptions}
                      />
                      <TextField name="constructionLocation" label="Location" optional placeholder="e.g. Gulshan, Dhaka" />
                      <TextField
                        name="constructionScope"
                        label="Approximate scope"
                        optional
                        placeholder="New build, renovation, management only"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {status === "error" && (
            <div role="alert" className="border-error/30 bg-error-soft flex items-start gap-3 rounded-[var(--m-radius-card)] border p-4">
              <AlertTriangle aria-hidden className="text-error mt-0.5 size-4 shrink-0" />
              <p className="text-body-sm text-error">
                Something went wrong sending your enquiry. Nothing you entered was lost — please try again.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="bg-accent text-accent-foreground text-button flex h-14 w-full items-center justify-center gap-2 rounded-full text-base transition-transform active:scale-[0.98] disabled:opacity-70"
          >
            {status === "loading" ? (
              "Sending…"
            ) : (
              <>
                <Send aria-hidden className="size-4.5" />
                Send enquiry
              </>
            )}
          </button>
          <p className="text-caption text-fg-subtle flex items-center justify-center gap-1.5 text-center">
            <Check aria-hidden className="size-3.5" />
            A real person on our team reads every enquiry.
          </p>
        </form>
      )}
    </div>
  );
}
