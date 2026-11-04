/**
 * Ready-made notices for the things the office writes again and again —
 * meetings, installments, piling, floor casting, progress and cost updates.
 * Each template is a title and a text with `{{placeholders}}`; the Studio shows
 * one small field per placeholder (a name, a date, an amount…) and fills the
 * text live. Anything not filled in stays visible as "[Label]" so nothing goes
 * out half-written by accident. The text itself stays fully editable, and
 * "Custom" is always there for anything else.
 */

export type TemplateFieldType = "text" | "date" | "time" | "number" | "project";

export interface TemplateField {
  key: string;
  label: string;
  type: TemplateFieldType;
  placeholder?: string;
}

export interface NoticeTemplate {
  id: string;
  group: string;
  label: string;
  hint: string;
  title: string;
  body: string;
  fields: TemplateField[];
}

const project: TemplateField = { key: "project", label: "Project", type: "project" };
const text = (key: string, label: string, placeholder?: string): TemplateField => ({ key, label, type: "text", placeholder });
const date = (key: string, label: string): TemplateField => ({ key, label, type: "date" });
const time = (key: string, label: string): TemplateField => ({ key, label, type: "time" });
const money = (key: string, label: string): TemplateField => ({ key, label, type: "number", placeholder: "Amount in BDT" });

export const TEMPLATE_GROUPS = ["Meetings", "Sales", "Payments", "Construction", "Costs", "General"] as const;

