"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { RichTextArea } from "@/components/ui/RichTextArea";
import { Button } from "@/components/ui/Button";
import type { PolicyRuleFormState } from "@/features/policyRules/actions";
import type { PolicyRule } from "@/types/policyRule";

export interface PolicyRuleFormProps {
  action: (state: PolicyRuleFormState, formData: FormData) => Promise<PolicyRuleFormState>;
  rule?: PolicyRule;
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

/** Shared by the create/edit admin pages for a single Company Policy rule. */
export function PolicyRuleForm({ action, rule, submitLabel }: PolicyRuleFormProps) {
  const [state, formAction] = useActionState(action, {});

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <Input
        label="Title"
        name="title"
        required
        defaultValue={rule?.title}
        placeholder="e.g. Pricing, Cancellations, Payment Terms"
        helperText="A short heading, shown above this rule's text on both this list and the public page."
      />

      <RichTextArea
        label="Rule Text"
        name="text"
        required
        rows={6}
        defaultValue={rule?.text}
        placeholder={"e.g. All unit prices published on this website are subject to change without prior notice.\n\n- A booking is only confirmed once the initial payment is received.\n- Refund terms are set out in the individual sale agreement."}
        helperText="Shown on the public Company Policy page under this rule's title, auto-numbered by its position in the list. Select text and press Bold, or click List to bullet the current line — press Enter for a new line, leave a blank line for a new paragraph."
      />

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </PersistForm>
  );
}
