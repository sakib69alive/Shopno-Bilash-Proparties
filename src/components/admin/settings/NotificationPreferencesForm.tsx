"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { updateNotificationPreferences, type PreferenceFormState } from "@/features/notifications/preferenceActions";
import type { NotificationPreference } from "@/types/notificationPreference";
import type { NotificationCategory } from "@/types/notification";

export interface NotificationPreferencesFormProps {
  preference?: NotificationPreference;
}

const MODE_OPTIONS = [
  { value: "all", label: "All Notifications" },
  { value: "important-only", label: "Important Only (High/Critical)" },
  { value: "custom", label: "Custom (choose categories below)" },
];

const CATEGORIES: { value: NotificationCategory; label: string }[] = [
  { value: "finance", label: "Financial Alerts" },
  { value: "construction", label: "Construction Alerts" },
  { value: "sales", label: "Sales Alerts" },
  { value: "crm", label: "CRM Alerts" },
  { value: "document", label: "Document Alerts" },
  { value: "inventory", label: "Inventory Alerts" },
  { value: "system", label: "System" },
  { value: "security", label: "Security" },
  { value: "approval", label: "Approvals" },
  { value: "reminder", label: "Reminders" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Save Preferences
    </Button>
  );
}

/** In-app only, functionally — email/SMS/WhatsApp toggles are presentational (no send infrastructure exists yet, see `NotificationProvider`), so they're marked "Coming soon" rather than pretending to work. */
export function NotificationPreferencesForm({ preference }: NotificationPreferencesFormProps) {
  const [state, formAction] = useActionState<PreferenceFormState, FormData>(updateNotificationPreferences, {});
  const [mode, setMode] = useState(preference?.mode ?? "all");

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && <p className="text-body-sm text-error">{state.error}</p>}

      <Select label="Mode" name="mode" options={MODE_OPTIONS} value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} />

      {mode === "custom" && (
        <div className="border-border grid gap-3 rounded-md border p-3 sm:grid-cols-2">
          {CATEGORIES.map((c) => (
            <Checkbox
              key={c.value}
              name={`category:${c.value}`}
              label={c.label}
              defaultChecked={preference?.enabledCategories.includes(c.value) ?? true}
            />
          ))}
        </div>
      )}

      <div className="border-border flex flex-col gap-3 rounded-md border p-3">
        <Checkbox name="inAppEnabled" label="In-app notifications" defaultChecked={preference?.inAppEnabled ?? true} />
        <Checkbox name="reminderNotificationsEnabled" label="Reminder notifications" defaultChecked={preference?.reminderNotificationsEnabled ?? true} />
        <Checkbox
          name="emailEnabled"
          label="Email notifications (coming soon)"
          disabled
          defaultChecked={preference?.emailEnabled ?? false}
          description="No email delivery is configured yet — this will activate once it is."
        />
      </div>

      <div>
        <SubmitButton />
      </div>
    </PersistForm>
  );
}
