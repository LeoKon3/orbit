#!/bin/bash
# Orbit Phase Guard - Validate phase transitions
# Usage: orbit-phase-guard.sh <target-phase>
# Exit 0 = can transition, exit 1 = cannot transition

set -euo pipefail

STATE_FILE=".orbit/state.yaml"
TARGET_PHASE="$1"

red() { echo -e "\033[31m$1\033[0m" >&2; }
green() { echo -e "\033[32m$1\033[0m" >&2; }
yellow() { echo -e "\033[33m$1\033[0m" >&2; }

# Check if state exists
if [ ! -f "$STATE_FILE" ]; then
  if [ "$TARGET_PHASE" = "explore" ]; then
    green "✓ Can start with explore phase"
    exit 0
  else
    red "✗ No state file. Must start with explore phase first."
    exit 1
  fi
fi

CURRENT_PHASE=$(grep "^phase:" "$STATE_FILE" | cut -d' ' -f2 || echo "none")
CHANGE=$(grep "^current_change:" "$STATE_FILE" | cut -d' ' -f2 || echo "")
CHANGE_DIR=".orbit/changes/$CHANGE"

# Phase transition rules
case "$TARGET_PHASE" in
  explore)
    green "✓ Can always start explore phase"
    exit 0
    ;;

  brainstorming)
    # Requires: explore complete with proposal.md and spec.md
    if [ ! -f "$CHANGE_DIR/proposal.md" ]; then
      red "✗ Missing proposal.md. Run explore phase first."
      exit 1
    fi
    if [ ! -f "$CHANGE_DIR/spec.md" ]; then
      red "✗ Missing spec.md. Run explore phase first."
      exit 1
    fi
    green "✓ Can transition to brainstorming phase"
    exit 0
    ;;

  build)
    # Requires: brainstorming complete with brainstorming.md
    if [ ! -f "$CHANGE_DIR/brainstorming.md" ]; then
      red "✗ Missing brainstorming.md. Run brainstorming phase first."
      exit 1
    fi
    green "✓ Can transition to build phase"
    exit 0
    ;;

  review)
    # Requires: build complete with plan.md
    if [ ! -f "$CHANGE_DIR/plan.md" ]; then
      red "✗ Missing plan.md. Run build phase (planning) first."
      exit 1
    fi
    green "✓ Can transition to review phase"
    exit 0
    ;;

  archive)
    # Requires: review complete with review.md showing passed
    if [ ! -f "$CHANGE_DIR/review.md" ]; then
      red "✗ Missing review.md. Run review phase first."
      exit 1
    fi

    # Check if review passed
    if grep -q "Status:.*PASS" "$CHANGE_DIR/review.md" 2>/dev/null; then
      green "✓ Can transition to archive phase"
      exit 0
    else
      red "✗ Review has not passed. Fix issues before archiving."
      exit 1
    fi
    ;;

  *)
    red "✗ Unknown phase: $TARGET_PHASE"
    exit 1
    ;;
esac
