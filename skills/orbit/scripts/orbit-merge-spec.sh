#!/bin/bash
# Orbit Spec Merger - Intelligently merge change spec into main specs
# Usage: orbit-merge-spec.sh <change-name>
# Exit 0 = merge successful, exit 1 = merge failed

set -euo pipefail

CHANGE_NAME="$1"
CHANGE_SPEC=".orbit/changes/$CHANGE_NAME/spec.md"

red() { echo -e "\033[31m$1\033[0m" >&2; }
green() { echo -e "\033[32m$1\033[0m" >&2; }
yellow() { echo -e "\033[33m$1\033[0m" >&2; }
blue() { echo -e "\033[34m$1\033[0m" >&2; }

if [ ! -f "$CHANGE_SPEC" ]; then
  red "✗ Change spec not found: $CHANGE_SPEC"
  exit 1
fi

# Extract topic from spec title (first # heading)
TOPIC=$(grep -m 1 "^# " "$CHANGE_SPEC" | sed 's/^# //' | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g')

if [ -z "$TOPIC" ]; then
  red "✗ Could not determine topic from spec title"
  exit 1
fi

MAIN_SPEC=".orbit/specs/$TOPIC.md"
mkdir -p .orbit/specs

blue "📝 Merging spec for topic: $TOPIC"

# If main spec doesn't exist, copy change spec directly
if [ ! -f "$MAIN_SPEC" ]; then
  blue "   Creating new main spec: $MAIN_SPEC"

  # Copy spec and add change history section
  cp "$CHANGE_SPEC" "$MAIN_SPEC"

  # Add change history at the end
  ARCHIVE_DATE=$(date +%Y-%m-%d)
  cat >> "$MAIN_SPEC" << EOF

---

## Change History

- $ARCHIVE_DATE: $CHANGE_NAME - Initial specification (archived: .orbit/archive/$ARCHIVE_DATE-$CHANGE_NAME/)
EOF

  green "✓ Created new main spec"
  exit 0
fi

# Main spec exists - need to merge intelligently
blue "   Main spec exists, performing intelligent merge..."

# Create temporary file for merged content
TEMP_MERGE=$(mktemp)

# Strategy: Append new requirements and add change history entry
# This is a simplified merge - Claude will handle complex semantic merging
cat "$MAIN_SPEC" > "$TEMP_MERGE"

# Check if change history section exists
if ! grep -q "^## Change History" "$TEMP_MERGE"; then
  echo "" >> "$TEMP_MERGE"
  echo "---" >> "$TEMP_MERGE"
  echo "" >> "$TEMP_MERGE"
  echo "## Change History" >> "$TEMP_MERGE"
  echo "" >> "$TEMP_MERGE"
fi

# Add this change to history
ARCHIVE_DATE=$(date +%Y-%m-%d)
CHANGE_TITLE=$(grep -m 1 "^# " "$CHANGE_SPEC" | sed 's/^# //')

# Insert before the last line of Change History section (to maintain chronological order at top)
sed -i "/^## Change History/a\\- $ARCHIVE_DATE: $CHANGE_NAME - $CHANGE_TITLE (archived: .orbit/archive/$ARCHIVE_DATE-$CHANGE_NAME/)" "$TEMP_MERGE"

# For now, output the change spec requirements for Claude to manually merge
# In a full implementation, this would do semantic diff and merge
echo ""
yellow "📋 Requirements from change spec that may need merging:"
echo ""
grep -A 100 "^## Requirements" "$CHANGE_SPEC" | grep -v "^## Change History" || true
echo ""

# Move temp to main
mv "$TEMP_MERGE" "$MAIN_SPEC"

green "✓ Updated change history in main spec"
yellow "⚠️  Note: Review $MAIN_SPEC to manually merge new requirements if needed"

exit 0
