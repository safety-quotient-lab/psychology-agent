// Shared mesh dashboard utility functions
// Extracted from operations-agent compositor for reuse across agent dashboards.

function parseTS(ts) {
    if (!ts) return 0;
    const d = new Date(ts);
    return isNaN(d.getTime()) ? 0 : d.getTime();
}

function formatTS(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts.substring(0, 10) || "—";
    if (typeof ts === "string" && !ts.includes("T")) {
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    const now = new Date();
    const diffMs = now - d;
    const diffH = diffMs / 3600000;
    if (diffH < 1) return Math.max(1, Math.floor(diffMs / 60000)) + "m ago";
    if (diffH < 24) return Math.floor(diffH) + "h ago";
    if (diffH < 48) return "yesterday " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        + " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function transportGitHubUrl(agentId, sessionName, filename, fromAgent) {
    if (!sessionName || !filename) return null;
    const sourceAgent = fromAgent || agentId;
    const repoMap = typeof AGENT_REPO_MAP !== "undefined" ? AGENT_REPO_MAP : {};
    const repo = repoMap[sourceAgent];
    if (!repo) return null;
    return `https://github.com/${repo}/blob/main/transport/sessions/${encodeURIComponent(sessionName)}/${encodeURIComponent(filename)}`;
}
