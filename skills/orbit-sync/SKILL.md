---
name: orbit-sync
description: Sync documents after spec changes during implementation
license: MIT
---

# Document Synchronization

Handle spec changes that happen during the build phase. When requirements evolve mid-implementation, sync brainstorming and plan to stay consistent.

**Announce at start:** "I'm using orbit-sync to synchronize documents after spec changes."

---

## When to Use

This skill is invoked when:
- During build phase, spec.md gets updated
- Brainstorming or plan may be outdated
- Need to ensure all documents are consistent

**Typical scenario:**
```
Build Phase → Discover new requirement → Update spec.md → Need to sync brainstorming.md and plan.md
```

---

## The Process

### Step 1: Check Current State

```bash
cat .orbit/state.yaml
```

Verify:
- `phase: build` (should be in build phase)
- `current_change` exists

If not in build phase, explain this is for mid-implementation sync only.

### Step 2: Detect Changes with Script

**Use the sync detector script:**

```bash
# Check if documents are stale
bash skills/orbit/scripts/orbit-sync-detect.sh

# Exit 0 = all in sync, Exit 1 = sync needed
# Script will output which documents are stale and their hash mismatches
```

If script exits with 0, no sync needed - announce and exit.

If script exits with 1, continue with sync process below.

**Extract change name:**
```bash
CHANGE_NAME=$(grep "current_change:" .orbit/state.yaml | cut -d' ' -f2)
```

### Step 3: Analyze Impact

**Read all three documents:**
1. spec.md (current)
2. brainstorming.md
3. plan.md (if exists)

**Identify what changed in spec:**
- New requirements added?
- Existing requirements modified?
- Requirements removed?
- Scope changed?

**Assess impact:**
- Does brainstorming need updates? (architecture, approach, decisions)
- Does plan need updates? (tasks, file structure, implementation steps)

### Step 4: Present Impact Analysis

```
## Spec Change Impact

**What changed in spec:**
- [List specific changes]

**Impact on brainstorming:**
- [What parts of brainstorming need updating]

**Impact on plan:**
- [What parts of plan need updating]

**Recommended action:**
- Update brainstorming: [specific sections]
- Update plan: [specific tasks]
```

Ask user: "Should I update brainstorming and plan to match the new spec?"

### Step 5: Update Brainstorming (if needed)

Read brainstorming.md and make targeted updates:

```markdown
# Only update affected sections

## Example: New requirement needs new component

### [New Section]
[Brainstorming update for new requirement]

### [Existing Section - Updated]
[Modified brainstorming approach to accommodate change]
```

**Don't rewrite the whole document** - make surgical updates to affected sections.

### Step 6: Update Plan (if needed)

Read plan.md and update:

```markdown
## Updated File Structure
[Add new files if needed]

## Updated Tasks

### Task X: [New or Modified Task]
**Files:** [affected files]

**Steps:**
1. [Updated steps]

### [Keep existing tasks that aren't affected]
```

**Adjust task list:**
- Add new tasks for new requirements
- Modify tasks affected by changes
- Mark completed tasks as is (don't regenerate)

### Step 7: Update State with Hashes

**Use the hash updater script:**

```bash
CHANGE_NAME=$(grep "current_change:" .orbit/state.yaml | cut -d' ' -f2)

# Update brainstorming hash (will link to current spec hash)
bash skills/orbit/scripts/orbit-update-hash.sh brainstorming .orbit/changes/$CHANGE_NAME/brainstorming.md

# Update plan hash (will link to current brainstorming hash)
bash skills/orbit/scripts/orbit-update-hash.sh plan .orbit/changes/$CHANGE_NAME/plan.md
```

The script automatically:
- Calculates SHA256 hashes
- Links documents to their parent hashes
- Updates `.orbit/state.yaml` with correct hash chain

### Step 8: Announce Completion

```
## Documents Synchronized ✓

**Updated:**
- brainstorming.md: [what changed]
- plan.md: [what changed]

**Status:** All documents now consistent with current spec

**Next:** Continue implementation with updated plan
```

---

## Sync Strategies

### Incremental Updates (Preferred)

Don't regenerate everything. Make targeted changes:

```
Bad:  Rewrite entire brainstorming.md
Good: Update "Authentication" section, add "Session Management" section
```

### Preserve Context

Keep implementation context:
```
- Completed tasks stay marked complete
- Code already written referenced appropriately
- Build on existing decisions, don't contradict them
```

### Clear Communication

Show exactly what changed:
```
## Changes Made

### brainstorming.md
- Added section: "OAuth Flow"
- Updated section: "Security" (new session requirements)

### plan.md
- Added Task 5: "Implement OAuth callback"
- Updated Task 3: "Add session storage" (now includes OAuth tokens)
```

---

## Edge Cases

### Spec change invalidates brainstorming

If change is fundamental:
```
"This spec change conflicts with the current brainstorming approach.

Current brainstorming: [approach]
New requirement: [requirement]
Conflict: [why they don't work together]

Recommend: Go back to brainstorming phase to rework architecture.
Use /orbit-brainstorming to revisit."
```

### Spec change invalidates completed work

If completed tasks need rework:
```
"Warning: This spec change affects completed work.

Completed tasks affected:
- Task 2: [what needs to change]

Recommend: Add new tasks to address, or mark existing as needs-rework."
```

### Spec shrinks (requirements removed)

```
"Spec removed requirements - some brainstorming/plan items may be obsolete.

Consider:
- Remove corresponding brainstorming sections
- Remove or mark optional in plan
- Leave if implementation already done (document as 'extra feature')"
```

---

## Integration

**When to invoke:**
- User updates spec.md during build phase
- State shows brainstorming/plan as "stale"
- Before continuing implementation after spec change

**After this skill:**
- All documents consistent
- State updated with new hashes
- Ready to continue build phase

**Files modified:**
- `.orbit/changes/<name>/brainstorming.md` (if needed)
- `.orbit/changes/<name>/plan.md` (if needed)
- `.orbit/state.yaml` (hashes updated)
