#!/usr/bin/env node
// Thin wrapper so `npm run test:integration <CUIT>` works: npm forwards the
// positional arg straight into argv, we turn it into ARCA_CUIT and hand off
// to the real test run. `ARCA_CUIT` (already set in the env) still works too
// - the CLI arg just takes priority when both are given.
const { spawnSync } = require("child_process");

const cuit = process.argv[2];
const env = { ...process.env };
if (cuit) env.ARCA_CUIT = cuit;

const result = spawnSync(
  process.execPath,
  [
    "--experimental-test-module-mocks",
    // Integration tests share one real WSAA session per cert+service. Node
    // runs test files in parallel by default, and WSAA rejects a second
    // concurrent login for the same cert+service ("coe.alreadyAuthenticated")
    // while the first is still being cached to disk - force everything to
    // run one file at a time so they cleanly reuse the same cached TA.
    "--test-concurrency=1",
    "--test",
    "test/integration/*.test.js",
  ],
  { stdio: "inherit", env }
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
