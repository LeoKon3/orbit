---
name: orbit
description: AI Skill Orchestration Engine - 5-phase development workflow (Explore → Brainstorming → Build → Review → Archive). Automatic phase detection and dispatch to sub-skills. Use /orbit for automatic flow, or call /orbit-explore, /orbit-brainstorming, etc. directly.
license: MIT
---

# Orbit - AI Skill Orchestration Engine

Complete development workflow from idea to implementation through structured phases.

```
Explore → Brainstorming → Build → Review → Archive
```

---

## How It Works

**Automatic Mode (Recommended):**
- Call `/orbit` at any time
- Checks current state
- Automatically continues from where you left off
- Dispatches to the correct phase skill

**Manual Mode (Advanced):**
- Call specific phase directly: `/orbit-explore`, `/orbit-brainstorming`, etc.
- Useful for jumping to specific phases
- Bypasses automatic phase detection

---

## Change Types

Orbit tracks any software change, not only new features. The phase order stays the same, but the templates and review emphasis adapt to `change_type`:

| Type | Use For | Phase Weight |
|------|---------|--------------|
| `feature` | New user-visible capability | Full Explore, Brainstorming, Planning, Build, Review |
| `bugfix` | Incorrect existing behavior, errors, timeouts, regressions | Lightweight but complete: reproduce → root cause → fix plan → regression verification |
| `refactor` | Internal restructuring without intended behavior change | Medium: behavior-preservation constraints and safe migration steps |
| `docs` | Documentation-only updates, translations, examples | Lightweight: audience, coverage, accuracy, links |
| `workflow` | Orbit/process/tooling/CLI changes | Medium/strict: state flow, skill references, script/package safety |

`change_type` does **not** skip phases by itself. It controls the questions asked, document templates, plan shape, and review checklist. For `feature`, use the full workflow. For `bugfix`, keep artifacts short but still persistent (`proposal.md`, `spec.md`, `brainstorming.md`, `plan.md`, `review.md`) so work can resume across sessions.

---

## Phase Detection and Dispatch

When you call `/orbit`, I will:

### Step 1: Check Current State

```bash
node skills/orbit/scripts/orbit-check-state.js
```

This script outputs:
- `PHASE=<current-phase>` - Where we are in the workflow
- `CHANGE=<change-name>` - Current change name
- `WORKFLOW=<workflow-type>` - full | explore-only | build-only
- `CHANGE_TYPE=<type>` - feature | bugfix | refactor | docs | workflow

### Step 2: Dispatch to Phase Skill

Based on the detected phase, automatically invoke the corresponding skill:

| Detected Phase | Invoked Skill | What It Does |
|---------------|---------------|--------------|
| `none` or `explore` | `/orbit-explore` | Requirements exploration → proposal.md + spec.md |
| `brainstorming` | `/orbit-brainstorming` | Technical design → brainstorming.md with ASCII diagrams |
| `build` (no plan) | `/orbit-planning` | Create implementation plan → plan.md |
| `build` (has plan) | `/orbit-build` | Execute implementation (subagent or inline) |
| `review` | `/orbit-review` | Code review and verification → review.md |
| `archive` | `/orbit-archive` | Archive change and merge specs to main docs |

### Step 3: Sync Check

Before entering certain phases, automatically check if documents are stale:

```bash
node skills/orbit/scripts/orbit-sync-detect.js
```

If any document hash mismatch is detected:
- Automatically invoke `/orbit-sync`
- Update affected documents
- Then continue with the intended phase

---

## Workflow Phases

### Phase 1: Explore 🔍
**Skill:** `/orbit-explore`

**Purpose:** Understand requirements through conversation

**Creates:**
- `.orbit/changes/<name>/proposal.md` - Problem, goals, approach
- `.orbit/changes/<name>/spec.md` - Detailed functional requirements

**Next:** Brainstorming

---

### Phase 2: Brainstorming 🎨
**Skill:** `/orbit-brainstorming`

**Purpose:** Technical design exploration with ASCII diagrams

**Creates:**
- `.orbit/changes/<name>/brainstorming.md` - Architecture, components, technology choices

**Next:** Planning (Build prep)

---

### Phase 3: Build 🔨

#### Sub-phase: Planning
**Skill:** `/orbit-planning`

**Purpose:** Create detailed implementation plan

**Creates:**
- `.orbit/changes/<name>/plan.md` - Step-by-step tasks with code examples

#### Sub-phase: Execution
**Skill:** `/orbit-build`

**Purpose:** Execute the plan

**Dispatches to:**
- `orbit-subagent-dev` (≥3 tasks) - Task-by-task subagent execution
- `orbit-executing` (≤2 tasks) - Sequential inline execution

**Creates:**
- Actual code implementation
- Tests

**Sync Check:** Automatically runs before execution to detect spec changes

**Next:** Review

---

