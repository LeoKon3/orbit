# Orbit - AI Skill Orchestration Engine

```
 ██████╗ ██████╗ ██████╗ ██╗████████╗
██╔═══██╗██╔══██╗██╔══██╗██║╚══██╔══╝
██║   ██║██████╔╝██████╔╝██║   ██║   
██║   ██║██╔══██╗██╔══██╗██║   ██║   
╚██████╔╝██║  ██║██████╔╝██║   ██║   
 ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚═╝   ╚═╝   
```

**Keep your AI development workflow in orbit**

Complete development lifecycle automation through structured 5-phase workflow with script-based reliability.

## Status

✅ **v0.1.0 MVP - Complete**

Core workflow implementation:
- ✅ Project structure
- ✅ Script-based automation
- ✅ State management with hash tracking
- ✅ 5-phase workflow skills
- ✅ Sync detection and recovery
- ✅ Independent skill invocation

## Quick Start

### As Claude Code Skills

```bash
# Automatic workflow (recommended)
/orbit

# Or call specific phases directly
/orbit-explore          # Phase 1: Requirements exploration
/orbit-brainstorming    # Phase 2: Technical design
/orbit-planning         # Phase 3.1: Implementation planning
/orbit-build            # Phase 3.2: Code implementation
/orbit-review           # Phase 4: Code review
/orbit-archive          # Phase 5: Archive and documentation
/orbit-sync             # Sync after spec changes
```

### First Time Use

```bash
# 1. Start a new change
/orbit

# Claude will ask: "Tell me about what you're trying to build."
# Answer, then follow the conversation through each phase

# 2. Check status anytime
ls -la .orbit/
cat .orbit/state.yaml

# 3. Continue where you left off
/orbit
```

## Five-Phase Workflow

```
Explore → Brainstorming → Build → Review → Archive
   ↓            ↓           ↓        ↓        ↓
proposal.md  brainstorming  plan.md  review.md  Archive
spec.md         .md         + code              + merge
```

### Phase Details

| Phase | Skill | Creates | Key Activities |
|-------|-------|---------|----------------|
| **1. Explore** | `/orbit-explore` | `proposal.md`<br>`spec.md` | Requirements conversation<br>Problem/solution exploration<br>Functional specs |
| **2. Brainstorming** | `/orbit-brainstorming` | `brainstorming.md` | Technical design<br>Architecture diagrams (ASCII)<br>Technology choices |
| **3. Build** | `/orbit-planning`<br>`/orbit-build` | `plan.md`<br>Code + Tests | Implementation planning<br>Subagent/inline execution<br>TDD approach |
| **4. Review** | `/orbit-review` | `review.md` | Code quality review<br>Bug detection<br>Pass/fail verification |
| **5. Archive** | `/orbit-archive` | Archive + Index<br>Merged specs | Move to archive<br>Merge to main specs<br>Clear state |

---

## Core Mechanisms

### 1. Script-Based Automation

All critical logic is in bash scripts (not agent promises):

```bash
skills/orbit/scripts/
├── orbit-check-state.sh     # Detect current phase
├── orbit-phase-guard.sh     # Validate transitions
├── orbit-update-hash.sh     # Track document changes
├── orbit-sync-detect.sh     # Detect stale documents
└── orbit-merge-spec.sh      # Intelligent spec merging
```

### 2. Hash-Based Document Tracking

SHA256 hash chain ensures consistency:

```yaml
documents:
  spec:
    hash: bbb222...
  brainstorming:
    hash: ccc333...
    based_on_spec_hash: bbb222...  ✓ matches
  plan:
    hash: ddd444...
    based_on_brainstorming_hash: ccc333...  ✓ matches
```

If spec changes during build → **automatic sync detection**.

### 3. State Machine

`.orbit/state.yaml` tracks workflow:

```yaml
workflow: full
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
```

### 4. Phase Guards

Prevent invalid transitions:

```bash
# Can't skip phases
bash skills/orbit/scripts/orbit-phase-guard.sh archive
# ✗ Missing review.md. Run review phase first.
```

### 5. Automatic Sync

Spec changes trigger surgical updates:

```bash
# User edits spec.md during build
/orbit
# ⚠️  Spec changed since brainstorming was created
# 🔄 Running sync first...
# [Updates brainstorming.md and plan.md]
# ✓ Sync complete, continuing build...
```

---

## Skills Structure

```
skills/
├── orbit/                    # Main dispatcher + shared scripts
│   ├── SKILL.md
│   └── scripts/
│       ├── orbit-check-state.sh
│       ├── orbit-phase-guard.sh
│       ├── orbit-update-hash.sh
│       ├── orbit-sync-detect.sh
│       └── orbit-merge-spec.sh
│
├── orbit-explore/           # Phase 1: Requirements
├── orbit-brainstorming/     # Phase 2: Technical design
├── orbit-planning/          # Phase 3.1: Planning
├── orbit-build/             # Phase 3.2: Execution dispatcher
├── orbit-review/            # Phase 4: Code review
├── orbit-archive/           # Phase 5: Archive
├── orbit-sync/              # Sync handler
│
└── Execution skills (called by orbit-build):
    ├── orbit-executing/      # Simple tasks (≤2 tasks)
    ├── orbit-subagent-dev/   # Complex tasks (≥3 tasks)
    ├── orbit-tdd/            # Test-driven development
    ├── orbit-verify/         # Verification checks
    └── orbit-finishing/      # Branch cleanup
```

