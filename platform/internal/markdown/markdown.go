// Package markdown provides unified markdown parsing and rendering for
// the psychology-agent platform. All markdown processing (vocabulary
// extraction, TODO parsing, MEMORY.md parsing, LCARS document rendering)
// routes through this package — no string splitting on markdown elsewhere.
//
// Built on goldmark (MIT). Three operations:
//   - Parse: markdown bytes → goldmark AST
//   - Render: AST (or subset) → HTML string for LCARS panels
//   - Extract: AST → structured data (headings, checkboxes, links, sections)
package markdown

import (
	"bytes"
	"strings"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/text"
)

// parser holds the shared goldmark instance. Configured once, reused.
var parser = goldmark.New()

// Heading represents a parsed markdown heading with level and content.
type Heading struct {
	Level int    // 1-6
	Text  string // plain text content
	Line  int    // source line number
}

// Checkbox represents a parsed markdown checkbox item.
type Checkbox struct {
	Checked bool
	Label   string
	Line    int
}

// Link represents a parsed markdown link.
type Link struct {
	Text        string
	Destination string
	Line        int
}

// Section represents a heading and everything below it until the next
// heading of equal or higher level.
type Section struct {
	Heading Heading
	Content []byte // raw markdown bytes of section body
}

// Parse converts markdown bytes into a goldmark AST root node.
// The source bytes must remain valid for the lifetime of the returned
// node (goldmark AST references source positions, not copied strings).
func Parse(source []byte) ast.Node {
	reader := text.NewReader(source)
	doc := parser.Parser().Parse(reader)
	return doc
}

// RenderHTML converts markdown bytes to an HTML string suitable for
// embedding in LCARS data panels. Uses goldmark's default renderer.
func RenderHTML(source []byte) string {
	var buf bytes.Buffer
	if err := parser.Convert(source, &buf); err != nil {
		return string(source) // fallback: return raw markdown
	}
	return buf.String()
}

// RenderSectionHTML extracts a named section from markdown source and
// renders it to HTML. Returns empty string if section not found.
func RenderSectionHTML(source []byte, sectionName string) string {
	sec := ExtractSection(source, sectionName)
	if sec == nil {
		return ""
	}
	return RenderHTML(sec.Content)
}

// ExtractHeadings returns all headings from a parsed markdown document.
func ExtractHeadings(source []byte) []Heading {
	doc := Parse(source)
	var headings []Heading

	ast.Walk(doc, func(node ast.Node, entering bool) (ast.WalkStatus, error) {
		if !entering {
			return ast.WalkContinue, nil
		}
		if h, ok := node.(*ast.Heading); ok {
			headings = append(headings, Heading{
				Level: h.Level,
				Text:  extractText(node, source),
				Line:  lineNumber(node),
			})
		}
		return ast.WalkContinue, nil
	})

	return headings
}

// ExtractCheckboxes returns all checkbox list items from markdown source.
func ExtractCheckboxes(source []byte) []Checkbox {
	doc := Parse(source)
	var boxes []Checkbox

	ast.Walk(doc, func(node ast.Node, entering bool) (ast.WalkStatus, error) {
		if !entering {
			return ast.WalkContinue, nil
		}
		if li, ok := node.(*ast.ListItem); ok {
			// Check for task list marker: lines starting with [ ] or [x]
			if li.ChildCount() > 0 {
				firstChild := li.FirstChild()
				if para, ok := firstChild.(*ast.Paragraph); ok {
					text := extractText(para, source)
					if strings.HasPrefix(text, "[ ] ") {
						boxes = append(boxes, Checkbox{
							Checked: false,
							Label:   strings.TrimPrefix(text, "[ ] "),
							Line:    lineNumber(node),
						})
					} else if strings.HasPrefix(text, "[x] ") || strings.HasPrefix(text, "[X] ") {
						boxes = append(boxes, Checkbox{
							Checked: true,
							Label:   strings.TrimPrefix(strings.TrimPrefix(text, "[x] "), "[X] "),
							Line:    lineNumber(node),
						})
					}
				}
			}
		}
		return ast.WalkContinue, nil
	})

	return boxes
}

