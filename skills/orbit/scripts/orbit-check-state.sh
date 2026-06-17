#!/bin/bash
# Orbit State Checker - Check current workflow state
# Usage: orbit-check-state.sh
# Exit 0 = valid state, exit 1 = invalid/missing state

set -euo pipefail

STATE_FILE=".orbit/state.yaml"

# Colors
red() { echo -e "\033[31m$1\033[0m" >&2; }
green() { echo -e "\033[32m$1\033[0m" >&2; }
yellow() { echo -e "\033[33m$1\033[0m" >&2; }
blue() { echo -e "\033[34m$1\033[0m" >&2; }

# Check if state file exists
if [ ! -f "$STATE_FILE" ]; then
  yellow "📍 No state found (.orbit/state.yaml)"
  echo "PHASE=none"
  echo "CHANGE="
  echo "WORKFLOW="
  exit 0
fi

# Extract state fields
PHASE=$(grep "^phase:" "$STATE_FILE" | cut -d' ' -f2 || echo "unknown")
CHANGE=$(grep "^current_change:" "$STATE_FILE" | cut -d' ' -f2 || echo "")
WORKFLOW=$(grep "^workflow:" "$STATE_FILE" | cut -d' ' -f2 || echo "full")

# Output for parsing
echo "PHASE=$PHASE"
echo "CHANGE=$CHANGE"
echo "WORKFLOW=$WORKFLOW"

# Human-readable status
blue "📍 Current State:"
echo "   Workflow: $WORKFLOW"
echo "   Phase: $PHASE"
echo "   Change: $CHANGE"

# Check if change directory exists
if [ -n "$CHANGE" ]; then
  CHANGE_DIR=".orbit/changes/$CHANGE"
  if [ ! -d "$CHANGE_DIR" ]; then
    red "⚠️  Warning: Change directory not found: $CHANGE_DIR"
    exit 1
  fi

  # List documents in change directory
  echo ""
  blue "📄 Documents:"
  [ -f "$CHANGE_DIR/proposal.md" ] && green "   ✓ proposal.md" || echo "   ✗ proposal.md"
  [ -f "$CHANGE_DIR/spec.md" ] && green "   ✓ spec.md" || echo "   ✗ spec.md"
  [ -f "$CHANGE_DIR/design.md" ] && green "   ✓ design.md" || echo "   ✗ design.md"
  [ -f "$CHANGE_DIR/plan.md" ] && green "   ✓ plan.md" || echo "   ✗ plan.md"
  [ -f "$CHANGE_DIR/review.md" ] && green "   ✓ review.md" || echo "   ✗ review.md"
fi

exit 0
