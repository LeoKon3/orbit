---
name: orbit-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
license: MIT
---

# Requesting Code Review

Dispatch a code reviewer subagent to catch issues before they cascade. The reviewer gets precisely crafted context for evaluation — never your session's history. This keeps the reviewer focused on the work product, not your thought process, and preserves your own context for continued work.

**Core principle:** Review early, review often.

## Change-Type Review Checklist

Read `change_type` from `.orbit/state.yaml` and include the relevant checklist in `review.md`:

| change_type | Review must verify |
|-------------|--------------------|
| `feature` | Requirements implemented, acceptance criteria met, edge cases handled, tests cover core paths |
| `bugfix` | Original bug was reproduced or otherwise evidenced, fix addresses root cause, original bug no longer reproduces, regression coverage exists or omission is justified |
| `refactor` | External behavior preserved, tests/characterization checks pass, complexity or structure improved without scope creep |
| `docs` | Commands/examples are accurate, links/paths exist, language versions are consistent where applicable |
| `workflow` | Skill references exist, phase/state transitions remain consistent, scripts work, package/install/update/uninstall boundaries are safe |

For `bugfix`, do not mark review passed unless the review records how the original failure was verified fixed.

## When to Request Review

**Mandatory:**
- After each task in subagent-driven development
- After completing major feature
- Before merge to main

**Optional but valuable:**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing complex bug
- Whenever `change_type=bugfix`, to confirm the original failure no longer reproduces

## How to Request

**1. Get git SHAs:**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

**2. Dispatch code reviewer subagent:**

Dispatch a `general-purpose` subagent, filling the template at [code-reviewer.md](code-reviewer.md)

**Placeholders:**
- `{DESCRIPTION}` - Brief summary of what you built
- `{PLAN_OR_REQUIREMENTS}` - What it should do
- `{BASE_SHA}` - Starting commit
- `{HEAD_SHA}` - Ending commit

**3. Act on feedback:**
- Fix Critical issues immediately
- Fix Important issues before proceeding
- Note Minor issues for later
- Push back if reviewer is wrong (with reasoning)

## Example

```
[Just completed Task 2: Add verification function]

You: Let me request code review before proceeding.

BASE_SHA=<base commit before this task>
HEAD_SHA=<current commit, or omit HEAD to review the working tree>

[Dispatch code reviewer subagent]
  DESCRIPTION: Added verifyIndex() and repairIndex() with 4 issue types
  PLAN_OR_REQUIREMENTS: Task 2 from .orbit/changes/<name>/deployment-plan.md
  BASE_SHA: a7981ec
  HEAD_SHA: 3df7661

[Subagent returns]:
  Strengths: Clean architecture, real tests
  Issues:
    Important: Missing progress indicators
    Minor: Magic number (100) for reporting interval
  Assessment: Ready to proceed

You: [Fix progress indicators]
[Continue to Task 3]
```

## Integration with Workflows

**Subagent-Driven Development:**
- Review after EACH task
- Catch issues before they compound
- Fix before moving to next task

**orbit-executing:**
- Review after each task or at natural checkpoints
- Get feedback, apply, continue

**Ad-Hoc Development:**
- Review before merge
- Review when stuck

## Red Flags

**Never:**
- Skip review because "it's simple"
- Ignore Critical issues
- Proceed with unfixed Important issues
- Argue with valid technical feedback

**If reviewer wrong:**
- Push back with technical reasoning
- Show code/tests that prove it works
- Request clarification

See template at: [code-reviewer.md](code-reviewer.md)

## After Review Complete

Once review passes with no critical or important issues:

```bash
# Update review document hash
node skills/orbit/scripts/orbit-update-hash.js review .orbit/changes/<change-name>/review.md

# Check if can transition to archive
node skills/orbit/scripts/orbit-phase-guard.js archive
```

If the guard passes, update `.orbit/state.yaml` by setting `phase: archive`.

Announce: "Review passed! Ready to archive with `/orbit`"
