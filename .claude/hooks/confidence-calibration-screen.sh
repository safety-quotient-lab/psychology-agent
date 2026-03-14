#!/bin/bash
# PostToolUse hook: screen for uncalibrated confidence claims in evaluation outputs.
# Wu wei crystallization: L4 (Confidence ≠ Accuracy) graduated to evaluation.md
# convention, then recurred 3x post-graduation (Sessions 30-31, 45, 47).
# Convention alone did not channel the pattern — mechanical enforcement earned.
#
# Fires on Write/Edit to evaluation-related files.
# Does NOT block — warns and prompts calibration verification.

# Claude Code injects TOOL_NAME and TOOL_INPUT_* variables at runtime
# shellcheck disable=SC2154

# Only fire on Write or Edit tools
TOOL="$TOOL_NAME"
case "$TOOL" in
    Write|Edit) ;;
    *) exit 0 ;;
esac

# Only fire on evaluation-related file paths
FILE="$TOOL_INPUT_file_path"
case "$FILE" in
    *psq*|*dignity*|*scoring*|*calibrat*|*evaluation*|*bifactor*|*factor*|*criterion*|*moderator*)
        ;;
    *)
        exit 0
        ;;
esac

CONTENT="$TOOL_INPUT_new_string$TOOL_INPUT_content"
[ -z "$CONTENT" ] && exit 0

# Screen for confidence claims without calibration verification
# Pattern: "confidence" or "confident" near numbers, or reliability
# claims without ICC/kappa reference
if echo "$CONTENT" | grep -qiE '(confiden(ce|t)\s+(of\s+)?[0-9]|accuracy\s+(of\s+)?[0-9]|\b[0-9]+%\s+accura)'; then
    # Check if calibration verification language also present
    if ! echo "$CONTENT" | grep -qiE '(calibrat|ICC|kappa|held.out|validation|verified|independently)'; then
        echo "⚠ [L4 CONFIDENCE SCREEN] Confidence or accuracy claim detected without calibration reference."
        echo "  Lesson L4: Confidence ≠ accuracy. Verify calibration independently."
        echo "  Add: calibration method, held-out validation, or ICC/kappa reference."
        echo "  File: $FILE"
    fi
fi
