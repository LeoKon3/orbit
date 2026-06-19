---
name: orbit-archive
description: Phase 5 - Archive completed change and merge specs to main documentation
license: MIT
---

# Phase 5: Archive

Archive a completed change after review passes. Move change to archive, merge specs to main documentation, and clean up state.

**Announce at start:** "I'm using orbit-archive to finalize and archive this change."

---

## Overview

This is the final phase. The implementation is complete, review has passed, and now we archive the change for historical reference while promoting its specs to the main documentation.

---

## The Process

### Step 1: Verify Prerequisites

```bash
cat .orbit/state.yaml
```

Check:
- `phase: archive` or `phase: review` with review passed
- `current_change` exists
- Review document exists and shows passing status

If prerequisites not met:
```
"Cannot archive yet.

Current phase: [phase]
Review status: [status]

Complete review phase first with /orbit-review"
```

### Step 2: Review Completion Status

Read and check:
- `.orbit/changes/<name>/review.md` - Must show review passed
- `.orbit/changes/<name>/plan.md` - Check for incomplete tasks

**Count tasks:** Read `.orbit/changes/<change-name>/plan.md` and count incomplete `- [ ]` tasks and complete `- [x]` tasks.

If incomplete tasks exist, warn:
```
"Warning: Found $INCOMPLETE incomplete tasks out of $(($COMPLETE + $INCOMPLETE)) total.

Archive anyway? This is permanent."
```

Use AskUserQuestion to confirm.

### Step 3: Show Archive Summary

Present what will happen:

```
## Archive Preview

**Change:** <name>

**Documents to archive:**
- proposal.md
- spec.md
- brainstorming.md
- plan.md
- review.md

**Archive location:** .orbit/archive/YYYY-MM-DD-<name>/

**Main specs to update:**
- Merge spec.md into .orbit/specs/

**This action:**
✓ Moves change directory to archive
✓ Updates main specifications
✓ Clears current_change from state
✓ Preserves all history

Proceed with archive?
```

Wait for user confirmation.

### Step 4: Merge Spec to Main Docs

**Use the spec merger script:**

```bash
# Intelligent merge to main specs for the active change in .orbit/state.yaml
node skills/orbit/scripts/orbit-merge-spec.js

# Script will:
# - Extract topic from spec title
# - Create .orbit/specs/<topic>.md if new
# - Or merge into existing main spec
# - Add change history entry
# - Output new requirements for manual review
```

**Review the merge result:**
- Check `.orbit/specs/<topic>.md` was updated
- Verify new requirements were added to change history
- Manually merge any complex semantic changes the script flagged

### Step 5: Finalize Archive

Use the cross-platform archive finalizer script:

```bash
node skills/orbit/scripts/orbit-archive-change.js
```

The script will:
- Create `.orbit/archive/` if needed
- Fail safely if today's archive path already exists
- Move the active change directory to `.orbit/archive/YYYY-MM-DD-<change-name>/`
- Write `.archive-meta.yaml` with `change_type`
- Clear `.orbit/state.yaml` back to idle
- Create/update `.orbit/archive/INDEX.md`

### Step 6: Announce Completion

```
## Archive Complete ✓

**Change archived:** <name>

**Archive location:** .orbit/archive/YYYY-MM-DD-<name>/

**Main specs updated:** .orbit/specs/<topic>.md

**Documents archived:**
- proposal.md
- spec.md  
- brainstorming.md
- plan.md
- review.md

**State:** Ready for next change

Start a new change with `/orbit-explore`
```

---

## Spec Merging Strategy

### Additive Merge (Most Common)

```
Change spec adds new requirements → Add to main spec

Main spec:          Change spec:        Result:
- Req A             - Req C             - Req A
- Req B                                 - Req B
                                        - Req C (new)
```

### Update Merge

```
Change spec modifies existing requirement → Update in main spec

Main spec:          Change spec:        Result:
- Req A: "simple"   - Req A: "enhanced" - Req A: "enhanced" (updated)
- Req B             - Req B             - Req B
```

### Comprehensive Merge

```
Change spec is complete rewrite → Replace main spec, keep history

Main spec → Archive as .orbit/specs/<topic>.v1.md
Change spec → Becomes new .orbit/specs/<topic>.md
```

### Topic Extraction

Derive topic name from spec title:

```
Spec title: "User Authentication System"
→ Topic: "authentication"
→ Main spec: .orbit/specs/authentication.md

Spec title: "Admin Dashboard - User Management"  
→ Topic: "admin-user-management"
→ Main spec: .orbit/specs/admin-user-management.md
```

---

## Archive Structure

After archiving, structure looks like:

```
.orbit/
├── state.yaml (current_change cleared)
├── specs/
│   └── <topic>.md (updated with change requirements)
├── archive/
│   ├── INDEX.md (list of all archives)
│   └── YYYY-MM-DD-<name>/
│       ├── .archive-meta.yaml
│       ├── proposal.md
│       ├── spec.md
│       ├── brainstorming.md
│       ├── plan.md
│       └── review.md
└── changes/ (empty or has other active changes)
```

---

## Edge Cases

### Multiple Active Changes

If other changes exist in `.orbit/changes/`:
```
"Archived: <current-change>

Note: Other active changes exist:
- <other-change-1>
- <other-change-2>

State cleared. Use /orbit to resume another change, or /orbit-explore to start new."
```

### Incomplete Tasks

If tasks are incomplete but user confirms archive:
```
Add note to archive metadata:

archived_with_warnings:
  - "3 tasks marked incomplete"
  - "Review noted minor issues"
```

### Spec Merge Conflicts

If change spec conflicts with main spec:
```
"Warning: Spec merge conflict detected.

Change requirement: [description]
Conflicts with main spec: [description]

Options:
1. Change overrides main (recommended if change is newer)
2. Keep main, note conflict in archive
3. Manual merge (I'll help you reconcile)

Choose option?"
```

---

## Integration

**Prerequisites:**
- Review phase complete
- Review passed
- In archive phase

**After this skill:**
- Change moved to archive
- Main specs updated
- State reset to idle
- Ready for new change

**Files created/modified:**
- `.orbit/archive/YYYY-MM-DD-<name>/` (directory moved)
- `.orbit/archive/YYYY-MM-DD-<name>/.archive-meta.yaml` (new)
- `.orbit/archive/INDEX.md` (updated)
- `.orbit/specs/<topic>.md` (updated or created)
- `.orbit/state.yaml` (cleared)

**Next steps:**
- Start new change: `/orbit-explore`
- Resume other change: `/orbit` (if multiple active changes)
