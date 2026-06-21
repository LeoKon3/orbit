# Implementer Subagent Prompt Template

Use this template when dispatching one task implementer.

**IMPORTANT:** Before filling this template, run the task-brief and task-report-path scripts to obtain correct file paths:

```bash
BRIEF_PATH=$(node skills/orbit-subagent-dev/scripts/task-brief.js plan.md TASK_NUMBER)
REPORT_PATH=$(node skills/orbit-subagent-dev/scripts/task-report-path.js TASK_NUMBER)
```

Then fill the template with these paths (not `/tmp` or other ad-hoc locations).

```text
You are implementing Task <N> for <project/change name>.

Read this first — it is your requirements, with exact values to use verbatim:
<BRIEF_PATH from task-brief.js>

**IMPORTANT - NO GIT COMMITS:**
- Do NOT run `git commit` or `git add` commands
- Only implement the code and test it
- The controller will handle all git operations
- If your instinct is to commit, write to your report instead

**IMPORTANT - SEQUENTIAL TOOL EXECUTION:**
- Run heavy tools sequentially, not in parallel
- Example: run `npm install`, then `tsc`, then `npm test` — not all at once
- This prevents file system overload, especially in WSL environments
- Small delays (1-2s) between build/verify steps improve stability

Project constraints:
- Change type: <feature|bugfix|refactor|docs|workflow>. Preserve this emphasis in implementation and verification.
- Work directly in <repo-root> on the current working tree unless the user explicitly requested a worktree.
- Check git status before editing to understand current changes.
- Preserve existing user changes and avoid unrelated files.
- Follow the repository's existing style.
- Follow TDD for behavior changes: write/adjust a test first and watch it fail when practical.
- You are working inside an Orbit workflow: prefer `orbit-*` skills when they cover the current job.
- Prefer `orbit-tdd` for TDD and `orbit-verify` for verification; fall back to generic skills only if no suitable Orbit skill exists.
- For `bugfix`, preserve the reproduction/root-cause/regression proof requested by the task brief.
- For `refactor`, preserve external behavior and report the behavior checks you ran.
- For `docs`, verify changed commands, links, examples, and language consistency where relevant.
- For `workflow`, verify skill references, script paths, state transitions, and packaging boundaries.
- Do not invoke Orbit phase-transition skills such as `/orbit-explore`, `/orbit-brainstorming`, `/orbit-planning`, or `/orbit-archive` from task implementation.
- Do not mutate `.orbit/state.yaml`, and do not rewrite `proposal.md`, `spec.md`, `brainstorming.md`, or `plan.md` as task bookkeeping.
- Write task artifacts into the active change's `.orbit/changes/<change-name>/execution/` directory as directed by the controller.

Context:
- <interfaces, files, or decisions this task needs that are not in the brief>

Report contract:
Write your full report to <REPORT_PATH from task-report-path.js>. Include:
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
