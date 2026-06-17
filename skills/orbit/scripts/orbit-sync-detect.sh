#!/bin/bash
# Orbit Sync Detector - Detect if documents are stale (hash mismatch)
# Usage: orbit-sync-detect.sh
# Exit 0 = all in sync, exit 1 = sync needed

set -euo pipefail

STATE_FILE=".orbit/state.yaml"

red() { echo -e "\033[31m$1\033[0m" >&2; }
green() { echo -e "\033[32m$1\033[0m" >&2; }
yellow() { echo -e "\033[33m$1\033[0m" >&2; }

if [ ! -f "$STATE_FILE" ]; then
  green "✓ No state file, nothing to sync"
  exit 0
fi

CHANGE=$(grep "^current_change:" "$STATE_FILE" | cut -d' ' -f2 || echo "")
if [ -z "$CHANGE" ]; then
  green "✓ No active change, nothing to sync"
  exit 0
fi

CHANGE_DIR=".orbit/changes/$CHANGE"
SYNC_NEEDED=0

# Helper to extract hash from state.yaml
get_state_hash() {
  local doc_type="$1"
  local field="$2"
  grep -A 5 "^  $doc_type:" "$STATE_FILE" | grep "^    $field:" | cut -d' ' -f2
}

# Check spec vs proposal
if [ -f "$CHANGE_DIR/spec.md" ] && [ -f "$CHANGE_DIR/proposal.md" ]; then
  CURRENT_PROPOSAL_HASH=$(sha256sum "$CHANGE_DIR/proposal.md" | cut -d' ' -f1)
  SPEC_BASED_ON=$(get_state_hash "spec" "based_on_proposal_hash")

  if [ -n "$SPEC_BASED_ON" ] && [ "$CURRENT_PROPOSAL_HASH" != "$SPEC_BASED_ON" ]; then
    yellow "⚠️  Proposal changed since spec was created"
    echo "   Proposal: ${CURRENT_PROPOSAL_HASH:0:12}..."
    echo "   Spec based on: ${SPEC_BASED_ON:0:12}..."
    SYNC_NEEDED=1
  fi
fi

# Check brainstorming vs spec
if [ -f "$CHANGE_DIR/brainstorming.md" ] && [ -f "$CHANGE_DIR/spec.md" ]; then
  CURRENT_SPEC_HASH=$(sha256sum "$CHANGE_DIR/spec.md" | cut -d' ' -f1)
  DESIGN_BASED_ON=$(get_state_hash "brainstorming" "based_on_spec_hash")

  if [ -n "$DESIGN_BASED_ON" ] && [ "$CURRENT_SPEC_HASH" != "$DESIGN_BASED_ON" ]; then
    yellow "⚠️  Spec changed since brainstorming was created"
    echo "   Spec: ${CURRENT_SPEC_HASH:0:12}..."
    echo "   Design based on: ${DESIGN_BASED_ON:0:12}..."
    SYNC_NEEDED=1
  fi
fi

# Check plan vs brainstorming
if [ -f "$CHANGE_DIR/plan.md" ] && [ -f "$CHANGE_DIR/brainstorming.md" ]; then
  CURRENT_DESIGN_HASH=$(sha256sum "$CHANGE_DIR/brainstorming.md" | cut -d' ' -f1)
  PLAN_BASED_ON=$(get_state_hash "plan" "based_on_brainstorming_hash")

  if [ -n "$PLAN_BASED_ON" ] && [ "$CURRENT_DESIGN_HASH" != "$PLAN_BASED_ON" ]; then
    yellow "⚠️  Design changed since plan was created"
    echo "   Design: ${CURRENT_DESIGN_HASH:0:12}..."
    echo "   Plan based on: ${PLAN_BASED_ON:0:12}..."
    SYNC_NEEDED=1
  fi
fi

# Check review vs plan
if [ -f "$CHANGE_DIR/review.md" ] && [ -f "$CHANGE_DIR/plan.md" ]; then
  CURRENT_PLAN_HASH=$(sha256sum "$CHANGE_DIR/plan.md" | cut -d' ' -f1)
  REVIEW_BASED_ON=$(get_state_hash "review" "based_on_plan_hash")

  if [ -n "$REVIEW_BASED_ON" ] && [ "$CURRENT_PLAN_HASH" != "$REVIEW_BASED_ON" ]; then
    yellow "⚠️  Plan changed since review was created"
    echo "   Plan: ${CURRENT_PLAN_HASH:0:12}..."
    echo "   Review based on: ${REVIEW_BASED_ON:0:12}..."
    SYNC_NEEDED=1
  fi
fi

if [ $SYNC_NEEDED -eq 1 ]; then
  echo ""
  yellow "🔄 Sync needed! Run orbit sync to update downstream documents."
  exit 1
else
  green "✓ All documents in sync"
  exit 0
fi
