# Published task implementations

Version 1 and 2 remain in the existing v2 snapshot and its legacy adapter.
Version 3 is frozen byte-for-byte in `v3/`, including its assessment,
program helpers, template factory and contract dependencies. The mirrored
`projects/` directory and the two `v3/versions/` re-exports retain the
original import paths without editing published sources.

`docs/baselines/course-v3-freeze.json` locks all eleven copied sources.
`pnpm course:baseline` checks these hashes, the original six assessment
hashes and all 64 original template rows. Do not format or modify these
snapshots. Create a new release instead.

Latest releases are selected per task by `task-release.ts`.
Only eight pilots currently use version 4; other tasks remain version 3.
The editor resolves a saved work's own version, never upgrades it in place.
The upgrade action saves the existing work and creates a separate project.
