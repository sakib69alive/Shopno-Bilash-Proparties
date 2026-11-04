"use client";

import { useId, useState, type FormEvent } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Reveal } from "@/components/ui/Reveal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { EnquirySuccessState } from "./EnquirySuccessState";
import { EnquiryTips } from "./EnquiryTips";
import type { EnquiryContext, EnquiryProjectOption } from "./ContactExperience";

type Status = "idle" | "loading" | "success" | "error";
type Errors = Partial<Record<"name" | "email" | "message", string>>;

export const CONTACT_METHOD_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
];

export const PROPERTY_TYPE_OPTIONS = [
  { value: "Apartment", label: "Apartment" },
  { value: "Duplex", label: "Duplex" },
  { value: "Commercial Unit", label: "Commercial Unit" },
  { value: "Plot", label: "Plot" },
];

export const DEVELOPMENT_INTENTION_OPTIONS = [
  { value: "joint-venture", label: "Joint Venture" },
  { value: "outright-sale", label: "Outright Sale" },
  { value: "not-sure", label: "Not Sure Yet" },
];

export const INVESTMENT_INTEREST_OPTIONS = [
  { value: "capital-partner", label: "Capital Partner" },
  { value: "development-partner", label: "Development Partner" },
  { value: "not-sure", label: "Not Sure Yet" },
];

/**
 * Placeholder for the real submission call once an Admin/CRM backend
 * exists — currently always succeeds after a short delay. The try/catch
 * around it below is real and wired to the error UI, even though nothing
 * can actually fail yet.
 */
export async function submitEnquiry(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 700));
}

/**
 * The "smart" half of the enquiry experience (brief §5): common fields
 * always show, plus a short, concrete set of extra fields for whichever
 * enquiry type is selected — never every field at once. Extra fields are
 * always optional context, never gated behind validation, so switching
 * types never traps a visitor who already started typing a message.
 */
export function EnquiryForm({
  type,
  context,
  projects,
}: {
  type: string;
  context: EnquiryContext;
  projects: EnquiryProjectOption[];
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Errors>({});
  const formId = useId();

  const PROJECT_OPTIONS = projects.map((p) => ({ value: p.name, label: p.name }));
  const CONSTRUCTION_PROJECT_TYPE_OPTIONS = Array.from(new Set(projects.map((p) => p.projectType))).map(
    (projectType) => ({ value: projectType, label: projectType }),
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();

    const nextErrors: Errors = {};
    if (!name) nextErrors.name = "Please enter your name.";
    if (!email) nextErrors.email = "Please enter your email.";
    if (!message) nextErrors.message = "Please add a short message.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus("loading");
    try {
      await submitEnquiry();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") return <EnquirySuccessState />;

  return (
    <>
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        {(context.projectName || context.unitName) && (
          <div className="border-border-strong bg-surface-raised rounded-md border p-5">
            {context.projectName && (
              <p className="text-body-sm">
                <span className="text-fg-subtle">Project: </span>
                <span className="text-fg">{context.projectName}</span>
              </p>
            )}
            {context.unitName && (
              <p className="text-body-sm mt-1">
                <span className="text-fg-subtle">Property: </span>
                <span className="text-fg">{context.unitName}</span>
              </p>
            )}
          </div>
        )}

        <input type="hidden" name="enquiryType" value={type} />
        {context.projectName && <input type="hidden" name="project" value={context.projectName} />}
        {context.unitName && <input type="hidden" name="unit" value={context.unitName} />}

        <div className="grid gap-6 sm:grid-cols-2">
          <Input name="name" label="Full Name" error={errors.name} autoComplete="name" />
          <Input name="phone" type="tel" label="Phone (optional)" autoComplete="tel" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Input name="email" type="email" label="Email" error={errors.email} autoComplete="email" />
          <Select
            name="contactMethod"
            label="Preferred Contact Method"
            options={CONTACT_METHOD_OPTIONS}
            defaultValue="email"
          />
        </div>

        {(type === "property" || type === "project") && (
          <Reveal className="grid gap-6 sm:grid-cols-2">
            {!context.projectName && (
              <Select
                name="projectOfInterest"
                label="Project (optional)"
                placeholder="Select a development"
                options={PROJECT_OPTIONS}
              />
            )}
            {type === "property" && !context.unitName && (
              <Input name="unitOfInterest" label="Property / Unit (optional)" placeholder="e.g. 3-bedroom, 5th floor" />
            )}
            {type === "property" && (
              <Select
                name="propertyType"
                label="Preferred Property Type (optional)"
                placeholder="Any"
                options={PROPERTY_TYPE_OPTIONS}
              />
            )}
            {type === "property" && (
              <Input name="budget" label="Approximate Budget (optional)" placeholder="e.g. ৳80 Lakh – ৳1.2 Crore" />
            )}
          </Reveal>
        )}

        {type === "land-jv" && (
          <Reveal className="grid gap-6 sm:grid-cols-2">
            <Input name="landLocation" label="Property / Land Location (optional)" placeholder="e.g. Uttara, Dhaka" />
            <Input name="landSize" label="Approximate Land Size (optional)" placeholder="e.g. 5 Katha" />
            <div className="sm:col-span-2">
              <Select
                name="developmentIntention"
                label="Development Intention (optional)"
                placeholder="Select one"
                options={DEVELOPMENT_INTENTION_OPTIONS}
              />
            </div>
          </Reveal>
        )}

        {type === "investment" && (
          <Reveal className="grid gap-6 sm:grid-cols-2">
            <Select
              name="investmentInterest"
              label="Interest Type (optional)"
              placeholder="Select one"
              options={INVESTMENT_INTEREST_OPTIONS}
            />
            {!context.projectName && (
              <Select
                name="projectOfInterest"
                label="Project / Opportunity (optional)"
                placeholder="Any / not sure yet"
                options={PROJECT_OPTIONS}
              />
            )}
          </Reveal>
        )}

        {type === "construction" && (
          <Reveal className="grid gap-6 sm:grid-cols-2">
            <Select
              name="constructionProjectType"
              label="Project Type (optional)"
              placeholder="Select one"
              options={CONSTRUCTION_PROJECT_TYPE_OPTIONS}
            />
            <Input name="constructionLocation" label="Location (optional)" placeholder="e.g. Gulshan, Dhaka" />
            <div className="sm:col-span-2">
              <Input
                name="constructionScope"
                label="Approximate Scope (optional)"
                placeholder="e.g. new construction, renovation, project management only"
              />
            </div>
          </Reveal>
        )}

        <Textarea name="message" label="Message" error={errors.message} rows={5} />

        {status === "error" && (
          <div className="border-error/30 bg-error-soft flex items-start gap-3 rounded-md border p-4">
            <AlertTriangle aria-hidden className="text-error mt-0.5 size-4 shrink-0" />
            <p className="text-body-sm text-error">
              Something went wrong sending your enquiry. Nothing you entered was lost — please try again.
            </p>
          </div>
        )}

        <Button type="submit" size="lg" loading={status === "loading"} className="self-start">
          {status === "loading" ? "Sending" : "Send Enquiry"}
        </Button>
      </form>
      <EnquiryTips />
    </>
  );
}