---

## Usage Modes

### Mode 1: Automatic Flow (Recommended)

```bash
/orbit  # Call repeatedly, it continues from current phase
```

**Example session:**
```
Turn 1: /orbit → Explore → Creates proposal.md + spec.md
Turn 2: /orbit → Brainstorming → Creates brainstorming.md
Turn 3: /orbit → Planning → Creates plan.md
Turn 4: /orbit → Build → Implements code
Turn 5: /orbit → Review → Creates review.md
Turn 6: /orbit → Archive → Archives change
```

### Mode 2: Direct Phase Invocation (Advanced)

```bash
/orbit-brainstorming  # Jump to brainstorming (useful for quick design)
/orbit-review         # Quick code review
/orbit-sync           # Manual sync after spec edits
```

---

## Project Directory Structure

```
myproject/
├── .orbit/
│   ├── state.yaml                      # Current workflow state
│   ├── changes/
│   │   └── my-feature/                 # Active change
│   │       ├── proposal.md
│   │       ├── spec.md
│   │       ├── brainstorming.md
│   │       ├── plan.md
│   │       └── review.md
│   ├── specs/
│   │   └── authentication.md           # Merged main specs
│   ├── archive/
│   │   ├── INDEX.md
│   │   └── 2026-06-18-my-feature/      # Completed changes
│   └── design-sessions/
│       └── brainstorm-2026-06-18.md
│
└── (your project code)
```

---

## Hash Chain Example

Complete document lineage:

```yaml
documents:
  proposal:
    hash: aaa111...
    
  spec:
    hash: bbb222...
    based_on_proposal_hash: aaa111...  ✓
    
  brainstorming:
    hash: ccc333...
    based_on_spec_hash: bbb222...      ✓
    
  plan:
    hash: ddd444...
    based_on_brainstorming_hash: ccc333...  ✓
    
  review:
    hash: eee555...
    based_on_plan_hash: ddd444...      ✓
```

**If spec.md changes:**
```yaml
spec:
  hash: bbb999...  ← Changed!

brainstorming:
  based_on_spec_hash: bbb222...  ✗ MISMATCH
```

→ `orbit-sync-detect.sh` catches this  
→ Automatically triggers `/orbit-sync`  
→ Updates brainstorming.md and plan.md  
→ Rebuilds hash chain

---

## Design Principles

1. **Script-First** - Critical logic in bash scripts, not agent interpretation
2. **Hash-Based Traceability** - SHA256 tracks all document relationships
3. **Automatic Sync** - Spec changes trigger surgical updates, not full rewrites
4. **Phase Guards** - Prevent invalid workflow states
5. **Incremental Specs** - Changes merge into main docs, preserving history
6. **Independent Skills** - Can invoke any phase directly for flexibility

---

## Comparison with Similar Tools

| Dimension | Comet | Orbit |
|-----------|-------|-------|
| **Positioning** | OpenSpec + Superpowers | Independent 5-phase workflow |
| **Dependencies** | External CLIs (openspec, superpowers) | Self-contained skills + scripts |
| **Invocation** | `/comet`, `/comet-open`, etc. | `/orbit`, `/orbit-explore`, etc. |
| **Phase 2 Name** | design | brainstorming (exploration focus) |
| **Automation** | State machine + scripts | State machine + scripts + hash tracking |
| **Build Strategy** | Superpowers execution | Subagent-driven or inline |
| **Extensibility** | Monolithic skill | Modular independent skills |

---

## Documentation

- [SCRIPT-INTEGRATION.md](SCRIPT-INTEGRATION.md) - How scripts integrate with skills
- [REFACTORING-COMPLETE.md](REFACTORING-COMPLETE.md) - Restructuring details
- [orbit-project-plan.md](orbit-project-plan.md) - Original project plan

---

## Roadmap

### ✅ v0.1.0 - MVP (Current)
- ✅ 5-phase workflow skills
- ✅ Script-based automation
- ✅ Hash-based document tracking
- ✅ Sync detection and recovery
- ✅ Independent skill invocation

### v0.2.0 - Enhanced Features
- [ ] Workflow templates (explore-only, build-only)
- [ ] Hotfix and tweak workflows
- [ ] Better error recovery
- [ ] Multi-language support

### v0.3.0 - Integration
- [ ] Git hooks for commit verification
- [ ] CI/CD integration
- [ ] Team collaboration features

### v1.0.0 - Production Ready
- [ ] Full test coverage
- [ ] Complete documentation
- [ ] Performance optimization
- [ ] Community promotion

---

## Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build

# Format & lint
npm run format
npm run lint
```

---

## License

MIT

## Author

LeoKon3

## Credits

Inspired by:
- [Comet](https://github.com/rpamis/comet) - Workflow architecture
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) - Spec lifecycle
- [Superpowers](https://github.com/obra/superpowers) - Development methodology
