# Orbit Scripts

These bash scripts automate critical workflow logic and ensure consistency across phases.

## Scripts Overview

| Script | Purpose | Called By |
|--------|---------|-----------|
| `orbit-check-state.sh` | Check current workflow state | Main SKILL.md on `/orbit` invocation |
| `orbit-phase-guard.sh` | Validate phase transitions | Before entering any phase |
| `orbit-update-hash.sh` | Update document hashes | After creating/updating any document |
| `orbit-sync-detect.sh` | Detect stale documents | Before build/review phases |
| `orbit-merge-spec.sh` | Merge specs to main docs | Archive phase |

## Usage in Workflow

### 1. Check State (Every `/orbit` call)

```bash
# In main SKILL.md
./skills/orbit/scripts/orbit-check-state.sh
# Output: PHASE=build CHANGE=my-feature WORKFLOW=full
```

Determines which phase to execute.

---

### 2. Phase Guard (Before phase transition)

```bash
# Before entering design phase
./skills/orbit/scripts/orbit-phase-guard.sh design
# Exit 0 = can proceed, Exit 1 = missing prerequisites
```

Validates:
- **explore → design**: Requires `proposal.md` and `spec.md`
- **design → build**: Requires `design.md`
- **build → review**: Requires `plan.md`
- **review → archive**: Requires `review.md` with PASS status

---

### 3. Update Hash (After document creation/modification)

```bash
# After creating spec.md in explore phase
./skills/orbit/scripts/orbit-update-hash.sh spec .orbit/changes/my-feature/spec.md

# After creating design.md in design phase
./skills/orbit/scripts/orbit-update-hash.sh design .orbit/changes/my-feature/design.md
```

Updates `.orbit/state.yaml`:
```yaml
documents:
  spec:
    path: .orbit/changes/my-feature/spec.md
    hash: abc123...
    based_on_proposal_hash: xyz789...
  design:
    path: .orbit/changes/my-feature/design.md
    hash: def456...
    based_on_spec_hash: abc123...  # ← Links to parent
```

---

### 4. Sync Detect (Before build/review phases)

```bash
# Before starting build or review
./skills/orbit/scripts/orbit-sync-detect.sh
# Exit 1 if any document is stale
```

Detects hash mismatches:
- If `spec.md` changed → `design.md` is stale
- If `design.md` changed → `plan.md` is stale
- Triggers `/orbit sync` automatically

---

### 5. Merge Spec (During archive phase)

```bash
# When archiving change
./skills/orbit/scripts/orbit-merge-spec.sh my-feature
```

Creates or updates `.orbit/specs/<topic>.md`:
- New topic → Copy change spec directly
- Existing topic → Append to change history, output new requirements for manual merge

---

## Automatic Call Flow

### Example: Full workflow with sync

```
User: /orbit

┌─ orbit-check-state.sh
│  → PHASE=none → Start explore
│
├─ Explore Phase
│  ├─ Create proposal.md
│  ├─ orbit-update-hash.sh proposal ...
│  ├─ Create spec.md
│  ├─ orbit-update-hash.sh spec ...
│  └─ orbit-phase-guard.sh design ✓
│
├─ Design Phase
│  ├─ orbit-sync-detect.sh (checks spec hash)
│  ├─ Create design.md
│  ├─ orbit-update-hash.sh design ...
│  └─ orbit-phase-guard.sh build ✓
│
├─ Build Phase
│  ├─ orbit-sync-detect.sh (checks design hash)
│  │  → ⚠️ Spec changed! Sync needed
│  │
│  ├─ Sync Phase (automatic)
│  │  ├─ Update design.md surgically
│  │  ├─ orbit-update-hash.sh design ...
│  │  └─ Update plan.md surgically
│  │
│  ├─ Create plan.md
│  ├─ orbit-update-hash.sh plan ...
│  ├─ Implementation...
│  └─ orbit-phase-guard.sh review ✓
│
├─ Review Phase
│  ├─ orbit-sync-detect.sh (checks plan hash)
│  ├─ Create review.md
│  └─ orbit-phase-guard.sh archive ✓
│
└─ Archive Phase
   ├─ orbit-merge-spec.sh my-feature
   │  → Merges to .orbit/specs/authentication.md
   ├─ Move to .orbit/archive/2026-06-17-my-feature/
   └─ Clear state
```

---

## Manual Usage (Advanced)

Users can also run these scripts directly for debugging:

```bash
# Check current state
./skills/orbit/scripts/orbit-check-state.sh

# Test if can move to review
./skills/orbit/scripts/orbit-phase-guard.sh review

# Check for stale documents
./skills/orbit/scripts/orbit-sync-detect.sh

# Manually merge a spec
./skills/orbit/scripts/orbit-merge-spec.sh feature-name
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

- All scripts use `set -euo pipefail` for safety
- Exit codes: 0 = success, 1 = failure/invalid
- Color output: red (error), green (success), yellow (warning), blue (info)
- Scripts are idempotent and safe to re-run
- No external dependencies (pure bash + coreutils)
