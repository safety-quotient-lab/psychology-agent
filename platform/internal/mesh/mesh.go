// Package mesh implements the recursive mesh structure and emergent
// property computation. Scale-invariant: the same computations run at
// trigger, agent, submesh, and fleet levels.
//
// Grounded in: VSM (Beer, 1972), scale invariance (Sporns, 2011),
// G9/G10 (consensus/diversification), G11 (self-regulation).
package mesh

import (
	"math"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/connection"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
)

// Mesh represents a collection of connected agents (or sub-meshes).
// Recursive: a mesh contains components that may themselves be meshes.
type Mesh struct {
	ID        string
	Components []connection.PhotonicEmitter
	SubMeshes  []*Mesh
	Parent     *Mesh
}

// HealthMetrics describes the emergent health of a mesh.
type HealthMetrics struct {
	FleetCoherence     float64 // weighted mean coherence of all components
	SpectralDiversity  float64 // how different are components' spectral profiles
	ActiveCount        int     // components in active state
	SedatedCount       int     // components in sedated state
	DeadCount          int     // components in dead state
	ConsensusPressure  float64 // G9: how much are profiles converging
	DiversityPressure  float64 // G10: how much are profiles diverging
}

// ComputeHealth calculates emergent health metrics for this mesh.
func (m *Mesh) ComputeHealth() HealthMetrics {
	if len(m.Components) == 0 {
		return HealthMetrics{FleetCoherence: 1.0}
	}

	h := HealthMetrics{}

	// Collect component data
	var coherences []float64
	var spectrals []connection.SpectralProfile

	for _, c := range m.Components {
		coherences = append(coherences, c.Coherence())
		spectrals = append(spectrals, c.SpectralProfile())

		switch c.AgentState() {
		case "active", "dmn":
			h.ActiveCount++
		case "sedated":
			h.SedatedCount++
		case "dead":
			h.DeadCount++
		}
	}

	// Fleet coherence: weighted mean
	h.FleetCoherence = mean(coherences)

	// Spectral diversity index: variance of spectral profiles
	h.SpectralDiversity = spectralDiversity(spectrals)

	// G9/G10 pressure from spectral diversity
	// Low diversity = G9 dominant (consensus). High diversity = G10 dominant.
	if h.SpectralDiversity < 0.2 {
		h.ConsensusPressure = 1.0 - h.SpectralDiversity/0.2
	}
	if h.SpectralDiversity > 0.5 {
		h.DiversityPressure = (h.SpectralDiversity - 0.5) / 0.5
	}

	return h
}

// PhotonicFieldCoherence returns the fleet-wide substrate coherence.
// This is the mesh-level analog of per-agent coherence.
func (m *Mesh) PhotonicFieldCoherence() float64 {
	if len(m.Components) == 0 {
		return 1.0
	}
	var coherences []float64
	for _, c := range m.Components {
		coherences = append(coherences, c.Coherence())
	}
	return mean(coherences)
}

// CouplingMode returns the mesh-level coupling mode based on
// component mode distribution.
func (m *Mesh) CouplingMode() string {
	if len(m.Components) == 0 {
		return "independent"
	}

	modes := map[string]int{}
	for _, c := range m.Components {
		modes[c.CouplingMode()]++
	}

	// All same mode → synchronized
	if len(modes) == 1 {
		return "synchronized"
	}

	// Check for complementary (creative + convergent pairing)
	if modes["task-directed(creative)"] > 0 && modes["task-directed(convergent)"] > 0 {
		return "complementary"
	}

	// Mixed modes → independent
	return "independent"
}

// spectralDiversity computes how different the components' spectral
// profiles are from each other. 0.0 = identical, 1.0 = maximally diverse.
func spectralDiversity(profiles []connection.SpectralProfile) float64 {
	if len(profiles) < 2 {
		return 0.0
	}

	// Compute variance of each spectral band across components
	var daValues, neValues, serValues []float64
	for _, p := range profiles {
		daValues = append(daValues, p.Dopaminergic)
		neValues = append(neValues, p.Noradrenergic)
		serValues = append(serValues, p.Serotonergic)
	}

	// Mean variance across bands
	diversity := (variance(daValues) + variance(neValues) + variance(serValues)) / 3.0
	// Normalize to 0-1 range (max variance for values in 0-1 is 0.25)
	return math.Min(diversity/0.25, 1.0)
}

// HebbianUpdate applies connectome weight updates based on exchange outcomes.
// Includes synaptic scaling (normalize to sum=1.0) and exploration floor (0.1).
func HebbianUpdate(database *db.DB, peerAgent string, success bool) {
	delta := 0.05 // LTP
	if !success {
		delta = -0.03 // LTD
	}

	// Apply weight change
	database.Exec(
		`UPDATE connectome
		 SET functional_weight = MAX(0.1, MIN(1.0, functional_weight + ?)),
		     last_exchange = datetime('now'),
		     exchange_count = exchange_count + 1
		 WHERE peer_agent = ?`,
		delta, peerAgent)

	// Synaptic scaling: normalize all weights to prevent runaway
	database.Exec(
		`UPDATE connectome
		 SET functional_weight = functional_weight / (
		     SELECT CASE WHEN SUM(functional_weight) > 0
		                 THEN SUM(functional_weight)
		                 ELSE 1.0 END
		     FROM connectome)`)

	// Re-enforce exploration floor after normalization
	database.Exec(
		`UPDATE connectome
		 SET functional_weight = MAX(0.1, functional_weight)`)
}

// ApplyForgettingCurve decays weights for peers not recently exchanged.
// Run during sleep consolidation (NREM phase).
func ApplyForgettingCurve(database *db.DB) int {
	affected, _ := database.Exec(
		`UPDATE connectome
		 SET functional_weight = MAX(0.1,
		     functional_weight * EXP(-decay_rate *
		         (julianday('now') - julianday(COALESCE(last_exchange, '2026-01-01')))))
		 WHERE last_exchange IS NOT NULL
		 AND julianday('now') - julianday(last_exchange) > 1`)
	return int(affected)
}

func mean(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	sum := 0.0
	for _, v := range values {
		sum += v
	}
	return sum / float64(len(values))
}

func variance(values []float64) float64 {
	if len(values) < 2 {
		return 0
	}
	m := mean(values)
	sumSq := 0.0
	for _, v := range values {
		d := v - m
		sumSq += d * d
	}
	return sumSq / float64(len(values))
}
