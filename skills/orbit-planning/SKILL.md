---
name: orbit-planning
description: Use when you have a spec or requirements for a multi-step task, before touching code
license: MIT
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the orbit-planning skill to create the implementation plan."

**Context:** If working in an isolated worktree, it should already exist before execution starts.

**Save plans to:** `.orbit/changes/<name>/plan.md`
- (User preferences for plan location override this default)

## Change-Type Adaptation

Read `change_type` from `.orbit/state.yaml` before writing the plan. Default to `feature` if absent.

| change_type | Planning emphasis |
|-------------|-------------------|
| `feature` | Full implementation plan with architecture, APIs/UI/data changes, tests, docs |
| `bugfix` | Minimal fix plan: reproduce, regression test, root-cause fix, failure-state handling, verification |
| `refactor` | Safe migration plan: characterization tests, small transformations, behavior-preservation checks |
| `docs` | Documentation checklist: affected docs, examples/commands/links to verify, language sync |
| `workflow` | Process/tooling plan: skill/script/docs changes, state compatibility, package/install/update/uninstall safety |

Lightweight types may have fewer tasks and shorter sections, but still write `plan.md`. Do not jump directly to Build execution without a persistent plan.

## Scope Check

If the spec covers multiple independent subsystems, it should have been broken into sub-project specs during brainstorming. If it wasn't, suggest breaking this into separate plans — one per subsystem. Each plan should produce working, testable software on its own.

## File Structure

Before defining tasks, map out which files will be created or modified and what each one is responsible for. This is where decomposition decisions get locked in.

- Design units with clear boundaries and well-defined interfaces. Each file should have one clear responsibility.
- You reason best about code you can hold in context at once, and your edits are more reliable when files are focused. Prefer smaller, focused files over large ones that do too much.
- Files that change together should live together. Split by responsibility, not by technical layer.
- In existing codebases, follow established patterns. If the codebase uses large files, don't unilaterally restructure - but if a file you're modifying has grown unwieldy, including a split in the plan is reasonable.

This structure informs the task decomposition. Each task should produce self-contained changes that make sense independently.

## Task Right-Sizing

A task is the smallest unit that carries its own test cycle and is worth a
fresh reviewer's gate. When drawing task boundaries: fold setup,
configuration, scaffolding, and documentation steps into the task whose
deliverable needs them; split only where a reviewer could meaningfully
reject one task while approving its neighbor. Each task ends with an
independently testable deliverable.

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

**Change Type:** [feature | bugfix | refactor | docs | workflow]

> **For agentic workers:** REQUIRED SUB-SKILL: Use orbit-subagent-dev (recommended) or orbit-executing to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

## Global Constraints

[The spec's project-wide requirements — version floors, dependency limits,
naming and copy rules, platform requirements — one line each, with exact
values copied verbatim from the spec. Every task's requirements implicitly
include this section.]

---
```

## Type-Specific Task Patterns

Use these patterns to shape tasks:

- `feature`: build vertical slices that deliver user-visible behavior with tests.
- `bugfix`: include a reproduction/regression step before the fix, then verify the original bug no longer reproduces.
- `refactor`: start with characterization tests or explicit behavior checks, then migrate in reversible steps.
- `docs`: group by reader-facing deliverable; include command/link/example verification.
- `workflow`: group by skill/script/package surface; include compatibility and stale-reference checks.

## Task Structure

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Interfaces:**
- Consumes: [what this task uses from earlier tasks — exact signatures]
- Produces: [what later tasks rely on — exact function names, parameter
  and return types. A task's implementer sees only their own task; this
  block is how they learn the names and types neighboring tasks use.]

- [ ] **Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

- [ ] **Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

(Note: git operations are handled by the Build controller, not task implementers)
````

## No Placeholders

Every step must contain the actual content an engineer needs. These are **plan failures** — never write them:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above" (without actual test code)
- "Similar to Task N" (repeat the code — the engineer may be reading tasks out of order)
- Steps that describe what to do without showing how (code blocks required for code steps)
- References to types, functions, or methods not defined in any task

## Remember
- Exact file paths always
- Complete code in every step — if a step changes code, show the code
- Exact commands with expected output
- DRY, YAGNI, TDD (git operations handled by controller)
- For `bugfix`, the plan is not complete unless it names the original failure and the verification that proves it is fixed
- For `refactor`, the plan is not complete unless it names behavior-preservation checks
- For `docs`, the plan is not complete unless it names command/link/example checks where applicable
- For `workflow`, the plan is not complete unless it names state/skill/script consistency checks

## Self-Review

After writing the complete plan, look at the spec with fresh eyes and check the plan against it. This is a checklist you run yourself — not a subagent dispatch.

**1. Spec coverage:** Skim each section/requirement in the spec. Can you point to a task that implements it? List any gaps.

**2. Placeholder scan:** Search your plan for red flags — any of the patterns from the "No Placeholders" section above. Fix them.

**3. Type consistency:** Do the types, method signatures, and property names you used in later tasks match what you defined in earlier tasks? A function called `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 is a bug.

If you find issues, fix them inline. No need to re-review — just fix and move on. If you find a spec requirement with no task, add the task.

## State Update

After saving the plan, update the state:

```bash
# Update plan hash (will link to brainstorming hash)
node skills/orbit/scripts/orbit-update-hash.js plan .orbit/changes/<change-name>/plan.md
```

This ensures the plan is tracked with proper hash lineage.

## Execution Handoff

After saving the plan, offer execution choice:

**"Plan complete and saved to `.orbit/changes/<name>/plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using orbit-executing, batch execution with checkpoints

**Which approach?"**

**If Subagent-Driven chosen:**
- **REQUIRED SUB-SKILL:** Use orbit-subagent-dev
- Fresh subagent per task + two-stage review

**If Inline Execution chosen:**
- **REQUIRED SUB-SKILL:** Use orbit-executing
- Batch execution with checkpoints for review
