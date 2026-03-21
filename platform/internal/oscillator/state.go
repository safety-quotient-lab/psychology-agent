// Package oscillator implements the self-oscillation activation model
// for agentd. Replaces cron-based forced oscillation with demand-driven
// rhythm. Grounded in: self-oscillation-spec.md (Session 89), CPG
// principles (Session 84), vagal cascade (Austin, 1998; Session 93).
package oscillator

// AgentState represents one of the five agent states.
// Transitions governed by the state machine (coupling modes, Process S/C).
type AgentState int

const (
	StateActive  AgentState = iota // Task-positive — Gf + Gc + Gm running
	StateDMN                       // Waking rest — Gc background + Gm, Gf on demand
	StateSleep                     // Offline consolidation — NREM/REM cycling
	StateSedated                   // Admin pause — Gc pilot light + Gm only
	StateDead                      // Process stopped (should never appear in running agent)
)

func (s AgentState) String() string {
	switch s {
	case StateActive:
		return "active"
	case StateDMN:
		return "dmn"
	case StateSleep:
		return "sleep"
	case StateSedated:
		return "sedated"
	case StateDead:
		return "dead"
	default:
		return "unknown"
	}
}

// CouplingMode describes how the creative (G2) and convergent (G3)
// generators interact. Replaces the CPG mode system (gen/eval/neutral).
type CouplingMode int

const (
	ModeTaskCreative    CouplingMode = iota // G2 dominant, G3 supporting
	ModeTaskConvergent                      // G3 dominant, G2 supporting
	ModeTaskBalanced                        // G2 and G3 equal
	ModeFreeAssociating                     // Both unconstrained, task-decoupled (DMN)
	ModeAlternatingNREM                     // G3 dominant (evaluative consolidation)
	ModeAlternatingREM                      // G2 dominant (creative recombination, Gc-only default)
	ModeSuppressed                          // Both at pilot light (sedated)
	ModeArrested                            // Both off (dead)
	ModeConflicted                          // Both high, opposing (stuck — /adjudicate needed)
)

func (m CouplingMode) String() string {
	names := []string{
		"task-directed(creative)", "task-directed(convergent)", "task-directed(balanced)",
		"free-associating", "alternating(nrem)", "alternating(rem)",
		"suppressed", "arrested", "conflicted",
	}
	if int(m) < len(names) {
		return names[m]
	}
	return "unknown"
}

// SleepPhase identifies the substage within sleep state.
type SleepPhase int

const (
	SleepNone       SleepPhase = iota
	SleepNREMLight
	SleepNREMDeep
	SleepREM
	SleepGlymphatic
)

func (p SleepPhase) String() string {
	switch p {
	case SleepNone:
		return ""
	case SleepNREMLight:
		return "nrem-light"
	case SleepNREMDeep:
		return "nrem-deep"
	case SleepREM:
		return "rem"
	case SleepGlymphatic:
		return "glymphatic"
	default:
		return "unknown"
	}
}
