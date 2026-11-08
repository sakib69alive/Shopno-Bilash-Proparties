---
name: feedback-financial-calc-conventions
description: "Money/accounting calculations in this app must derive from real transaction status and adjustments at read time — never sum raw amounts regardless of status, never store a total separately from its source"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5bcf6674-e22e-4a75-82bd-572e56a6a091
  modified: 2026-09-14T14:18:09.425Z
---

The user is explicit and emphatic that financial calculations must be correct because errors cause real financial loss to the company or to individual owners ("eta to company er hisab so bhul thakle... company er loss"). A deep audit on 2026-09-14 (commit `2e87383`) found and fixed several real bugs, all of the same shape:

1. **Status filtering was inconsistent.** Some totals (sales dashboards) correctly excluded cancelled/non-final records; others (construction actual-cost, project actual-cost, the Reports summary) summed every expense/contractor-payment regardless of status (draft/pending/rejected counted the same as verified). Fixed via one shared predicate, `src/lib/transactionStatus.ts`'s `countsTowardActualCost()` (true for `undefined`/`verified`/`completed`), applied everywhere actual cost is computed.
2. **Adjustments were dropped in aggregate totals** even though the per-record calculation (`computeContributionState()`) already included them — `Total Payable` summed the raw `payableAmount` instead of `state.effectivePayable`, so `Payable − Paid` silently stopped equaling `Outstanding` the moment any owner had a waiver/discount/correction on file. Same bug existed independently in two places (`features/reports/ownerContributions.ts` and `app/admin/projects/[id]/owners/page.tsx`) — both had reimplemented the aggregation instead of sharing it.
3. **A manually-typed field can shadow a live-computed one with the same name.** `ProjectBudget.actual` is free-hand admin input, while `computeProjectActualCost()`/`computePhaseActualCost()` compute the real figure from actual Purchases+Expenses+ContractorPayments. Both were labeled just "Actual" in different admin screens. Resolved by relabeling (not removing) the manual field to "Actual (Manual)" with a pointer to the live number, since removing it outright wasn't scoped/verified as safe.

**Why**: This codebase already has an established "derive at read time, never cache/store a total" convention (`computeContributionState()`, `computeInstallmentObligationState()`) — these bugs were places that convention wasn't followed consistently, not a design flaw in the convention itself.

**How to apply**: Whenever adding or touching a financial total/aggregate in Admin, (a) filter transaction records through `countsTowardActualCost()` (or the equivalent already-established status filter for that record type — check `dashboardData.ts`/`salesReports.ts`/`workspaceStats.ts` for the sales-side pattern) before summing, (b) use a record's already-computed effective/adjusted value (e.g. `state.effectivePayable`) rather than its raw stored field whenever a "state" computation exists for it, and (c) if two numbers claiming to represent the same real-world quantity exist in different places, treat that as a bug to flag even if not asked — this user reads that kind of drift as a serious risk, not a cosmetic issue.
