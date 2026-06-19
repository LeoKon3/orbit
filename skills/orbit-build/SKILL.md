---
name: orbit-build
description: Phase 3 - Build implementation with subagent-driven or inline execution
license: MIT
---

# Phase 3: Build

Execute the implementation plan using either subagent-driven development (complex tasks) or inline execution (simple tasks).

**Announce at start:** "I'm using orbit-build to implement the plan."

**Build owner:** orbit-build is the owner of the Build phase. Execution skills perform the task work, but orbit-build decides whether Build is complete and is the only skill that advances `.orbit/state.yaml` from `phase: build` to `phase: review`.

**Orbit skill preference:** When Orbit provides a skill for the current job, prefer the Orbit namespaced skill. Use generic skills only as fallback when no suitable `orbit-*` skill exists or an Orbit skill is unavailable.

---

## Prerequisites

Check that plan.md exists:

```bash
CHANGE_NAME=$(grep "current_change:" .orbit/state.yaml | cut -d' ' -f2)

if [ ! -f ".orbit/changes/$CHANGE_NAME/plan.md" ]; then
  echo "ERROR: No plan found. Run /orbit-planning first."
  exit 1
fi
```

---

## Sync Check

Before starting implementation, check if documents are stale:

```bash
bash skills/orbit/scripts/orbit-sync-detect.sh

if [ $? -eq 1 ]; then
  echo "⚠️  Documents out of sync. Running sync first..."
  # Automatically trigger orbit-sync
  # After sync completes, continue with build
fi
```

---

## Determine Execution Strategy

Read the plan and count tasks:

```bash
CHANGE_NAME=$(grep "current_change:" .orbit/state.yaml | cut -d' ' -f2)
PLAN_FILE=".orbit/changes/$CHANGE_NAME/plan.md"

TASK_COUNT=$(grep -c "^### Task" "$PLAN_FILE" || echo 0)

echo "Plan has $TASK_COUNT tasks"
```

**Decision:**
- **≥ 3 tasks** → Use subagent-driven development (same-session controller + subagents)
- **≤ 2 tasks** → Use inline execution (single executor in the current session)

Both execution paths must return control to orbit-build for final Build bookkeeping.

---

## Shared Execution Contract

Regardless of which execution skill you choose:

- `plan.md` is the execution plan, not the completion ledger.
- Do **not** mark plan checkboxes complete or append execution notes to `plan.md` unless the plan explicitly says it is a live checklist.
- Store execution artifacts under:

```text
.orbit/changes/<change-name>/execution/
```

Expected artifacts include:
- `progress.md` — task completion ledger
- `build-summary.md` — Build-phase completion notes / concerns
- `task-N-brief.md` — extracted task brief for task N
- `task-N-report.md` — implementer report for task N
- `review-<base>-<head>.md` — task review package(s)

Execution skills must finish by returning a Build result to orbit-build with one of these meanings:
- **COMPLETE** — all planned tasks finished and verification passed
- **COMPLETE_WITH_CONCERNS** — tasks finished, but concerns should be carried into review
- **BLOCKED** — Build cannot continue; orbit-build must not advance the phase

orbit-build is responsible for reading the execution artifacts, summarizing concerns, and deciding whether to advance the workflow.

---

## Option 1: Subagent-Driven Development (≥3 tasks)

**Invoke orbit-subagent-dev skill**.

This path should:
1. Dispatch one implementer subagent per task
2. Review each task before marking it complete
3. Write progress and reports into the change's `execution/` directory
4. Return `COMPLETE`, `COMPLETE_WITH_CONCERNS`, or `BLOCKED` back to orbit-build

---

## Option 2: Inline Execution (≤2 tasks)

**Invoke orbit-executing skill**.

This path should:
1. Execute tasks sequentially in the current session
2. Write progress and reports into the change's `execution/` directory
3. Return `COMPLETE`, `COMPLETE_WITH_CONCERNS`, or `BLOCKED` back to orbit-build

---

## After Execution Skill Returns

When the chosen execution skill finishes:

1. Read the execution artifacts from `.orbit/changes/$CHANGE_NAME/execution/`
2. Confirm the execution result:
   - `COMPLETE` → continue Build finalization
   - `COMPLETE_WITH_CONCERNS` → continue Build finalization and surface concerns
   - `BLOCKED` → stop, keep `phase: build`, and tell the user what is blocked
3. Do not mutate `plan.md` for completion bookkeeping
4. Write/update `build-summary.md` if a Build summary is needed
5. If Build is complete, update the Orbit state:

```bash
sed -i 's/^phase:.*/phase: review/' .orbit/state.yaml
```

6. Announce completion:

```text
## Build Complete ✓

Implementation finished.

**Next:** Review phase

Run `/orbit` or `/orbit-review` to continue.
```

Do **not** automatically start the review phase in the same turn. Build ends after the state is advanced and the next step is announced.

---

## Notes

- orbit-build is a meta-skill that dispatches to execution skills, then performs the final Build-phase bookkeeping
- The actual implementation logic is in orbit-subagent-dev or orbit-executing
- Prefer Orbit skills such as `orbit-tdd` and `orbit-verify` when execution needs those capabilities; use generic skills only as fallback
