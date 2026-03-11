package platform

// Version identifies the meshd build. Set at compile time via ldflags:
//   go build -ldflags "-X .../platform.Version=$(git rev-parse --short HEAD)"
// Defaults to "dev" for local builds. Exposed in /api/status as "version".
var Version = "dev"
