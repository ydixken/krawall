# Implementation Plan: Guide Scenario Builder + Fresh Install Flow

## Overview

Two features that improve the onboarding experience:

1. **Guide Scenario Builder**: Replace the simplified scenario step in the guide with the full FlowBuilder (building blocks: message, delay, conditional, loop) + error handling — matching the full scenario builder at `/scenarios/new`.
2. **Fresh Install Detection**: Ensure a clean DB start lands the user on the guide at Step 1 (Welcome). Fix seed data behavior, wizard state staleness after DB reset, and add auto-redirect for first-time users.

---

## Feature 1: Guide Scenario Builder

### Context

The current guide scenario step (`components/guide/steps/step-scenario.tsx`) has a **simplified** "create from scratch" mode that only supports a flat list of text messages. The full scenario builder (`app/(dashboard)/scenarios/new/page.tsx`) uses the `FlowBuilder` component with 4 building block types (message, delay, conditional, loop), drag-and-drop reordering, variable picker, error handling config, and more. The guide step needs to match this capability while keeping the structured 3-sub-step layout (Choose → Customize → Review) that the target step uses.

### Critical Files

| File                                          | Role                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `components/guide/steps/step-scenario.tsx`    | **PRIMARY** — rewrite the Customize sub-step                                                      |
| `components/scenarios/FlowBuilder.tsx`        | **REUSE** — import and embed directly                                                             |
| `app/(dashboard)/scenarios/new/page.tsx`      | **REFERENCE** — see how FlowBuilder is integrated with metadata sidebar + error handling           |
| `lib/scenarios/templates.ts`                  | **REUSE** — `ScenarioTemplate` type + `SCENARIO_TEMPLATES` array + `convertTemplateFlow` pattern  |
| `components/guide/steps/step-target.tsx`      | **REFERENCE** — for the structured 3-sub-step layout pattern                                      |

### Subtask 1.1: Import FlowBuilder into Guide Scenario Step

**File:** `components/guide/steps/step-scenario.tsx`

- Add import: `import FlowBuilder, { FlowStep } from "@/components/scenarios/FlowBuilder";`
- Add a `flowBuilderKey` state (number) to force re-render when template changes (see `new/page.tsx` line 123)
- Add `flowSteps` state (`FlowStep[]`) to hold the current builder state
- Reuse the `convertTemplateFlow()` helper from `new/page.tsx` (lines 67-111) — either extract into a shared util or copy into the guide step

### Subtask 1.2: Rewrite the "Customize" Sub-Step

**File:** `components/guide/steps/step-scenario.tsx`

Replace the current Customize sub-step content (lines 352-476) with a layout that mirrors the full scenario builder:

**Left sidebar panel (w-64):**

- Scenario Name (Input, required)
- Description (Textarea)
- Category dropdown (reuse CATEGORIES from `new/page.tsx`)
- Verbosity Level dropdown (reuse VERBOSITY_LEVELS from `new/page.tsx`)
- Execution Settings section:
  - Repetitions (number input, 1-1000)
  - Concurrency (number input, 1-100)
  - Delay Between Messages (number input, 0-60000ms)
- Error Handling section:
  - On Error dropdown (skip / abort / retry)
  - Conditional retry config fields (maxRetries, delayMs, backoffMultiplier) shown when `onError === "retry"`
  - Status Code Rules (add/remove rules, each with codes input, action dropdown, conditional retry config)

**Main content area (flex-1):**

- The `FlowBuilder` component with `key={flowBuilderKey}`, `initialSteps={flowSteps}`, `onChange={setFlowSteps}`
- When in template mode (not scratch), pre-populate FlowBuilder with converted template steps

**Remove** the old scratch mode (flat message list) entirely — the FlowBuilder replaces it. The "Create from Scratch" button should now just navigate to Customize with an empty FlowBuilder.

### Subtask 1.3: Update Template Application Logic

**File:** `components/guide/steps/step-scenario.tsx`

When a template is selected and user clicks Continue:

1. Convert `template.flowConfig` to `FlowStep[]` using `convertTemplateFlow()`
2. Set `flowSteps` state with converted steps
3. Increment `flowBuilderKey` to force FlowBuilder re-render
4. Pre-fill sidebar fields (name, description, category, repetitions, concurrency, delay, verbosity)

When "Create from Scratch" is clicked:

1. Clear `flowSteps` to `[]`
2. Increment `flowBuilderKey`
3. Set default form values (name: "Custom Scenario", description: "")
4. Navigate to Customize sub-step

### Subtask 1.4: Update Scenario Creation Payload

**File:** `components/guide/steps/step-scenario.tsx`

Update `createScenario()` to include:

