---
name: feedback-security-tradeoffs-owner-vs-admin
description: "The user accepts weaker auth on the Owner Portal for usability (non-technical users), but wants Admin Panel security kept at maximum priority — don't conflate the two"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5bcf6674-e22e-4a75-82bd-572e56a6a091
  modified: 2026-09-15T07:19:27.450Z
---

On 2026-09-15 the user asked to make the Property Owner portal's PIN optional (admin-toggleable) after real customer complaints that non-technical owners struggle to use a PIN. I pushed back first, explaining the real risk (anyone who knows an owner's phone number could see that owner's private financial/ownership data with the PIN off). The user heard the risk and made an informed, explicit call anyway: "eto boro big deal na... tumi strong rakho admin portal tai karon eta to hisab nikash er bhitor thake ejonno etar security er priority beshi" (not that big a deal [for owners] — keep the Admin Portal strong, since that's where the accounting lives, so its security priority is higher).

**Why**: The business's real risk model isn't "maximize security everywhere" — it's "Admin (real accounting, company control) must stay hard to breach; Owner Portal (one person's own read-mostly view of their own unit) can trade some security for usability, since the realistic worst case is a neighbor seeing payment info, not company-wide damage." This is a considered, explicit tradeoff from the site owner, not an oversight — implemented as `CompanySettings.requireOwnerPin` (`src/types/settings.ts`), defaulting to required/`true` so nothing changes until the admin deliberately opts in, and scoped so it can *only* ever affect `identifyOwnerAction`'s phone+PIN flow (`src/lib/auth/ownerActions.ts`) — Staff/Admin login (`src/lib/auth/actions.ts`) never reads this setting.

**How to apply**: When a future request touches Owner/Customer/Shareholder/Landowner Portal auth or access convenience, it's reasonable to propose usability-over-security tradeoffs *if flagged clearly first* — this user will often accept them once the risk is spelled out plainly, especially for portal-side friction. When a request touches Admin/Staff login, security-sensitive Finance calculations, or anything that could let someone reach Admin control, treat that bar as fixed and high — do not extend the same "usability wins" reasoning there. Always ask/flag before silently weakening any auth boundary; this user wants to make that call knowingly, not have it made for them.
