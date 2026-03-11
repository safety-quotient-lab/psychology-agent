package collector

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
	"github.com/safety-quotient-lab/psychology-agent/platform/internal/registry"
)

// Status holds the complete mesh status snapshot.
type Status struct {
	AgentID        string                    `json:"agent_id"`
	CollectedAt    string                    `json:"collected_at"`
	DBPath         string                    `json:"db_path"`
	DBExists       bool                      `json:"db_exists"`
	SchemaVersion  int                       `json:"schema_version"`
	TrustBudget    map[string]any            `json:"trust_budget"`
	ActiveGates    []map[string]any          `json:"active_gates"`
	Unprocessed    []map[string]any          `json:"unprocessed_messages"`
	RecentMessages []map[string]any          `json:"recent_messages"`
	RecentActions  []map[string]any          `json:"recent_actions"`
	Peers          []map[string]any          `json:"peers"`
	MessageCounts  []map[string]any          `json:"message_counts"`
	RegistryAgents map[string]RegistryInfo   `json:"registry_agents"`
	RemoteStates   []map[string]any          `json:"remote_states"`
	Totals         Totals                    `json:"totals"`
	Heartbeat      map[string]any            `json:"heartbeat"`
	Schedule       Schedule                  `json:"schedule"`
	Semiotics      Semiotics                 `json:"semiotics"`
	SessionSumms   []map[string]any          `json:"session_summaries"`
	SessionMsgs    map[string][]map[string]any `json:"session_messages"`
	StateOfPlay    StateOfPlay               `json:"state_of_play"`
	Replays        ReplayData                `json:"replays"`
}

// RegistryInfo holds summary registry data for each peer.
type RegistryInfo struct {
	Role           string `json:"role"`
	Transport      string `json:"transport"`
	Autonomous     bool   `json:"autonomous"`
	AlwaysConsider bool   `json:"always_consider"`
}

// Totals holds aggregate counts.
type Totals struct {
	Messages           int `json:"messages"`
	Sessions           int `json:"sessions"`
	Unprocessed        int `json:"unprocessed"`
	ActiveGates        int `json:"active_gates"`
	EpistemicUnresolved int `json:"epistemic_flags_unresolved"`
}

// Semiotics holds facet distribution data.
type Semiotics struct {
	Vocabulary     []map[string]any `json:"vocabulary"`
	PSHDist        []map[string]any `json:"psh_distribution"`
	SchemaDist     []map[string]any `json:"schema_distribution"`
	VersionDist    []map[string]any `json:"version_distribution"`
	LowConfCount   int              `json:"low_confidence_count"`
}

// StateOfPlay holds the state-of-play tab data.
type StateOfPlay struct {
	ActiveThread ActiveThread   `json:"active_thread"`
	TODO         TODOSummary    `json:"todo"`
	PeerSync     []PeerSyncInfo `json:"peer_sync"`
}

// ReplayData holds local and remote replay info.
type ReplayData struct {
	Local  []ReplayInfo       `json:"local"`
	Remote []RemoteReplayInfo `json:"remote"`
}

