package platform

// Version identifies the meshd build. Jenkins injects the git short-hash at
// compile time via -ldflags (-X platform.Version=<hash>). Defaults to "dev"
// for local builds. Exposed in /api/status JSON as the "version" field.
var Version = "dev"
