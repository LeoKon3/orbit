---
name: orbit-explore
description: Phase 1 - Explore ideas, clarify requirements, and create initial change structure
license: MIT
---

# Phase 1: Explore

Explore ideas through conversation, clarify requirements, and create the change structure.

**Announce at start:** "I'm using orbit-explore to start exploring this idea."

---

## Overview

This is discovery mode - help the user think through their idea before diving into implementation. Ask questions, explore options, understand the problem space, then capture it as a structured change.

---

## The Process

### Step 1: Check Current State

```bash
cat .orbit/state.yaml 2>/dev/null || echo "No state file - new project"
```

If no state file exists, this is initialization.

### Step 2: Explore the Idea

**Be a thinking partner:**

- Ask clarifying questions one at a time
- Understand the problem they're trying to solve
- Explore different approaches
- Challenge assumptions when helpful
- Use diagrams to visualize complex ideas

```
Example flow:

You: "Tell me about what you're trying to build."

User: "I want to add user authentication"

You: "Let's think about this...

     AUTH APPROACHES
     ═══════════════════════════════════════
     
     Simple              Full-Featured
        ↓                      ↓
     ┌─────────┐         ┌──────────┐
     │  Email  │         │  OAuth   │
     │  Magic  │         │ Multiple │
     │  Link   │         │ Providers│
     └─────────┘         └──────────┘
     
     Quick start         Production ready
     
     Which direction feels right?"
```

**Continue until you understand:**
- What problem they're solving
- Why they need it
- What success looks like
- Key constraints or requirements
- What's in scope vs out of scope

**Classify the change type:** infer the likely `change_type`, then confirm it with the user in the summary.

| change_type | Signals | Explore focus |
|-------------|---------|---------------|
| `feature` | add, create, support, new capability | users, goals, workflows, requirements, constraints |
| `bugfix` | bug, error, broken, timeout, loading forever, regression, wrong behavior | actual vs expected behavior, reproduction steps, logs/errors, affected scope |
| `refactor` | restructure, split, cleanup, simplify internals without behavior change | behavior to preserve, risk boundaries, test coverage, migration constraints |
| `docs` | README, docs, guide, translation, examples | audience, coverage, commands/links to verify, language requirements |
| `workflow` | Orbit, skill, phase, CLI, installer, update/uninstall, process | current process problem, desired agent behavior, compatibility, package safety |

If the type is uncertain, default to `feature` only after explaining the assumption. Lightweight types still use the same phases; they just use shorter, more focused artifacts.

### Step 3: Summarize Understanding

Present a clear summary:

```
## What We're Building

**Problem:** [clear problem statement]

**Solution:** [proposed approach]

**Scope:**
- In scope: [what we'll build]
- Out of scope: [what we won't]

**Success Criteria:**
- [how we'll know it works]

**Change Type:** [feature | bugfix | refactor | docs | workflow]

Does this capture it?
```

Wait for user confirmation before proceeding.

### Step 4: Create Change Structure

Once confirmed, create the change structure:

```text
Create `.orbit/changes/<change-name>/`.

Create or update `.orbit/state.yaml` with:
workflow: full
change_type: <feature|bugfix|refactor|docs|workflow>
phase: explore
current_change: <change-name>
```

If an older state file has no `change_type`, add it while preserving the existing workflow fields.

### Step 5: Write Proposal

Create `.orbit/changes/<name>/proposal.md`:

```markdown
# Proposal: <Change Name>

**Change Type:** <feature|bugfix|refactor|docs|workflow>

## Problem

[What problem are we solving?]

## Goals

- [Primary goal]
- [Secondary goals]

## Non-Goals

- [Explicitly out of scope]

## Approach

[High-level approach]

## Success Criteria

- [How we measure success]

## Open Questions

- [Things we still need to figure out]
```

### Step 6: Write Initial Spec

Create `.orbit/changes/<name>/spec.md`:

```markdown
# Specification: <Change Name>

**Change Type:** <feature|bugfix|refactor|docs|workflow>

## Overview

[Brief description]

## Requirements

### Functional Requirements

1. **[Requirement Name]**
   - Description: [what it does]
   - Rationale: [why it's needed]

### Non-Functional Requirements

1. **[Requirement Name]**
   - Description: [quality attribute]
   - Rationale: [why it matters]

## User Stories / Scenarios

### Scenario: [Name]
- **Given** [initial state]
- **When** [action]
- **Then** [expected outcome]

## Constraints

- [Technical constraints]
- [Business constraints]

## Assumptions

- [What we're assuming is true]
```

### Step 7: Update State with Hashes

**Use the hash updater script:**

```bash
# Update proposal hash
node skills/orbit/scripts/orbit-update-hash.js proposal .orbit/changes/<change-name>/proposal.md

# Update spec hash (will link to proposal hash)
node skills/orbit/scripts/orbit-update-hash.js spec .orbit/changes/<change-name>/spec.md
```

After the phase guard passes, update `.orbit/state.yaml` by setting `phase: brainstorming`.

**Verify phase guard before transitioning:**

```bash
# Check if can move to brainstorming
node skills/orbit/scripts/orbit-phase-guard.js brainstorming
# Exit 0 = can proceed, Exit 1 = missing prerequisites
```

### Step 8: Announce Completion

```
## Exploration Complete ✓

Created change: **<name>**

**Documents:**
- Proposal: .orbit/changes/<name>/proposal.md
- Spec: .orbit/changes/<name>/spec.md

**Change type:** <feature|bugfix|refactor|docs|workflow>

**Next phase:** Brainstorming (technical exploration)

Ready to continue with `/orbit-brainstorming`?
```

---

## Guidelines

### Good Questions

- "What problem does this solve?"
- "Who will use this?"
- "What happens if...?"
- "Have you considered...?"
- "What's the simplest version?"

### Visualize Liberally

Use ASCII diagrams to explore:
- System architecture
- User flows
- State transitions
- Component relationships
- Tradeoffs between options

### Don't Rush

This is thinking time. It's okay to explore tangents, reconsider approaches, and change direction as understanding deepens.

### Stay Grounded

When relevant, read existing code to understand:
- Current architecture
- Existing patterns
- Integration points
- What already exists that we can build on

---

## Integration

**After this skill completes:**
- State file exists at `.orbit/state.yaml`
- Change structure exists at `.orbit/changes/<name>/`
- Phase is set to `brainstorming`
- Ready for `/orbit-brainstorming`

**Required for this skill:**
- User has an idea to explore
- No complex setup needed

**This skill creates:**
- `.orbit/state.yaml` (if new project)
- `.orbit/changes/<name>/proposal.md`
- `.orbit/changes/<name>/spec.md`