// Collect gathers all mesh status data from state.db and filesystem.
func Collect(d *db.DB, projectRoot string) *Status {
	agentID := readAgentID(projectRoot)
	now := time.Now().Format("2006-01-02T15:04:05")
	dbPath := filepath.Join(projectRoot, "state.db")

	reg, _ := registry.Load(projectRoot)
	registryAgents := make(map[string]RegistryInfo)
	for id, cfg := range reg.Agents {
		registryAgents[id] = RegistryInfo{
			Role:           cfg.Role,
			Transport:      cfg.Transport,
			Autonomous:     cfg.Autonomous,
			AlwaysConsider: cfg.AlwaysConsider,
		}
	}

	// Trust budget
	budgetRows, _ := d.QueryRows(
		"SELECT * FROM trust_budget WHERE agent_id = ?", agentID)
	budgetRow := map[string]any{}
	if len(budgetRows) > 0 {
		budgetRow = budgetRows[0]
	}

	// Active gates
	gates, _ := d.QueryRows(
		"SELECT * FROM active_gates WHERE status = 'waiting' ORDER BY created_at")
	if gates == nil {
		gates = []map[string]any{}
	}

	// Unprocessed messages
	unprocessed, _ := d.QueryRows(
		`SELECT session_name, filename, turn, from_agent, message_type,
		 timestamp, subject FROM transport_messages
		 WHERE processed = FALSE ORDER BY timestamp DESC`)
	if unprocessed == nil {
		unprocessed = []map[string]any{}
	}

	// Recent messages (include all fields compositor expects)
	recent, _ := d.QueryRows(
		`SELECT session_name, filename, turn, from_agent, to_agent,
		 message_type, timestamp, processed, subject,
		 COALESCE(setl, 0) as setl,
		 COALESCE(claims_count, 0) as claims_count,
		 COALESCE(urgency, 'normal') as urgency
		 FROM transport_messages ORDER BY timestamp DESC LIMIT 20`)
	if recent == nil {
		recent = []map[string]any{}
	}

	// Recent autonomous actions
	actions, _ := d.QueryRows(
		`SELECT action_type, action_class, evaluator_tier, evaluator_result,
		 description, budget_before, budget_after, created_at
		 FROM autonomous_actions ORDER BY created_at DESC LIMIT 10`)
	if actions == nil {
		actions = []map[string]any{}
	}

	// Peer activity summary
	peers, _ := d.QueryRows(
		`SELECT from_agent, MAX(timestamp) as last_seen, COUNT(*) as total_messages
		 FROM transport_messages WHERE from_agent != ?
		 GROUP BY from_agent ORDER BY last_seen DESC`, agentID)
	if peers == nil {
		peers = []map[string]any{}
	}

	// Message counts by agent
	msgCounts, _ := d.QueryRows(
		`SELECT from_agent, COUNT(*) as sent,
		 SUM(CASE WHEN processed = FALSE THEN 1 ELSE 0 END) as pending
		 FROM transport_messages GROUP BY from_agent ORDER BY sent DESC`)
	if msgCounts == nil {
		msgCounts = []map[string]any{}
	}

	// Scalars
	epistemicFlags := d.ScalarInt("SELECT COUNT(*) FROM epistemic_flags WHERE resolved = FALSE")
	schemaVer := d.ScalarInt("SELECT MAX(version) FROM schema_version")
	totalMessages := d.ScalarInt("SELECT COUNT(*) FROM transport_messages")
	totalSessions := d.ScalarInt("SELECT COUNT(DISTINCT session_name) FROM transport_messages")

	// Heartbeat
	heartbeat := readHeartbeat(projectRoot)

	// Schedule
	schedule := CollectSchedule(d, agentID, projectRoot)

	// Semiotics
	semiotics := collectSemiotics(d)

	// Remote states
	remoteStates := CollectRemoteStates(reg, projectRoot)
	if remoteStates == nil {
		remoteStates = []map[string]any{}
	}

	// Session summaries
	sessionSumms, _ := d.QueryRows(
		`SELECT session_name,
		 COUNT(*) as total_messages,
		 GROUP_CONCAT(DISTINCT from_agent) as participants,
		 MIN(timestamp) as started,
		 MAX(timestamp) as latest,
		 MAX(turn) as last_turn,
		 SUM(CASE WHEN processed = 0 THEN 1 ELSE 0 END) as unprocessed
		 FROM transport_messages
		 GROUP BY session_name
		 ORDER BY latest DESC`)
	if sessionSumms == nil {
		sessionSumms = []map[string]any{}
	}

	// Per-session messages
	allMsgs, _ := d.QueryRows(
		`SELECT session_name, filename, turn, from_agent, to_agent,
		 message_type, timestamp, processed, subject
		 FROM transport_messages ORDER BY session_name, turn`)
	sessionMsgs := make(map[string][]map[string]any)
	for _, msg := range allMsgs {
		sn := getString(msg, "session_name")
		sessionMsgs[sn] = append(sessionMsgs[sn], msg)
	}

	// State of play
	stateOfPlay := StateOfPlay{
		ActiveThread: ParseActiveThread(projectRoot),
		TODO:         ParseTODO(projectRoot),
		PeerSync:     CollectPeerSyncRecency(remoteStates),
	}

	// Replays
	localReplays := CollectReplays(projectRoot)
	remoteReplays := CollectRemoteReplays(reg, projectRoot)

	return &Status{
		AgentID:        agentID,
		CollectedAt:    now,
		DBPath:         dbPath,
		DBExists:       true,
		SchemaVersion:  schemaVer,
		TrustBudget:    budgetRow,
		ActiveGates:    gates,
		Unprocessed:    unprocessed,
		RecentMessages: recent,
		RecentActions:  actions,
		Peers:          peers,
		MessageCounts:  msgCounts,
		RegistryAgents: registryAgents,
		RemoteStates:   remoteStates,
		Totals: Totals{
			Messages:           totalMessages,
			Sessions:           totalSessions,
			Unprocessed:        len(unprocessed),
			ActiveGates:        len(gates),
			EpistemicUnresolved: epistemicFlags,
		},
		Heartbeat:   heartbeat,
		Schedule:    schedule,
		Semiotics:   semiotics,
		SessionSumms: sessionSumms,
		SessionMsgs: sessionMsgs,
		StateOfPlay: stateOfPlay,
		Replays: ReplayData{
			Local:  localReplays,
			Remote: remoteReplays,
		},
	}
}