export const NOTICE_TEMPLATES: NoticeTemplate[] = [
  // ── Meetings ──────────────────────────────────────────────────────────────────────────────────
  {
    id: "meeting-notice",
    group: "Meetings",
    label: "Meeting notice",
    hint: "Call a meeting: date, time, place, agenda",
    title: "Notice of meeting — {{project}}",
    body: `Dear {{name}},

You are kindly requested to attend a meeting on **{{date}}** at **{{time}}**.

**Venue:** {{venue}}

## Agenda

1. Progress of the work at {{project}}
2. Payments and upcoming installments
3. Any other matter with the permission of the chair

Your presence will be highly appreciated.`,
    fields: [text("name", "Addressed to", "e.g. All owners"), project, date("date", "Meeting date"), time("time", "Time"), text("venue", "Venue", "e.g. Head office, Gulshan 2")],
  },
  {
    id: "meeting-minutes",
    group: "Meetings",
    label: "Meeting minutes",
    hint: "Record who attended and what was decided",
    title: "Minutes of meeting — {{date}}",
    body: `**Project:** {{project}}
**Date:** {{date}}
**Venue:** {{venue}}
**Present:** {{attendees}}

## Discussion

1. {{point1}}
2. {{point2}}

## Decisions

| Decision | Responsible | By when |
|---|---|---|
| {{decision1}} | {{person1}} | {{deadline1}} |
| {{decision2}} | {{person2}} | {{deadline2}} |

Next meeting: **{{nextdate}}**`,
    fields: [
      project,
      date("date", "Meeting date"),
      text("venue", "Venue"),
      text("attendees", "People present", "Names, separated by commas"),
      text("point1", "Discussion point 1"),
      text("point2", "Discussion point 2"),
      text("decision1", "Decision 1"),
      text("person1", "Responsible (1)"),
      text("deadline1", "By when (1)"),
      text("decision2", "Decision 2"),
      text("person2", "Responsible (2)"),
      text("deadline2", "By when (2)"),
      date("nextdate", "Next meeting"),
    ],
  },

  // ── Payments ──────────────────────────────────────────────────────────────────────────────────
  {
    id: "installment-notice",
    group: "Payments",
    label: "New installment",
    hint: "Tell an owner the next installment and its due date",
    title: "Installment notice — {{unit}}",
    body: `Dear {{name}},

We would like to inform you that the **{{installment}}** installment for your flat **{{unit}}** at **{{project}}** is now due.

| Installment | Amount | Due date |
|---|---|---|
| {{installment}} | ৳ {{amount}} | {{duedate}} |

Please make the payment by the due date through cash, bank transfer, cheque or mobile banking, and keep the receipt we issue. If you have already paid, kindly ignore this notice.

For any question, please contact our office.`,
    fields: [text("name", "Owner's name"), project, text("unit", "Flat", "e.g. A-502"), text("installment", "Installment", "e.g. 3rd"), money("amount", "Amount"), date("duedate", "Due date")],
  },
  {
    id: "payment-reminder",
    group: "Payments",
    label: "Payment reminder",
    hint: "A polite reminder for an overdue payment",
    title: "Payment reminder — {{unit}}",
    body: `Dear {{name}},

Our records show that **৳ {{amount}}** for your flat **{{unit}}** at **{{project}}**, which was due on **{{duedate}}**, is still pending.

We kindly request you to clear the amount at your earliest convenience. If you have already made this payment, please share the receipt number so we can update our records.

Thank you for your cooperation.`,
    fields: [text("name", "Owner's name"), project, text("unit", "Flat"), money("amount", "Amount pending"), date("duedate", "Was due on")],
  },
  {
    id: "payment-received",
    group: "Payments",
    label: "Payment received",
    hint: "Confirm a payment you have received",
    title: "Payment received — {{unit}}",
    body: `Dear {{name}},

We confirm with thanks that we have received **৳ {{amount}}** on **{{paiddate}}** towards your flat **{{unit}}** at **{{project}}**.

| Detail | |
|---|---|
| Paid by | {{method}} |
| Receipt no. | {{receipt}} |
| For | {{purpose}} |

Your updated statement is available from our office on request.`,
    fields: [text("name", "Owner's name"), project, text("unit", "Flat"), money("amount", "Amount"), date("paiddate", "Date received"), text("method", "Paid by", "Cash / Bank / bKash…"), text("receipt", "Receipt no."), text("purpose", "For", "e.g. Down payment")],
  },

  // ── Construction ──────────────────────────────────────────────────────────────────────────────
  {
    id: "piling",
    group: "Construction",
    label: "Piling work",
    hint: "Piling started or completed at a building",
    title: "Piling work — {{project}}",
    body: `Dear Owners and Stakeholders,

We are pleased to share that the **piling work** of **{{building}}** at **{{project}}** has {{status}}.

| Detail | |
|---|---|
| Date | {{date}} |
| Number of piles | {{piles}} |
| Pile depth | {{depth}} |
| Contractor | {{contractor}} |

The foundation work will follow as per schedule. We will keep you informed of each stage.`,
    fields: [project, text("building", "Building", "e.g. Block A"), text("status", "Status", "started / been completed"), date("date", "Date"), text("piles", "Number of piles"), text("depth", "Pile depth", "e.g. 90 ft"), text("contractor", "Contractor")],
  },
  {
    id: "floor-casting",
    group: "Construction",
    label: "New floor / casting (dhalai)",
    hint: "Announce a floor slab casting and its schedule",
    title: "Casting of {{floor}} — {{project}}",
    body: `Dear Owners,

The **roof slab casting (dhalai) of {{floor}}** of **{{building}}** at **{{project}}** is scheduled as follows.

| Detail | |
|---|---|
| Date | {{date}} |
| Starting time | {{time}} |
| Concrete required | {{concrete}} |
| Contractor | {{contractor}} |

## Please note

- Heavy vehicles will use the site entrance throughout the day.
- Visitors are requested to avoid the site on this day for safety.
- Work may be rescheduled in case of heavy rain; we will inform you if so.

Thank you for your understanding and support.`,
    fields: [project, text("building", "Building", "e.g. Block A"), text("floor", "Floor", "e.g. 5th floor"), date("date", "Casting date"), time("time", "Starting time"), text("concrete", "Concrete", "e.g. 180 cum"), text("contractor", "Contractor")],
  },
  {
    id: "progress-update",
    group: "Construction",
    label: "Progress update",
    hint: "Where the work stands and what is next",
    title: "Construction progress — {{project}}",
    body: `Dear Owners,

Here is the progress update for **{{project}}** as of **{{date}}**.

| Stage | Status |
|---|---|
| Completed | {{done}} |
| In progress | {{current}} |
| Next | {{next}} |

Overall progress: **{{percent}}%**

We will share the next update on **{{nextupdate}}**.`,
    fields: [project, date("date", "As of"), text("done", "Completed", "e.g. Foundation, piling"), text("current", "In progress", "e.g. 4th floor casting"), text("next", "Next stage"), text("percent", "Overall progress %"), date("nextupdate", "Next update")],
  },
  {
    id: "handover",
    group: "Construction",
    label: "Handover notice",
    hint: "Invite owners to take over their flats",
    title: "Handover of {{project}}",
    body: `Dear {{name}},

We are delighted to inform you that your flat at **{{project}}** is ready for handover.

**Handover date:** {{date}}
**Time:** {{time}}
**Venue:** {{venue}}

## Please bring

1. National ID card
2. Allotment letter and agreement copy
3. All payment receipts

Please clear any remaining dues before the handover date. We look forward to welcoming you home.`,
    fields: [text("name", "Addressed to", "e.g. Valued Owners"), project, date("date", "Handover date"), time("time", "Time"), text("venue", "Venue")],
  },

  // ── Costs ─────────────────────────────────────────────────────────────────────────────────────
  {
    id: "cost-update",
    group: "Costs",
    label: "Cost update by category",
    hint: "How much was spent, and on what",
    title: "Cost update — {{project}}",
    body: `The table below shows how the money was spent at **{{project}}** during **{{period}}**.

| Spent on | Amount (BDT) | Note |
|---|---|---|
| Piling | {{piling}} | |
| Foundation | {{foundation}} | |
| Casting (dhalai) | {{casting}} | |
| Materials | {{materials}} | |
| Labour & contractors | {{labour}} | |

**Total spent:** ৳ {{total}}

For the full figures from the records, use *Project summary* in this section.`,
    fields: [project, text("period", "Period", "e.g. October 2026"), money("piling", "Piling"), money("foundation", "Foundation"), money("casting", "Casting"), money("materials", "Materials"), money("labour", "Labour & contractors"), money("total", "Total")],
  },
  {
    id: "contribution-call",
    group: "Costs",
    label: "Cost contribution call",
    hint: "Ask owners for their share of a construction cost",
    title: "Construction contribution — {{work}}",
    body: `Dear {{name}},

For the **{{work}}** of **{{project}}**, each owner's share is calculated in proportion to the area of their flat.

| Detail | |
|---|---|
| Total cost of this work | ৳ {{total}} |
| Your share | ৳ {{share}} |
| Please pay by | {{duedate}} |

Kindly make the payment by the date above. Your detailed breakdown is available from our office.`,
    fields: [text("name", "Owner's name"), project, text("work", "Work", "e.g. piling work"), money("total", "Total cost"), money("share", "Owner's share"), date("duedate", "Pay by")],
  },

  // ── General ───────────────────────────────────────────────────────────────────────────────────
  {
    id: "office-closed",
    group: "General",
    label: "Office closed / holiday",
    hint: "Closed days and when the office reopens",
    title: "Office notice — {{occasion}}",
    body: `Dear Valued Customers and Partners,

Our office will remain **closed on {{date}}** on account of **{{occasion}}**.

The office will reopen on **{{reopen}}**. For urgent matters, please call {{phone}}.

We wish you a peaceful and joyful time.`,
    fields: [text("occasion", "Occasion", "e.g. Eid-ul-Fitr"), date("date", "Closed from"), date("reopen", "Reopens on"), text("phone", "Urgent contact")],
  },
  {
    id: "site-visit",
    group: "General",
    label: "Site visit invitation",
    hint: "Invite owners or landowners to visit the site",
    title: "Site visit — {{project}}",
    body: `Dear {{name}},

We cordially invite you to visit **{{project}}** and see the progress of the work.

**Date:** {{date}}
**Time:** {{time}}
**Meeting point:** {{venue}}

Please wear comfortable shoes. Safety helmets will be provided at the site. Kindly confirm your attendance by calling our office.`,
    fields: [text("name", "Addressed to"), project, date("date", "Date"), time("time", "Time"), text("venue", "Meeting point")],
  },
  // ── More meetings ─────────────────────────────────────────────────────────────────────────────
  {
    id: "landowner-meeting",
    group: "Meetings",
    label: "Landowner / JV meeting",
    hint: "Meeting with landowners about a joint venture",
    title: "Meeting with landowners — {{project}}",
    body: `Respected {{name}},

We would like to meet you to discuss the progress and the next steps of the joint venture project **{{project}}**.

**Date:** {{date}}
**Time:** {{time}}
**Venue:** {{venue}}

## Points for discussion

1. Construction progress and the schedule ahead
2. Allocation of flats and parking as per the agreement
3. Any question or suggestion from your side

We value your partnership and look forward to meeting you.`,
    fields: [text("name", "Addressed to"), project, date("date", "Date"), time("time", "Time"), text("venue", "Venue")],
  },
  {
    id: "shareholder-meeting",
    group: "Meetings",
    label: "Shareholders' meeting",
    hint: "Notice to partners and shareholders",
    title: "Shareholders' meeting — {{date}}",
    body: `Dear Partners and Shareholders,

A meeting of the shareholders will be held on **{{date}}** at **{{time}}** at **{{venue}}**.

## Agenda

1. Review of the progress of {{project}}
2. Statement of money received and spent
3. Decisions on the way forward
4. Any other business

Kindly confirm your attendance with the office.`,
    fields: [date("date", "Meeting date"), time("time", "Time"), text("venue", "Venue"), project],
  },

  // ── Sales ─────────────────────────────────────────────────────────────────────────────────────
  {
    id: "booking-confirmation",
    group: "Sales",
    label: "Booking confirmation",
    hint: "Confirm a flat booking and the balance to follow",
    title: "Booking confirmation — {{unit}}",
    body: `Dear {{name}},

Thank you for choosing **{{project}}**. We are pleased to confirm the booking of your flat.

| Detail | |
|---|---|
| Flat | {{unit}} |
| Booking date | {{date}} |
| Booking amount received | ৳ {{amount}} |
| Agreed price | ৳ {{price}} |
| Next payment due | {{nextdue}} |

Our team will contact you to complete the agreement. Please keep this letter and your receipt safely.`,
    fields: [text("name", "Customer's name"), project, text("unit", "Flat"), date("date", "Booking date"), money("amount", "Booking amount"), money("price", "Agreed price"), date("nextdue", "Next payment due")],
  },
  {
    id: "welcome-allotment",
    group: "Sales",
    label: "Welcome / allotment letter",
    hint: "Welcome a new owner to the project",
    title: "Welcome to {{project}}",
    body: `Dear {{name}},

Welcome to the **{{project}}** family. We are honoured that you have chosen us for your new home.

Flat **{{unit}}** has been allotted to you. Our team will stay in touch with you through every stage — from construction updates to handover.

Your allotment details:

- **Flat:** {{unit}}
- **Size:** {{size}} sq ft
- **Expected handover:** {{handover}}

If you need anything at all, please contact our office.`,
    fields: [text("name", "Customer's name"), project, text("unit", "Flat"), text("size", "Size (sq ft)"), text("handover", "Expected handover", "e.g. December 2027")],
  },
  {
    id: "price-change",
    group: "Sales",
    label: "Flat price change",
    hint: "Tell an owner their price has been adjusted",
    title: "Change in flat price — {{unit}}",
    body: `Dear {{name}},

We would like to inform you of a change in the agreed price of your flat **{{unit}}** at **{{project}}**.

| Detail | |
|---|---|
| Previous price | ৳ {{oldprice}} |
| New price | ৳ {{newprice}} |
| Reason | {{reason}} |
| Effective from | {{date}} |

Your payment statement will show the updated balance. Please contact us if you would like to discuss this.`,
    fields: [text("name", "Owner's name"), project, text("unit", "Flat"), money("oldprice", "Previous price"), money("newprice", "New price"), text("reason", "Reason", "e.g. Discount agreed"), date("date", "Effective from")],
  },
  {
    id: "agreement-signing",
    group: "Sales",
    label: "Agreement signing",
    hint: "Invite a buyer to sign the sale agreement",
    title: "Signing of agreement — {{unit}}",
    body: `Dear {{name}},

You are invited to our office to sign the sale agreement for flat **{{unit}}** at **{{project}}**.

**Date:** {{date}}
**Time:** {{time}}
**Venue:** {{venue}}

## Please bring

1. National ID card (original and a copy)
2. Two passport-size photographs
3. The booking receipt

The registration steps will be explained to you at the meeting.`,
    fields: [text("name", "Buyer's name"), project, text("unit", "Flat"), date("date", "Date"), time("time", "Time"), text("venue", "Venue")],
  },
  {
    id: "parking-allotment",
    group: "Sales",
    label: "Parking allotment",
    hint: "Confirm a parking space for an owner",
    title: "Parking allotment — {{unit}}",
    body: `Dear {{name}},

We are pleased to confirm that parking space **{{parking}}** at **{{project}}** has been allotted to the owner of flat **{{unit}}**.

| Detail | |
|---|---|
| Parking | {{parking}} |
| Flat | {{unit}} |
| Price | ৳ {{price}} |

Please keep this letter with your records.`,
    fields: [text("name", "Owner's name"), project, text("unit", "Flat"), text("parking", "Parking no."), money("price", "Price")],
  },

  // ── More construction ─────────────────────────────────────────────────────────────────────────
  {
    id: "work-delay",
    group: "Construction",
    label: "Delay / reschedule",
    hint: "A work is delayed — why, and the new date",
    title: "Change of schedule — {{project}}",
    body: `Dear Owners,

We would like to inform you that the **{{work}}** at **{{project}}**, planned for **{{olddate}}**, has been rescheduled.

**New date:** {{newdate}}
**Reason:** {{reason}}

We apologise for any inconvenience and will keep you updated. The overall handover schedule is expected to remain **{{impact}}**.`,
    fields: [project, text("work", "Work", "e.g. 6th floor casting"), date("olddate", "Planned date"), date("newdate", "New date"), text("reason", "Reason", "e.g. heavy rain"), text("impact", "Effect on handover", "unchanged / revised")],
  },
  {
    id: "disruption",
    group: "Construction",
    label: "Water / power / road notice",
    hint: "Temporary disruption near the site",
    title: "Temporary interruption — {{service}}",
    body: `Dear Residents and Neighbours,

Due to **{{work}}** at **{{project}}**, the **{{service}}** will be temporarily interrupted.

**Date:** {{date}}
**Time:** {{from}} to {{to}}

We regret the inconvenience and thank you for your patience and cooperation.`,
    fields: [project, text("service", "Service", "e.g. water supply"), text("work", "Because of", "e.g. line connection work"), date("date", "Date"), time("from", "From"), time("to", "To")],
  },
  {
    id: "safety",
    group: "Construction",
    label: "Site safety notice",
    hint: "Safety rules for workers and visitors",
    title: "Site safety notice — {{project}}",
    body: `## Safety at {{project}}

For everyone's safety, the following rules apply at the site from **{{date}}**.

1. Safety helmet and shoes are required for everyone entering the site.
2. Visitors must register at the gate and stay with a site representative.
3. No one may enter the area below ongoing casting or lifting work.
4. Report any unsafe condition to the site engineer immediately.

> Safety first — for every worker, every visitor, every day.`,
    fields: [project, date("date", "Effective from")],
  },
  {
    id: "work-order",
    group: "Construction",
    label: "Work order (contractor)",
    hint: "Give a contractor a piece of work",
    title: "Work order — {{work}}",
    body: `To
**{{contractor}}**

Subject: Work order for {{work}} at {{project}}

You are hereby appointed to carry out the following work.

| Detail | |
|---|---|
| Work | {{work}} |
| Project | {{project}} |
| Start date | {{start}} |
| Completion date | {{end}} |
| Agreed amount | ৳ {{amount}} |

The work must follow the approved drawings and the instructions of our site engineer. Payment will be made against verified progress.`,
    fields: [text("contractor", "Contractor"), project, text("work", "Work", "e.g. Brick work, 1st to 4th floor"), date("start", "Start date"), date("end", "Completion date"), money("amount", "Agreed amount")],
  },
  {
    id: "inspection",
    group: "Construction",
    label: "Inspection / quality check",
    hint: "Announce a site inspection",
    title: "Site inspection — {{project}}",
    body: `This is to inform all concerned that a quality inspection of **{{work}}** at **{{project}}** will be carried out on **{{date}}** at **{{time}}**.

Inspection will be done by: **{{inspector}}**

All relevant drawings, test reports and material records must be made available at the site on that day.`,
    fields: [project, text("work", "Work to inspect", "e.g. 5th floor reinforcement"), date("date", "Date"), time("time", "Time"), text("inspector", "Inspector")],
  },

  // ── More costs ────────────────────────────────────────────────────────────────────────────────
  {
    id: "expense-approval",
    group: "Costs",
    label: "Expense approval request",
    hint: "Ask for approval to spend on something",
    title: "Request for approval — {{item}}",
    body: `Respected {{name}},

We request your approval for the following expense at **{{project}}**.

| Detail | |
|---|---|
| Item | {{item}} |
| Estimated cost | ৳ {{amount}} |
| Needed by | {{date}} |
| Reason | {{reason}} |

Kindly approve so the work can proceed on time.`,
    fields: [text("name", "Addressed to"), project, text("item", "Item", "e.g. Rod for 7th floor"), money("amount", "Estimated cost"), date("date", "Needed by"), text("reason", "Reason")],
  },

  // ── More general ──────────────────────────────────────────────────────────────────────────────
  {
    id: "greetings",
    group: "General",
    label: "Greetings / wishes",
    hint: "Eid, Pohela Boishakh, New Year…",
    title: "{{occasion}} greetings",
    body: `Dear Valued Customers, Partners and Friends,

On the joyous occasion of **{{occasion}}**, everyone at {{company}} wishes you and your family good health, peace and happiness.

Thank you for your trust and support. We look forward to building more together.`,
    fields: [text("occasion", "Occasion", "e.g. Eid-ul-Adha"), text("company", "Company", "Shopno Bilash Properties")],
  },
  {
    id: "staff-notice",
    group: "General",
    label: "Staff notice",
    hint: "Notice for employees: timing, leave, rules",
    title: "Notice to all staff",
    body: `To all employees,

**Subject:** {{subject}}

{{details}}

This is effective from **{{date}}**. Please contact the HR or your supervisor for any clarification.`,
    fields: [text("subject", "Subject", "e.g. Revised office hours"), text("details", "Details"), date("date", "Effective from")],
  },
  {
    id: "thank-you",
    group: "General",
    label: "Thank-you letter",
    hint: "Thank an owner, partner or contractor",
    title: "Thank you",
    body: `Dear {{name}},

On behalf of {{company}}, I would like to thank you sincerely for {{reason}}.

Your support means a great deal to us and motivates the whole team. We look forward to continuing our journey together.`,
    fields: [text("name", "Addressed to"), text("company", "Company", "Shopno Bilash Properties"), text("reason", "Thanks for", "e.g. your timely cooperation")],
  },

];

