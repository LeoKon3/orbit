#!/bin/bash
# Orbit Hash Updater - Update document hashes in state.yaml
# Usage: orbit-update-hash.sh <doc-type> <file-path>
# Example: orbit-update-hash.sh spec .orbit/changes/my-feature/spec.md

set -euo pipefail

STATE_FILE=".orbit/state.yaml"
DOC_TYPE="$1"
FILE_PATH="$2"

red() { echo -e "\033[31m$1\033[0m" >&2; }
green() { echo -e "\033[32m$1\033[0m" >&2; }

if [ ! -f "$STATE_FILE" ]; then
  red "✗ State file not found: $STATE_FILE"
  exit 1
fi

if [ ! -f "$FILE_PATH" ]; then
  red "✗ File not found: $FILE_PATH"
  exit 1
fi

# Calculate SHA256 hash
NEW_HASH=$(sha256sum "$FILE_PATH" | cut -d' ' -f1)

# Get parent document hash if needed
PARENT_HASH=""
case "$DOC_TYPE" in
  spec)
    # Spec is based on proposal
    CHANGE=$(grep "^current_change:" "$STATE_FILE" | cut -d' ' -f2)
    PROPOSAL_PATH=".orbit/changes/$CHANGE/proposal.md"
    if [ -f "$PROPOSAL_PATH" ]; then
      PARENT_HASH=$(sha256sum "$PROPOSAL_PATH" | cut -d' ' -f1)
    fi
    ;;
  brainstorming)
    # Design is based on spec
    CHANGE=$(grep "^current_change:" "$STATE_FILE" | cut -d' ' -f2)
    SPEC_PATH=".orbit/changes/$CHANGE/spec.md"
    if [ -f "$SPEC_PATH" ]; then
      PARENT_HASH=$(sha256sum "$SPEC_PATH" | cut -d' ' -f1)
    fi
    ;;
  plan)
    # Plan is based on brainstorming
    CHANGE=$(grep "^current_change:" "$STATE_FILE" | cut -d' ' -f2)
    DESIGN_PATH=".orbit/changes/$CHANGE/brainstorming.md"
    if [ -f "$DESIGN_PATH" ]; then
      PARENT_HASH=$(sha256sum "$DESIGN_PATH" | cut -d' ' -f1)
    fi
    ;;
  review)
    # Review is based on plan
    CHANGE=$(grep "^current_change:" "$STATE_FILE" | cut -d' ' -f2)
    PLAN_PATH=".orbit/changes/$CHANGE/plan.md"
    if [ -f "$PLAN_PATH" ]; then
      PARENT_HASH=$(sha256sum "$PLAN_PATH" | cut -d' ' -f1)
    fi
    ;;
esac

# Update state.yaml
# First ensure documents section exists
if ! grep -q "^documents:" "$STATE_FILE"; then
  echo "documents:" >> "$STATE_FILE"
fi

# Check if doc type section exists
if grep -q "^  $DOC_TYPE:" "$STATE_FILE"; then
  # Update existing hash
  sed -i "/^  $DOC_TYPE:/,/^  [a-z]/ s|^    hash:.*|    hash: $NEW_HASH|" "$STATE_FILE"

  # Update parent hash if exists
  if [ -n "$PARENT_HASH" ]; then
    case "$DOC_TYPE" in
      spec)
        sed -i "/^  $DOC_TYPE:/,/^  [a-z]/ s|^    based_on_proposal_hash:.*|    based_on_proposal_hash: $PARENT_HASH|" "$STATE_FILE"
        ;;
      brainstorming)
        sed -i "/^  $DOC_TYPE:/,/^  [a-z]/ s|^    based_on_spec_hash:.*|    based_on_spec_hash: $PARENT_HASH|" "$STATE_FILE"
        ;;
      plan)
        sed -i "/^  $DOC_TYPE:/,/^  [a-z]/ s|^    based_on_brainstorming_hash:.*|    based_on_brainstorming_hash: $PARENT_HASH|" "$STATE_FILE"
        ;;
      review)
        sed -i "/^  $DOC_TYPE:/,/^  [a-z]/ s|^    based_on_plan_hash:.*|    based_on_plan_hash: $PARENT_HASH|" "$STATE_FILE"
        ;;
    esac
  fi
else
  # Add new doc section
  {
    echo "  $DOC_TYPE:"
    echo "    path: $FILE_PATH"
    echo "    hash: $NEW_HASH"

    # Add parent hash reference
    case "$DOC_TYPE" in
      spec)
        [ -n "$PARENT_HASH" ] && echo "    based_on_proposal_hash: $PARENT_HASH"
        ;;
      brainstorming)
        [ -n "$PARENT_HASH" ] && echo "    based_on_spec_hash: $PARENT_HASH"
        ;;
      plan)
        [ -n "$PARENT_HASH" ] && echo "    based_on_brainstorming_hash: $PARENT_HASH"
        ;;
      review)
        [ -n "$PARENT_HASH" ] && echo "    based_on_plan_hash: $PARENT_HASH"
        ;;
    esac
  } >> "$STATE_FILE"
fi

green "✓ Updated $DOC_TYPE hash: ${NEW_HASH:0:12}..."
[ -n "$PARENT_HASH" ] && green "✓ Parent hash: ${PARENT_HASH:0:12}..."

exit 0