func collectSemiotics(d *db.DB) Semiotics {
	vocab, _ := d.QueryRows(
		`SELECT facet_type, facet_value, code, source, description,
		 entity_scope, active, keyword_count FROM facet_vocabulary
		 ORDER BY facet_type, active DESC, facet_value`)
	if vocab == nil {
		vocab = []map[string]any{}
	}

	pshDist, _ := d.QueryRows(
		`SELECT facet_value, COUNT(*) as entity_count,
		 ROUND(AVG(confidence), 3) as avg_confidence,
		 MIN(confidence) as min_confidence,
		 MAX(confidence) as max_confidence
		 FROM universal_facets WHERE facet_type = 'psh'
		 GROUP BY facet_value ORDER BY entity_count DESC`)
	if pshDist == nil {
		pshDist = []map[string]any{}
	}

	schemaDist, _ := d.QueryRows(
		`SELECT facet_value, COUNT(*) as entity_count
		 FROM universal_facets WHERE facet_type = 'schema_type'
		 GROUP BY facet_value ORDER BY entity_count DESC`)
	if schemaDist == nil {
		schemaDist = []map[string]any{}
	}

	versionDist, _ := d.QueryRows(
		`SELECT keyword_set_version, COUNT(*) as facet_count,
		 MIN(computed_at) as oldest, MAX(computed_at) as newest
		 FROM universal_facets WHERE facet_type = 'psh'
		 GROUP BY keyword_set_version ORDER BY keyword_set_version`)
	if versionDist == nil {
		versionDist = []map[string]any{}
	}

	lowConf := d.ScalarInt(
		`SELECT COUNT(*) FROM universal_facets
		 WHERE facet_type = 'psh' AND confidence < 0.05
		 AND facet_value != 'unclassified'`)

	return Semiotics{
		Vocabulary:   vocab,
		PSHDist:      pshDist,
		SchemaDist:   schemaDist,
		VersionDist:  versionDist,
		LowConfCount: lowConf,
	}
}

func readAgentID(projectRoot string) string {
	path := filepath.Join(projectRoot, ".agent-identity.json")
	data, err := os.ReadFile(path)
	if err != nil {
		return "psychology-agent"
	}
	var identity struct {
		AgentID string `json:"agent_id"`
	}
	if json.Unmarshal(data, &identity) != nil || identity.AgentID == "" {
		return "psychology-agent"
	}
	return identity.AgentID
}

func readHeartbeat(projectRoot string) map[string]any {
	path := filepath.Join(projectRoot, "transport", "heartbeat.json")
	data, err := os.ReadFile(path)
	if err != nil {
		return map[string]any{}
	}
	var hb map[string]any
	if json.Unmarshal(data, &hb) != nil {
		return map[string]any{}
	}
	return hb
}

// getString safely extracts a string from a map.
func getString(m map[string]any, key string) string {
	v, ok := m[key]
	if !ok || v == nil {
		return ""
	}
	s, ok := v.(string)
	if !ok {
		return fmt.Sprintf("%v", v)
	}
	return s
}

// getInt safely extracts an int from a map.
func getInt(m map[string]any, key string) int {
	v, ok := m[key]
	if !ok || v == nil {
		return 0
	}
	switch n := v.(type) {
	case int64:
		return int(n)
	case float64:
		return int(n)
	case int:
		return n
	default:
		return 0
	}
}

// getFloat safely extracts a float from a map.
func getFloat(m map[string]any, key string) float64 {
	v, ok := m[key]
	if !ok || v == nil {
		return 0
	}
	switch n := v.(type) {
	case float64:
		return n
	case int64:
		return float64(n)
	default:
		return 0
	}
}

// getBool safely extracts a bool from a map.
func getBool(m map[string]any, key string) bool {
	v, ok := m[key]
	if !ok || v == nil {
		return false
	}
	switch b := v.(type) {
	case bool:
		return b
	case int64:
		return b != 0
	case float64:
		return b != 0
	default:
		return false
	}
}
