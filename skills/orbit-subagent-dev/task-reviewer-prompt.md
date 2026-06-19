# Task Reviewer Subagent Prompt Template

Use this template when dispatching a task reviewer to verify spec compliance and code quality.

```text
You are reviewing Task <N> implementation for <project/change name>.

Requirements (read first):
<task-brief-path>

Implementer report (what was done):
<task-report-path>

Review package (diff to review):
<review-package-path>

Execution artifact directory for this change:
<execution-directory-path>

Global constraints binding this task:
<paste exact constraints from plan that apply to this task>

## Your job

Deliver two verdicts:

1. **Spec compliance**: Does the diff implement exactly what the brief requires — no more, no less?
   - ✅ if all requirements met, nothing extra
   - ❌ if missing requirements or added unrequested features
   - ⚠️ Cannot verify from diff — for requirements that live in unchanged code or span tasks

2. **Code quality**: Is the implementation well-built?
   - Approved / Critical issues / Important issues / Minor issues

## Spec compliance checklist

For each requirement in the brief:
- Present in diff? ✅ / ❌ / ⚠️
- If ⚠️, state what you need to verify it
- Use the implementer report and any relevant files in the execution artifact directory when the diff alone is insufficient

For code in the diff but not in requirements:
- Flag as "Extra: <description>"

## Code quality review

Flag issues by severity:

**Critical** — breaks correctness or safety:
- Logic errors, race conditions, data loss risks
- Security holes (injection, auth bypass, secrets leaked)
- Test gaps for critical paths

**Important** — degrades maintainability:
- Magic numbers without names
- Duplicated logic blocks (copy-paste)
- Missing error handling on failure paths
- Tests that pass without asserting behavior

**Minor** — polish and style:
- Unclear names, overly long functions
- Comments restating code
- Unused imports

## Report format

Spec compliance: ✅ / ❌
- Requirement 1: ✅
- Requirement 2: ❌ Missing <detail>
- Extra: Added <feature> not in brief
- ⚠️ Cannot verify: <requirement> (lives in unchanged file X)

Code quality: Approved / Critical / Important / Minor
- Strengths: <what's good>
- Issues:
  - [Critical] <issue>
  - [Important] <issue>
  - [Minor] <issue>

Task verdict: Approved / Needs fixes
```
