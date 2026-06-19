---
name: orbit-executing
description: Use when orbit-build selects inline execution for a small or tightly coupled implementation plan
source: Adapted from Superpowers executing-plans (MIT License)
license: MIT
---

# Executing Plans

## Overview

Load plan, review critically, execute all tasks, report when complete.

**Announce at start:** "I'm using orbit-executing to implement this plan."

**Execution-only role:** orbit-executing performs Build tasks for orbit-build, but it does not own the Orbit phase transition. It must return a final Build result to orbit-build, which decides whether to advance `.orbit/state.yaml` from `build` to `review`.

**Orbit skill preference:** When Orbit provides a suitable skill, prefer the Orbit namespaced skill. Use generic skills only when no suitable `orbit-*` skill exists or the Orbit skill is unavailable.

**Execution artifact root:** Store progress, task reports, and Build notes under:

```text
.orbit/changes/<change-name>/execution/
```

Do not use `plan.md` as the execution ledger.

**Selection note:** If orbit-build has already selected orbit-executing for a small or tightly coupled plan, follow that choice. Prefer orbit-subagent-dev only when you are choosing an execution strategy outside orbit-build and subagent support is available.

## The Process

### Step 1: Load and Review Plan
1. Read plan file
2. Review critically - identify any questions or concerns about the plan
3. If concerns: Raise them with your human partner before starting
4. If no concerns: Create todos for the plan items and proceed

### Step 2: Execute Tasks

For each task:
1. Mark as in_progress in the execution ledger under `.orbit/changes/<change-name>/execution/`
2. Follow each step exactly (plan has bite-sized steps)
3. Run verifications as specified
4. Write task-specific notes/reports into the same `execution/` directory
5. Mark as completed in the execution ledger

### Step 3: Return Build Result

After all tasks complete and verification passes:
- Write or update `build-summary.md` in the active change's `execution/` directory
- Return one of these final Build results to orbit-build:
  - `COMPLETE`
  - `COMPLETE_WITH_CONCERNS`
  - `BLOCKED`
- Do **not** update `.orbit/state.yaml` yourself
- Do **not** mark plan checkboxes or append completion notes to `plan.md`

orbit-build will use your execution artifacts to decide whether to advance the workflow to the Review phase.

## When to Stop and Ask for Help

**STOP executing immediately when:**
- Hit a blocker (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly

**Ask for clarification rather than guessing.**

## When to Revisit Earlier Steps

**Return to Review (Step 1) when:**
- Partner updates the plan based on your feedback
- Fundamental approach needs rethinking

**Don't force through blockers** - stop and ask.

## Remember
- Review plan critically first
- Follow plan steps exactly
- Don't skip verifications
- Reference Orbit skills when Orbit provides the matching capability
- Stop when blocked, don't guess
- Never start implementation on main/master branch without explicit user consent
- Do not treat `plan.md` as the completion ledger
- When tasks are done, return the Build result to orbit-build instead of finalizing the whole branch yourself

## Integration

**Required workflow skills:**
- **orbit-planning** - Creates the plan this skill executes
- **orbit-build** - Owns the Build phase and advances Orbit state after execution completes

**Preferred supporting skills:**
- **orbit-tdd** - Use for TDD when Orbit provides the needed guidance
- **orbit-verify** - Use for verification when Orbit provides the needed guidance

**Alternative workflow:**
- **orbit-subagent-dev** - Preferred when subagents are available or tasks are mostly independent
