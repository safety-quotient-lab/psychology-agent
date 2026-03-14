// Package server — sanitize.go strips visually-hidden content from text.
//
// Defends against prompt injection via CSS-hidden text: content invisible
// to human eyes but readable by LLMs processing raw HTML/text.
// Applied to agent-provided text before rendering in dashboard context.
package server

import (
	"regexp"
	"strings"
)

// hiddenPatterns match CSS/HTML patterns that hide content visually.
var hiddenPatterns = []*regexp.Regexp{
	// Class-based hiding
	regexp.MustCompile(`(?i)<[^>]*class="[^"]*(?:visually-hidden|sr-only|screen-reader-only|offscreen|clip-hide)[^"]*"[^>]*>[\s\S]*?</[^>]+>`),
	// Style-based hiding
	regexp.MustCompile(`(?i)<[^>]*style="[^"]*(?:clip\s*:\s*rect\s*\(\s*0|clip-path\s*:\s*inset\s*\(\s*50%|display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?:\s|;|"))[^"]*"[^>]*>[\s\S]*?</[^>]+>`),
	// aria-hidden
	regexp.MustCompile(`(?i)<[^>]*aria-hidden="true"[^>]*>[\s\S]*?</[^>]+>`),
	// noscript
	regexp.MustCompile(`(?i)<noscript[^>]*>[\s\S]*?</noscript>`),
	// HTML comments (can carry hidden instructions)
	regexp.MustCompile(`<!--[\s\S]*?-->`),
}

// StripHiddenContent removes visually-hidden HTML elements from text.
// Returns the cleaned text and count of elements stripped.
func StripHiddenContent(html string) (string, int) {
	count := 0
	result := html
	for _, pattern := range hiddenPatterns {
		matches := pattern.FindAllString(result, -1)
		count += len(matches)
		result = pattern.ReplaceAllString(result, "")
	}
	// Clean up excessive whitespace left by removals
	result = regexp.MustCompile(`\n{3,}`).ReplaceAllString(result, "\n\n")
	return strings.TrimSpace(result), count
}

// invisibleRunes contains Unicode characters that render as invisible
// but carry content readable by text processors. Used for prompt injection.
var invisibleRunePattern = regexp.MustCompile(
	"[\u200B\u200C\u200D\u200E\u200F" + // zero-width spaces + direction marks
		"\u2060\u2061\u2062\u2063\u2064" + // word joiner + invisible operators
		"\uFEFF" + // byte order mark
		"\u00AD" + // soft hyphen
		"\u034F" + // combining grapheme joiner
		"\u061C" + // Arabic letter mark
		"\u115F\u1160" + // Hangul fillers
		"\u17B4\u17B5" + // Khmer vowel inherent
		"\u180E" + // Mongolian vowel separator
		"\u2000-\u200A" + // various width spaces
		"\u202A-\u202E" + // bidi embedding/override
		"\u2066-\u2069" + // bidi isolate
		"\uFFF9-\uFFFB" + // interlinear annotation
		"\U000E0001-\U000E007F" + // tag characters (invisible ASCII in plane 14)
		"]+")

// SanitizeAgentText ensures text from agent-provided data contains no
// HTML tags, invisible Unicode, or hidden content that could carry
// prompt injection payloads.
func SanitizeAgentText(s string) string {
	// Remove all HTML tags
	stripped := regexp.MustCompile(`<[^>]*>`).ReplaceAllString(s, "")
	// Remove invisible Unicode characters
	stripped = invisibleRunePattern.ReplaceAllString(stripped, "")
	// Decode common entities
	stripped = strings.ReplaceAll(stripped, "&amp;", "&")
	stripped = strings.ReplaceAll(stripped, "&lt;", "<")
	stripped = strings.ReplaceAll(stripped, "&gt;", ">")
	stripped = strings.ReplaceAll(stripped, "&quot;", "\"")
	stripped = strings.ReplaceAll(stripped, "&#39;", "'")
	return strings.TrimSpace(stripped)
}

// StripInvisibleUnicode removes zero-width and invisible Unicode characters
// from a string. Use on any text before LLM processing.
func StripInvisibleUnicode(s string) string {
	return invisibleRunePattern.ReplaceAllString(s, "")
}
