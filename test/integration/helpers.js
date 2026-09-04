const fs = require("fs");
const path = require("path");

/**
 * Real config for the integration tests, read from env vars so each dev can
 * point at their own certs without touching the test files. Defaults match
 * the `certs/` layout used by example/billExample.js.
 *
 * ARCA_CERT_PATH   - path to the .crt (default: certs/arca.crt)
 * ARCA_KEY_PATH    - path to the .key (default: certs/arca.key)
 * ARCA_CUIT        - CUIT authorized for that cert (required)
 * ARCA_PRODUCTION  - "true" to hit production instead of homologación (default: false)
 */
function loadRealConfig() {
  const certPath = path.resolve(
    process.env.ARCA_CERT_PATH || path.resolve(__dirname, "../../certs/arca.crt")
  );
  const keyPath = path.resolve(
    process.env.ARCA_KEY_PATH || path.resolve(__dirname, "../../certs/arca.key")
  );
  const cuit = process.env.ARCA_CUIT ? Number(process.env.ARCA_CUIT) : undefined;
  const production = process.env.ARCA_PRODUCTION === "true";

  const missing = [];
  if (!fs.existsSync(certPath)) missing.push(`cert not found at ${certPath}`);
  if (!fs.existsSync(keyPath)) missing.push(`key not found at ${keyPath}`);
  if (!cuit) missing.push("ARCA_CUIT env var not set");

  return {
    config: { certPath, keyPath, cuit, production },
    skipReason:
      missing.length > 0
        ? `skipping integration test: ${missing.join("; ")} (set ARCA_CERT_PATH/ARCA_KEY_PATH/ARCA_CUIT or drop your certs in certs/arca.{crt,key})`
        : null,
  };
}

module.exports = { loadRealConfig };