export function findTemplate(id: string): NoticeTemplate | undefined {
  return NOTICE_TEMPLATES.find((t) => t.id === id);
}

export function defaultValues(template: NoticeTemplate): Record<string, string> {
  return Object.fromEntries(template.fields.map((f) => [f.key, ""]));
}

const longDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

const clockTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h)) return hhmm;
  const suffix = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m ?? 0).padStart(2, "0")} ${suffix}`;
};

const grouped = (n: string) => {
  const num = Number(n);
  return Number.isFinite(num) && n.trim() !== "" ? num.toLocaleString("en-IN") : n;
};

/**
 * Fills `{{key}}` placeholders from the field values — dates written out
 * ("15 December 2026"), times as "10:30 AM", amounts with digit grouping. A
 * field left empty shows as "[Label]" so it is obvious what is still missing.
 */
export function fillTemplate(source: string, template: NoticeTemplate | undefined, values: Record<string, string>): string {
  if (!template) return source;
  return source.replace(/\{\{\s*(\w+)\s*\}\}/g, (whole, key: string) => {
    const field = template.fields.find((f) => f.key === key);
    if (!field) return whole;
    const raw = (values[key] ?? "").trim();
    if (!raw) return `[${field.label}]`;
    if (field.type === "date") return longDate(raw);
    if (field.type === "time") return clockTime(raw);
    if (field.type === "number") return grouped(raw);
    return raw;
  });
}
