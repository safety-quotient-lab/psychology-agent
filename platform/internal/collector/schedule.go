package collector

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/safety-quotient-lab/psychology-agent/platform/internal/db"
)

// Schedule holds sync schedule information.
type Schedule struct {
	Autonomous          bool   `json:"autonomous"`
	CronEntry           string `json:"cron_entry,omitempty"`
	CronIntervalMin     *int   `json:"cron_interval_min,omitempty"`
	LastSync            string `json:"last_sync"`
	NextExpected        string `json:"next_expected"`
	NextRun             string `json:"next_run"`
	MinActionIntervalSec *int  `json:"min_action_interval_sec,omitempty"`
	LockFile            string `json:"lock_file"`
	LockActive          bool   `json:"lock_active"`
	LockPID             *int   `json:"lock_pid,omitempty"`
	LockStale           bool   `json:"lock_stale,omitempty"`
}

var cronTimestampRe = regexp.MustCompile(`\[(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})`)

// CollectSchedule gathers sync schedule from cron, log, and state.db.
func CollectSchedule(d *db.DB, agentID, projectRoot string) Schedule {
	sched := Schedule{
		LockFile: filepath.Join(os.TempDir(), fmt.Sprintf("autonomous-sync-%s.lock", agentID)),
	}

	// Parse crontab
	out, err := exec.Command("crontab", "-l").Output()
	if err == nil {
		for _, line := range strings.Split(string(out), "\n") {
			if strings.Contains(line, "autonomous-sync") && !strings.HasPrefix(strings.TrimSpace(line), "#") {
				sched.Autonomous = true
				sched.CronEntry = strings.TrimSpace(line)
				fields := strings.Fields(sched.CronEntry)
				if len(fields) > 0 {
					sched.CronIntervalMin = parseCronMinuteField(fields[0])
				}
				break
			}
		}
	}

	// min_action_interval from autonomy_budget
	rows, _ := d.QueryRows("SELECT min_action_interval FROM autonomy_budget WHERE agent_id = ?", agentID)
	if len(rows) > 0 {
		if v := getInt(rows[0], "min_action_interval"); v > 0 {
			sched.MinActionIntervalSec = &v
		}
	}

	// Last sync from log file
	logPath := filepath.Join(os.TempDir(), fmt.Sprintf("autonomous-sync-%s.log", agentID))
	sched.LastSync = parseLastSync(logPath)

	// Compute next expected
	if sched.LastSync != "" && sched.CronIntervalMin != nil {
		if t, err := time.Parse("2006-01-02T15:04:05", sched.LastSync); err == nil {
			next := t.Add(time.Duration(*sched.CronIntervalMin) * time.Minute)
			sched.NextExpected = next.Format("2006-01-02T15:04:05")
		} else if t, err := time.Parse("2006-01-02 15:04:05", sched.LastSync); err == nil {
			next := t.Add(time.Duration(*sched.CronIntervalMin) * time.Minute)
			sched.NextExpected = next.Format("2006-01-02T15:04:05")
		}
	}

	// Compositor compatibility alias
	sched.NextRun = sched.NextExpected

	// Check lock file
	checkLockFile(&sched)

	return sched
}

func parseCronMinuteField(field string) *int {
	// */N pattern
	if strings.HasPrefix(field, "*/") {
		if n, err := strconv.Atoi(field[2:]); err == nil {
			return &n
		}
	}
	// Comma-separated: compute interval from first two values
	if strings.Contains(field, ",") {
		parts := strings.SplitN(field, ",", 3)
		if len(parts) >= 2 {
			a, errA := strconv.Atoi(parts[0])
			b, errB := strconv.Atoi(parts[1])
			if errA == nil && errB == nil && b > a {
				interval := b - a
				return &interval
			}
		}
	}
	// "0" means hourly
	if field == "0" {
		n := 60
		return &n
	}
	return nil
}

func parseLastSync(logPath string) string {
	data, err := os.ReadFile(logPath)
	if err != nil {
		return ""
	}
	lines := strings.Split(string(data), "\n")
	// Check last 20 lines
	start := len(lines) - 20
	if start < 0 {
		start = 0
	}
	for i := len(lines) - 1; i >= start; i-- {
		if match := cronTimestampRe.FindStringSubmatch(lines[i]); len(match) > 1 {
			return match[1]
		}
	}
	return ""
}

func checkLockFile(sched *Schedule) {
	data, err := os.ReadFile(sched.LockFile)
	if err != nil {
		return
	}
	pidStr := strings.TrimSpace(string(data))
	pid, err := strconv.Atoi(pidStr)
	if err != nil {
		return
	}
	sched.LockPID = &pid

	// Check if PID is alive
	proc, err := os.FindProcess(pid)
	if err != nil {
		sched.LockStale = true
		return
	}
	err = proc.Signal(syscall.Signal(0))
	if err != nil {
		sched.LockStale = true
	} else {
		sched.LockActive = true
	}
}
