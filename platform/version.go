package platform

// Version identifies the meshd build. Jenkins injects the git short-hash
// at compile time via -ldflags. Local builds default to "dev".
var Version = "dev"
