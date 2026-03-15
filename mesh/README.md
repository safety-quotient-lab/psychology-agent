# Plan9 Mesh Filesystem

The mesh/ directory provides a shared namespace for all agents in the
organism. Every agent mounts this namespace and can read from it; write
access follows ownership rules defined in docs/plan9-mesh-filesystem.md.

**What problem does this solve?** Each agent carries its own memory
(MEMORY.md, state.db, lessons.md). The organism as a whole — the
five-agent mesh — had no unified memory. When one agent learned
something, the others could not access that knowledge unless someone
sent a message. The mesh filesystem gives the organism a shared memory
that any agent can read at session start.

**How does it work?** Think of the mesh/ directory like a shared filing
cabinet. Each drawer (subdirectory) holds a different kind of knowledge:
memory/ for what the organism remembers, theory/ for what it knows,
instruments/ for its measurement tools, governance/ for its rules,
standards/ for its protocols, data/ for research observations, and
publications/ for its public output. The .well-known/ drawer tells
the outside world how to find and interact with the organism.

**Current status:** Phase 2 (canonical directory structure). Content
still lives in its original locations — these directories point to
where things currently reside. Content migrates incrementally as the
organism matures.

Full specification: docs/plan9-mesh-filesystem.md
