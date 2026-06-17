---
name: orbit-build
description: Phase 3 - Build implementation with subagent-driven or inline execution
license: MIT
---

# Phase 3: Build

Execute the implementation plan using either subagent-driven development (complex tasks) or inline execution (simple tasks).

**Announce at start:** "I'm using orbit-build to implement the plan."

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
- **≥ 3 tasks** → Use subagent-driven development (parallel execution)
- **≤ 2 tasks** → Use inline execution (sequential in current session)

---

## Option 1: Subagent-Driven Development (≥3 tasks)

**Invoke orbit-subagent-dev skill** (which is a wrapper around the original subagent-driven-development).

This will:
1. Spawn one subagent per task
2. Execute tasks in parallel
3. Review after each task
4. Fix issues before proceeding

---

## Option 2: Inline Execution (≤2 tasks)

**Invoke orbit-executing skill** (which is a wrapper around the original executing-plans).

This will:
1. Execute tasks sequentially
2. Checkpoint at natural breaks
3. Get user review at checkpoints

---

## After Implementation Completes

Update state:

```bash
# Transition to review phase
sed -i 's/^phase:.*/phase: review/' .orbit/state.yaml
```

Announce:

```
## Build Complete ✓

Implementation finished.

**Next:** Review phase

Ready to review? Call `/orbit` or `/orbit-review`
```

---

## Notes

- This is a meta-skill that dispatches to actual execution skills
- The actual implementation logic is in orbit-subagent-dev or orbit-executing
- TDD approach can be used via orbit-tdd (optional)
