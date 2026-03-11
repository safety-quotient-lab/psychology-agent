package collector

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// TODOSummary holds parsed TODO.md data.
type TODOSummary struct {
	Sections      []TODOSection `json:"sections"`
	TotalOpen     int           `json:"total_open"`
	TotalComplete int           `json:"total_complete"`
}

// TODOSection holds one section of TODO.md.
type TODOSection struct {
	Name     string     `json:"name"`
	Open     int        `json:"open"`
	Complete int        `json:"complete"`
	Items    []TODOItem `json:"items"`
}

// TODOItem holds a single TODO item.
type TODOItem struct {
	Label string `json:"label"`
	Done  bool   `json:"done"`
}

var boldItemRe = regexp.MustCompile(`^- \[ \] \*\*(.+?)\*\*`)

// ParseTODO reads TODO.md and returns open/complete counts by section.
func ParseTODO(projectRoot string) TODOSummary {
	path := filepath.Join(projectRoot, "TODO.md")
	data, err := os.ReadFile(path)
	if err != nil {
		return TODOSummary{}
	}

	var sections []TODOSection
	var current *TODOSection
	totalOpen, totalComplete := 0, 0

	for _, line := range strings.Split(string(data), "\n") {
		if strings.HasPrefix(line, "## ") {
			if current != nil {
				sections = append(sections, *current)
			}
			name := strings.TrimLeft(line, "# ")
			current = &TODOSection{Name: strings.TrimSpace(name)}
			continue
		}
		if current == nil {
			continue
		}

		stripped := strings.TrimSpace(line)
		if strings.HasPrefix(stripped, "- [ ] ") {
			current.Open++
			totalOpen++
			label := stripped[6:]
			if len(label) > 60 {
				label = label[:60]
			}
			if m := boldItemRe.FindStringSubmatch(stripped); len(m) > 1 {
				label = m[1]
			}
			current.Items = append(current.Items, TODOItem{Label: label, Done: false})
		} else if strings.HasPrefix(stripped, "- [x] ") {
			current.Complete++
			totalComplete++
		}
	}
	if current != nil {
		sections = append(sections, *current)
	}

	// Filter to sections with open items
	var active []TODOSection
	for _, s := range sections {
		if s.Open > 0 {
			active = append(active, s)
		}
	}

	return TODOSummary{
		Sections:      active,
		TotalOpen:     totalOpen,
		TotalComplete: totalComplete,
	}
}
