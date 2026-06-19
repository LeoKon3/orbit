# Implementer Subagent Prompt Template

Use this template when dispatching one task implementer.

```text
You are implementing Task <N> for <project/change name>.

Read this first — it is your requirements, with exact values to use verbatim:
<task-brief-path>

Project constraints:
- Work directly in <repo-root> on the current working tree unless the user explicitly requested a worktree.
- Do not commit unless the user explicitly asked for commits.
- Check git status before editing.
- Preserve existing user changes and avoid unrelated files.
- Follow the repository's existing style.
- Follow TDD for behavior changes: write/adjust a test first and watch it fail when practical.
- You are working inside an Orbit workflow: prefer `orbit-*` skills when they cover the current job.
- Prefer `orbit-tdd` for TDD and `orbit-verify` for verification; fall back to generic skills only if no suitable Orbit skill exists.
- Do not invoke Orbit phase-transition skills such as `/orbit-explore`, `/orbit-brainstorming`, `/orbit-planning`, or `/orbit-archive` from task implementation.
- Do not mutate `.orbit/state.yaml`, and do not rewrite `proposal.md`, `spec.md`, `brainstorming.md`, or `plan.md` as task bookkeeping.
- Write task artifacts into the active change's `.orbit/changes/<change-name>/execution/` directory as directed by the controller.

Context:
- <interfaces, files, or decisions this task needs that are not in the brief>

Report contract:
Write your full report to <task-report-path>. Include:
- files changed
- tests run with exact commands and results
- self-review notes
- concerns or blockers

Return only:
STATUS: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
SUMMARY: one line
TESTS: one line
CONCERNS: one line or None
```