- `errorHandling` object with `onError`, `retryConfig`, and `statusCodeRules` (same structure as `new/page.tsx` lines 215-233)
- `category` from dropdown (instead of hardcoded "guide")
- `verbosityLevel` from dropdown
- `flowConfig` from FlowBuilder's `flowSteps` state (wrapped with `buildFlowConfig()` to add `next` pointers — see `new/page.tsx` lines 194-199)

Remove the old `scratchMode` / `scratchMessages` logic entirely.

### Subtask 1.5: Update the Review Sub-Step

**File:** `components/guide/steps/step-scenario.tsx`

Update the Review & Create sub-step to show:

- Summary card: Name, Category, Steps count, Repetitions, Concurrency, Error handling strategy
- Full JSON payload preview (already exists via `JsonPreview`)
- Update payload construction to include error handling and all new fields

### Subtask 1.6: Add Error Handling State

**File:** `components/guide/steps/step-scenario.tsx`

Add state variables (same as `new/page.tsx` lines 137-141):

```typescript
const [onError, setOnError] = useState<"skip" | "abort" | "retry">("skip");
const [retryMaxRetries, setRetryMaxRetries] = useState(3);
const [retryDelayMs, setRetryDelayMs] = useState(1000);
const [retryBackoffMultiplier, setRetryBackoffMultiplier] = useState(1.5);
const [statusCodeRules, setStatusCodeRules] = useState<StatusCodeRule[]>([]);
```

Also add the `StatusCodeRule` interface and the `convertTemplateFlow` / `buildFlowConfig` helper functions.

---

## Feature 2: Fresh Install Detection & Guide Auto-Start

### Context

**Problem 1 — Seed data pollutes fresh state:** `prisma/seed.ts` creates 1 target + 4 scenarios. After `db:seed`, the dashboard sees existing data and doesn't show the "New here?" CTA. The user expects a clean guide experience on first start.

**Problem 2 — Stale localStorage after DB reset:** After running `prisma migrate reset` or dropping the DB, localStorage still has the old wizard state (`currentStep > 0`, `completedSteps` filled). The guide opens in the middle instead of at Welcome. The wizard's resource verification (lines 103-140 of `wizard-context.tsx`) clears `createdTargetId` / `createdScenarioId` if they no longer exist in DB, but does NOT reset `currentStep` or `completedSteps`.

**Problem 3 — No auto-redirect on truly fresh install:** When the DB is empty and localStorage is clean, the user lands on an empty dashboard. They have to manually find and click the Guide link.

### Subtask 2.1: Fix Wizard State Reset on Resource Loss

**File:** `components/guide/wizard-context.tsx`

In the `useEffect` that verifies saved resource IDs (lines 97-141):

After both verifications complete, if **both** `createdTargetId` and `createdScenarioId` were cleared (resources no longer exist in DB), reset the entire wizard state:

```typescript
// After both checks complete:
setState((prev) => {
  // If both resources were cleared, this is likely a DB reset — restart the wizard
  if (!prev.createdTargetId && !prev.createdScenarioId && prev.completedSteps.length > 0) {
    const fresh = { ...defaultState };
    saveState(fresh);
    return fresh;
  }
  return prev;
});
```

This handles the case where a user resets the DB — the guide automatically goes back to Welcome.

### Subtask 2.2: Make Seed Data Optional / Remove from Default Flow

**File:** `prisma/seed.ts`

Two options (implement option A):

**Option A — Gate seed data behind an environment variable:**

- Wrap the scenario/target creation in an `if (process.env.SEED_EXAMPLE_DATA === "true")` check
- On default `db:seed`, only log "No example data seeded. Set SEED_EXAMPLE_DATA=true to seed example data."
- This ensures `task setup` gives a clean start

**Option B — Remove seed data entirely:**

- Comment out or remove the target/scenario creation
- Keep the seed file for future use but leave it as a no-op

### Subtask 2.3: Add Auto-Redirect to Guide on Fresh Install

**File:** `app/(dashboard)/page.tsx` (dashboard page)

The dashboard already checks for empty state (`totalTargets === 0 && totalScenarios === 0`) and shows a CTA. Enhance this:

- When the dashboard detects a fresh install (no targets, no scenarios, AND no localStorage wizard state), auto-redirect to `/guide` using `router.push("/guide")`
- Only redirect once per session — set a sessionStorage flag `krawall-fresh-redirect-done` to prevent redirect loops
- Keep the existing CTA as fallback for users who navigate back to the dashboard

```typescript
useEffect(() => {
  if (
    totalTargets === 0 &&
    totalScenarios === 0 &&
    !sessionStorage.getItem("krawall-fresh-redirect-done")
  ) {
    const wizardState = localStorage.getItem("krawall-guide-v2");
    if (!wizardState || JSON.parse(wizardState).completedSteps?.length === 0) {
      sessionStorage.setItem("krawall-fresh-redirect-done", "true");
      router.push("/guide");
    }
  }
}, [totalTargets, totalScenarios, router]);
```