### Phase 4: Review 🔬
**Skill:** `/orbit-review`

**Purpose:** Code review and verification

**Creates:**
- `.orbit/changes/<name>/review.md` - Review findings and checklist

**Next:** Archive (if passed) or back to Build (if issues)

---

### Phase 5: Archive 📦
**Skill:** `/orbit-archive`

**Purpose:** Complete the change and document it

**Actions:**
1. Merge spec to `.orbit/specs/<topic>.md`
2. Move to `.orbit/archive/<date>-<name>/`
3. Update archive INDEX
4. Clear state for next change

**Next:** Ready for new change

---

## Special Skills

### Sync 🔄
**Skill:** `/orbit-sync`

**Purpose:** Handle spec changes during implementation

**Triggered:**
- Automatically when hash mismatch detected
- Manually when you call it

**Updates:**
- Surgically updates brainstorming.md and plan.md to reflect spec changes
- Rebuilds hash chain

---

## State Management

All workflow state is tracked in `.orbit/state.yaml`:

```yaml
workflow: full
change_type: feature
phase: brainstorming
current_change: ops-platform

documents:
  proposal:
    path: .orbit/changes/ops-platform/proposal.md
    hash: aaa111...
  spec:
    path: .orbit/changes/ops-platform/spec.md
    hash: bbb222...
    based_on_proposal_hash: aaa111...
  brainstorming:
    path: .orbit/changes/ops-platform/brainstorming.md
    hash: ccc333...
    based_on_spec_hash: bbb222...
  plan:
    path: .orbit/changes/ops-platform/plan.md
    hash: ddd444...
    based_on_brainstorming_hash: ccc333...
  review:
    path: .orbit/changes/ops-platform/review.md
    hash: eee555...
    based_on_plan_hash: ddd444...
```

**Hash Chain:** Each document links to its parent via hash, ensuring consistency.

**Change Type:** `change_type` is set during Explore and carried through Archive. If absent in an older state file, treat it as `feature` for backward compatibility.

---

## Usage Examples

### Example 1: Fresh Start
```
User: /orbit

Claude: [checks state, finds none]
        Starting Explore phase...
        [invokes /orbit-explore]
        "Tell me about what you're trying to build."
```

### Example 2: Continuing Work
```
User: /orbit

Claude: [checks state]
        📍 Current: full workflow, brainstorming phase, change: ops-platform
        Continuing brainstorming phase...
        [invokes /orbit-brainstorming]
```

### Example 3: Spec Changed During Build
```
User: /orbit

Claude: [checks state → build phase]
        [runs sync-detect]
        ⚠️  Spec changed since brainstorming was created
        Running sync first...
        [invokes /orbit-sync]
        [updates brainstorming.md and plan.md]
        ✓ Sync complete
        Now continuing build...
        [invokes /orbit-build]
```

### Example 4: Jump to Specific Phase (Advanced)
```
User: /orbit-review

Claude: [directly invokes review skill]
        [checks if review can run]
        Starting code review...
```

---

## Scripts

Shared automation scripts in `skills/orbit/scripts/`:

- `orbit-check-state.js` - Check current phase and change
- `orbit-phase-guard.js` - Validate phase transitions
- `orbit-update-hash.js` - Update document hashes
- `orbit-sync-detect.js` - Detect stale documents
- `orbit-merge-spec.js` - Merge specs to main docs
- `orbit-archive-change.js` - Move completed changes to archive and reset state

All phase skills use these scripts for consistency.

---

## Directory Structure

```
.orbit/
├── state.yaml                    # Current workflow state
├── changes/
│   └── <change-name>/            # Active change
│       ├── proposal.md           # Explore
│       ├── spec.md               # Explore
│       ├── brainstorming.md      # Brainstorming
│       ├── plan.md               # Planning
│       └── review.md             # Review
├── specs/
│   └── <topic>.md                # Merged specifications
├── archive/
│   ├── INDEX.md                  # Archive catalog
│   └── <date>-<name>/            # Completed changes
└── design-sessions/
    └── <name>-<timestamp>.md     # Brainstorm records
```

---

## Implementation

When `/orbit` is called, this skill:

1. **Detects current state** via `orbit-check-state.js`
2. **Validates transition** via `orbit-phase-guard.js` (if needed)
3. **Checks for sync** via `orbit-sync-detect.js` (if in build/review)
4. **Invokes phase skill** via Skill tool
5. **Reports completion** and suggests next step

This is a **dispatcher skill** - actual work is done by phase-specific skills.

---

## Ready to Start

Call `/orbit` and I'll:
- ✅ Detect where you are in the workflow
- ✅ Continue from the current phase
- ✅ Handle sync automatically if needed
- ✅ Guide you through to completion

Or call a specific phase directly: `/orbit-explore`, `/orbit-brainstorming`, `/orbit-build`, etc.