// ExtractLinks returns all links from markdown source.
func ExtractLinks(source []byte) []Link {
	doc := Parse(source)
	var links []Link

	ast.Walk(doc, func(node ast.Node, entering bool) (ast.WalkStatus, error) {
		if !entering {
			return ast.WalkContinue, nil
		}
		if l, ok := node.(*ast.Link); ok {
			links = append(links, Link{
				Text:        extractText(node, source),
				Destination: string(l.Destination),
				Line:        lineNumber(node),
			})
		}
		return ast.WalkContinue, nil
	})

	return links
}

// ExtractSection finds a section by heading name and returns its content.
// Matches case-insensitively. Returns nil if not found.
// The section includes everything from the heading to the next heading
// of equal or higher level (or end of document).
func ExtractSection(source []byte, name string) *Section {
	doc := Parse(source)
	nameLower := strings.ToLower(strings.TrimSpace(name))

	var targetLevel int
	var startOffset, endOffset int
	found := false

	ast.Walk(doc, func(node ast.Node, entering bool) (ast.WalkStatus, error) {
		if !entering {
			return ast.WalkContinue, nil
		}
		h, ok := node.(*ast.Heading)
		if !ok {
			return ast.WalkContinue, nil
		}

		headingText := strings.ToLower(strings.TrimSpace(extractText(node, source)))

		if !found && headingText == nameLower {
			found = true
			targetLevel = h.Level
			// Content starts after this heading line
			if node.NextSibling() != nil {
				startOffset = nodeStart(node.NextSibling())
			}
			return ast.WalkContinue, nil
		}

		if found && h.Level <= targetLevel {
			// Next heading of equal or higher level — section ends here
			endOffset = nodeStart(node)
			return ast.WalkStop, nil
		}

		return ast.WalkContinue, nil
	})

	if !found {
		return nil
	}

	if endOffset == 0 {
		endOffset = len(source)
	}

	if startOffset >= endOffset {
		return &Section{
			Heading: Heading{Level: targetLevel, Text: name},
			Content: nil,
		}
	}

	return &Section{
		Heading: Heading{Level: targetLevel, Text: name},
		Content: source[startOffset:endOffset],
	}
}

// extractText collects all text content under a node.
func extractText(node ast.Node, source []byte) string {
	var buf strings.Builder
	ast.Walk(node, func(child ast.Node, entering bool) (ast.WalkStatus, error) {
		if !entering {
			return ast.WalkContinue, nil
		}
		if t, ok := child.(*ast.Text); ok {
			buf.Write(t.Segment.Value(source))
			if t.SoftLineBreak() {
				buf.WriteByte(' ')
			}
		}
		return ast.WalkContinue, nil
	})
	return buf.String()
}

// lineNumber returns the byte offset of a node as a proxy for line
// number. goldmark does not track line numbers directly. Returns 0
// for inline nodes that lack line segment data.
func lineNumber(node ast.Node) int {
	// Inline nodes (Link, Emphasis, etc.) panic on Lines() — guard.
	if node.Type() == ast.TypeInline {
		// Walk up to the nearest block parent for position
		parent := node.Parent()
		if parent != nil && parent.Type() != ast.TypeInline {
			return lineNumber(parent)
		}
		return 0
	}
	if node.Lines().Len() > 0 {
		return node.Lines().At(0).Start
	}
	return 0
}

// nodeStart returns the byte offset where a node begins in the source.
func nodeStart(node ast.Node) int {
	// Guard against inline nodes
	if node.Type() == ast.TypeInline {
		parent := node.Parent()
		if parent != nil {
			return nodeStart(parent)
		}
		return 0
	}
	if node.Lines().Len() > 0 {
		return node.Lines().At(0).Start
	}
	// For container nodes, check first child
	if node.ChildCount() > 0 {
		return nodeStart(node.FirstChild())
	}
	return 0
}