### Subtask 2.4: Add `completedAt` Field to Wizard State

**File:** `components/guide/wizard-context.tsx`

The dashboard (`page.tsx`) reads `completedAt` from wizard state to determine guide completion, but the field doesn't exist in `WizardState`. Add it:

- Add `completedAt: string | null` to `WizardState` interface (default: `null`)
- In `StepNext` component, when the final step is marked complete, also set `completedAt` to `new Date().toISOString()`
- Update `defaultState` to include `completedAt: null`

**File:** `components/guide/steps/step-next.tsx`

- After `markComplete(currentStep)`, also persist `completedAt` timestamp

This fixes the dashboard's guide completion detection.

---

## Subtask Summary Table

| #   | Subtask                                                                | File(s)                          | Depends On |
| --- | ---------------------------------------------------------------------- | -------------------------------- | ---------- |
| 1.1 | Import FlowBuilder + add state                                        | `step-scenario.tsx`              | —          |
| 1.2 | Rewrite Customize sub-step with sidebar + FlowBuilder                  | `step-scenario.tsx`              | 1.1        |
| 1.3 | Update template application logic                                      | `step-scenario.tsx`              | 1.1        |
| 1.4 | Update scenario creation payload (error handling, category, verbosity) | `step-scenario.tsx`              | 1.2, 1.6   |
| 1.5 | Update Review sub-step with new fields                                 | `step-scenario.tsx`              | 1.4        |
| 1.6 | Add error handling state + UI (onError, retry, status code rules)      | `step-scenario.tsx`              | 1.2        |
| 2.1 | Fix wizard state reset when resources are lost                         | `wizard-context.tsx`             | —          |
| 2.2 | Gate seed data behind env var                                          | `prisma/seed.ts`                 | —          |
| 2.3 | Auto-redirect to /guide on fresh install                               | `app/(dashboard)/page.tsx`       | 2.2        |
| 2.4 | Add completedAt to wizard state + set in StepNext                      | `wizard-context.tsx`, `step-next.tsx` | —     |

---

## Verification

### Feature 1: Guide Scenario Builder

1. Open `/guide`, navigate to Step 5 (Create Scenario)
2. Select a template (e.g., "Branching Conversation") → click Continue → verify FlowBuilder shows converted steps with conditionals/loops
3. Click "Create from Scratch" → verify empty FlowBuilder with step palette (message, delay, conditional, loop)
4. Add blocks: message → delay → loop (with nested messages) → conditional (with then/else branches)
5. Configure error handling in sidebar (set onError to retry, add a 429 status code rule)
6. Click Review → verify JSON preview includes `errorHandling`, `category`, `verbosityLevel`
7. Click Create Scenario → verify success, auto-advance to Execute step
8. Run `task test` and fix any test failures

### Feature 2: Fresh Install

1. Run `prisma migrate reset --force` (resets DB + skips seed by default)
2. Clear localStorage (`localStorage.removeItem("krawall-guide-v2")`)
3. Navigate to `localhost:3000` → should auto-redirect to `/guide` at Step 1 (Welcome)
4. Complete guide through all steps → verify `completedAt` is set
5. Navigate to dashboard → should NOT redirect to guide anymore
6. Reset DB again (without clearing localStorage) → open `/guide` → should reset to Welcome (stale state detection)
7. Run `SEED_EXAMPLE_DATA=true npx prisma db seed` → verify example data is created
8. Run `npx prisma db seed` without env var → verify no example data created

---

## Git Commit Reminders

**CRITICAL: Commit and push after each completed milestone group.**

After completing Feature 1 (subtasks 1.1-1.6):

```bash
git add .
git commit -m "feat: integrate full FlowBuilder into guide scenario step

- Replace flat message list with FlowBuilder (message, delay, conditional, loop blocks)
- Add error handling configuration (onError strategy, retry config, status code rules)
- Add sidebar with category, verbosity, execution settings
- Keep 3-sub-step structure (Choose → Customize → Review)
- Reuse FlowBuilder and convertTemplateFlow from full scenario builder

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push
```

After completing Feature 2 (subtasks 2.1-2.4):

```bash
git add .
git commit -m "feat: fix fresh install guide flow and auto-redirect

- Reset wizard state when DB resources are lost (handles DB reset)
- Gate seed data behind SEED_EXAMPLE_DATA env var for clean first start
- Auto-redirect to /guide on fresh install (no targets, no scenarios)
- Add completedAt timestamp to wizard state for proper completion tracking

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push
```

After all tests pass:

```bash
git add .
git commit -m "test: update tests for guide scenario builder and fresh install flow

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push
```
