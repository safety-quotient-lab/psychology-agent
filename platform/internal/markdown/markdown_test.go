package markdown

import (
	"testing"
)

func TestExtractHeadings(t *testing.T) {
	source := []byte(`# Top Level

Some text.

## Section One

Content here.

## Section Two

### Subsection

More content.
`)

	headings := ExtractHeadings(source)
	if len(headings) != 4 {
		t.Fatalf("expected 4 headings, got %d", len(headings))
	}
	if headings[0].Level != 1 || headings[0].Text != "Top Level" {
		t.Errorf("heading 0: got level=%d text=%q", headings[0].Level, headings[0].Text)
	}
	if headings[1].Level != 2 || headings[1].Text != "Section One" {
		t.Errorf("heading 1: got level=%d text=%q", headings[1].Level, headings[1].Text)
	}
	if headings[3].Level != 3 || headings[3].Text != "Subsection" {
		t.Errorf("heading 3: got level=%d text=%q", headings[3].Level, headings[3].Text)
	}
}

func TestExtractSection(t *testing.T) {
	source := []byte(`# Doc

## Active Thread

Session 95 content here.
Next priority: build things.

## Other Section

Different content.
`)

	sec := ExtractSection(source, "Active Thread")
	if sec == nil {
		t.Fatal("expected section, got nil")
	}
	content := string(sec.Content)
	if len(content) == 0 {
		t.Fatal("expected non-empty section content")
	}
	if sec.Heading.Level != 2 {
		t.Errorf("expected level 2, got %d", sec.Heading.Level)
	}
}

func TestRenderHTML(t *testing.T) {
	source := []byte("**bold** and *italic* and `code`")
	html := RenderHTML(source)
	if html == "" {
		t.Fatal("expected non-empty HTML")
	}
	if !contains(html, "<strong>bold</strong>") {
		t.Errorf("expected <strong>, got %q", html)
	}
	if !contains(html, "<em>italic</em>") {
		t.Errorf("expected <em>, got %q", html)
	}
	if !contains(html, "<code>code</code>") {
		t.Errorf("expected <code>, got %q", html)
	}
}

func TestExtractLinks(t *testing.T) {
	source := []byte(`See [architecture](docs/architecture.md) and [glossary](docs/glossary.md).`)

	links := ExtractLinks(source)
	if len(links) != 2 {
		t.Fatalf("expected 2 links, got %d", len(links))
	}
	if links[0].Text != "architecture" || links[0].Destination != "docs/architecture.md" {
		t.Errorf("link 0: got text=%q dest=%q", links[0].Text, links[0].Destination)
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && searchString(s, substr)
}

func searchString(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
