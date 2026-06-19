# Orbit Scripts

These Node scripts automate critical workflow logic and ensure consistency across phases.

## Scripts Overview

| Script | Purpose | Called By |
|--------|---------|-----------|
| `orbit-check-state.js` | Check current workflow state | Main SKILL.md on `/orbit` invocation |
| `orbit-phase-guard.js` | Validate phase transitions | Before entering any phase |
| `orbit-update-hash.js` | Update document hashes | After creating/updating any document |
| `orbit-sync-detect.js` | Detect stale documents | Before build/review phases |
| `orbit-merge-spec.js` | Merge specs to main docs | Archive phase |
| `orbit-archive-change.js` | Move completed change to archive and reset state | Archive phase |

## Usage in Workflow

### 1. Check State (Every `/orbit` call)

```bash
# In main SKILL.md
node skills/orbit/scripts/orbit-check-state.js
# Output: PHASE=build CHANGE=my-feature WORKFLOW=full CHANGE_TYPE=feature
```

Determines which phase to execute and which change-type template/checklist to use. `CHANGE_TYPE` defaults to `feature` for older state files.

---

### 2. Phase Guard (Before phase transition)

```bash
# Before entering brainstorming phase
node skills/orbit/scripts/orbit-phase-guard.js brainstorming
# Exit 0 = can proceed, Exit 1 = missing prerequisites
```

Validates:
- **explore → brainstorming**: Requires `proposal.md` and `spec.md`
- **brainstorming → build**: Requires `brainstorming.md`
- **build → review**: Requires `plan.md`
- **review → archive**: Requires `review.md` with PASS status

---

### 3. Update Hash (After document creation/modification)

```bash
# After creating spec.md in explore phase
node skills/orbit/scripts/orbit-update-hash.js spec .orbit/changes/my-feature/spec.md

# After creating brainstorming.md in brainstorming phase
node skills/orbit/scripts/orbit-update-hash.js brainstorming .orbit/changes/my-feature/brainstorming.md
```

Updates `.orbit/state.yaml`:
```yaml
workflow: full
change_type: feature
phase: build
current_change: my-feature

documents:
  spec:
    path: .orbit/changes/my-feature/spec.md
    hash: abc123...
    based_on_proposal_hash: xyz789...
  brainstorming:
    path: .orbit/changes/my-feature/brainstorming.md
    hash: def456...
    based_on_spec_hash: abc123...  # ← Links to parent
```

---

### 4. Sync Detect (Before build/review phases)

```bash
# Before starting build or review
node skills/orbit/scripts/orbit-sync-detect.js
# Exit 1 if any document is stale
```

Detects hash mismatches:
- If `spec.md` changed → `brainstorming.md` is stale
- If `brainstorming.md` changed → `plan.md` is stale
- Triggers `/orbit sync` automatically

---

### 5. Merge Spec (During archive phase)

```bash
# When archiving change
node skills/orbit/scripts/orbit-merge-spec.js my-feature
```

Creates or updates `.orbit/specs/<topic>.md`:
- New topic → Copy change spec directly
- Existing topic → Append to change history, output new requirements for manual merge

---

### 6. Archive Change (During archive phase)

```bash
# After merging the spec
node skills/orbit/scripts/orbit-archive-change.js my-feature
```

Moves `.orbit/changes/<name>/` to `.orbit/archive/YYYY-MM-DD-<name>/`, writes archive metadata, updates `INDEX.md`, and resets `.orbit/state.yaml` to idle.

---

## Automatic Call Flow

### Example: Full workflow with sync

```
User: /orbit

┌─ orbit-check-state.js
│  → PHASE=none → Start explore
│
├─ Explore Phase
│  ├─ Classify change_type (feature | bugfix | refactor | docs | workflow)
│  ├─ Create proposal.md
│  ├─ orbit-update-hash.js proposal ...
│  ├─ Create spec.md
│  ├─ orbit-update-hash.js spec ...
│  └─ orbit-phase-guard.js brainstorming ✓
│
├─ Brainstorming Phase
│  ├─ orbit-sync-detect.js (checks spec hash)
│  ├─ Create brainstorming.md
│  ├─ orbit-update-hash.js brainstorming ...
│  └─ orbit-phase-guard.js build ✓
│
├─ Build Phase
│  ├─ orbit-sync-detect.js (checks brainstorming hash)
│  │  → ⚠️ Spec changed! Sync needed
│  │
│  ├─ Sync Phase (automatic)
│  │  ├─ Update brainstorming.md surgically
│  │  ├─ orbit-update-hash.js brainstorming ...
│  │  └─ Update plan.md surgically
│  │
│  ├─ Create plan.md
│  ├─ orbit-update-hash.js plan ...
│  ├─ Implementation...
│  └─ orbit-phase-guard.js review ✓
│
├─ Review Phase
│  ├─ orbit-sync-detect.js (checks plan hash)
│  ├─ Create review.md
│  └─ orbit-phase-guard.js archive ✓
│
└─ Archive Phase
   ├─ orbit-merge-spec.js my-feature
   │  → Merges to .orbit/specs/authentication.md
   └─ orbit-archive-change.js my-feature
      → Moves to .orbit/archive/2026-06-17-my-feature/ and clears state
```

---

## Manual Usage (Advanced)

Users can also run these scripts directly for debugging:

```bash
# Check current state
node skills/orbit/scripts/orbit-check-state.js

# Test if can move to review
node skills/orbit/scripts/orbit-phase-guard.js review

# Check for stale documents
node skills/orbit/scripts/orbit-sync-detect.js

# Manually merge a spec
node skills/orbit/scripts/orbit-merge-spec.js feature-name

# Finalize archive for a completed change
node skills/orbit/scripts/orbit-archive-change.js feature-name
```

---

## Benefits

✅ **Consistency**: Same logic every time
✅ **Testability**: Can test scripts independently
✅ **Debuggability**: Users can run scripts to diagnose issues
✅ **Reliability**: Exit codes prevent invalid transitions
✅ **Traceability**: SHA256 hashes track document lineage

---

## Implementation Notes

- Automation scripts run on Node.js for Windows/macOS/Linux compatibility
- Exit codes: 0 = success, 1 = failure/invalid
- Color output: red (error), green (success), yellow (warning), blue (info)
- Validation/hash scripts are safe to re-run; archive finalization is one-shot and refuses duplicate archive paths
- No external dependencies (Node.js built-ins only)
