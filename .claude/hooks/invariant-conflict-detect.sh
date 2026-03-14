#!/bin/bash
# PostToolUse hook: detect potential structural invariant conflicts.
#
# Fires on Write/Edit to governance files. Checks whether the written
# content references multiple invariants — potential conflict requiring
# maqasid priority resolution.
#
# Evaluation dimension 10, extension 4: maqasid invocation mechanism
# Evaluation dimension 4: invariant mechanical verification

# Claude Code injects TOOL_NAME and TOOL_INPUT_* variables at runtime
# shellcheck disable=SC2154
TOOL="$TOOL_NAME"
case "$TOOL" in
    Write|Edit) ;;
    *) exit 0 ;;
esac

FILE="$TOOL_INPUT_file_path"
case "$FILE" in
    *governance*|*architecture*|*CLAUDE*|*cognitive-triggers*|*ef1-*|*invariant*)
        ;;
    *)
        exit 0
        ;;
esac

CONTENT="$TOOL_INPUT_new_string$TOOL_INPUT_content"
[ -z "$CONTENT" ] && exit 0

# Count how many structural invariants the content references
INVARIANT_COUNT=0
echo "$CONTENT" | grep -qi "worth precedes merit\|invariant 1\|worth-precedes" && INVARIANT_COUNT=$((INVARIANT_COUNT + 1))
echo "$CONTENT" | grep -qi "protection requires structure\|invariant 2\|protection-requires" && INVARIANT_COUNT=$((INVARIANT_COUNT + 1))
echo "$CONTENT" | grep -qi "coupled generators\|generator.*never\|invariant 3" && INVARIANT_COUNT=$((INVARIANT_COUNT + 1))
echo "$CONTENT" | grep -qi "governance captures\|invariant 4\|captures-itself" && INVARIANT_COUNT=$((INVARIANT_COUNT + 1))
echo "$CONTENT" | grep -qi "no single architecture\|invariant 5\|architecture-dominates" && INVARIANT_COUNT=$((INVARIANT_COUNT + 1))

if [ "$INVARIANT_COUNT" -ge 2 ]; then
    echo "⚠ [INVARIANT CONFLICT CHECK] Content references ${INVARIANT_COUNT} structural invariants."
    echo "  If these invariants produce conflicting guidance, apply maqasid priority:"
    echo "  NECESSITY (1,2) > NEED (3,4) > EMBELLISHMENT (5)"
    echo "  See: docs/ef1-governance.md § Priority hierarchy"
fi
