// Integration test: hits the REAL ARCA WSAA service (homologación by
// default) using your own certs. Requires openssl on PATH plus your certs -
// see helpers.js for how to point at them. Skips (does not fail) when they
// are not available, so `npm test` stays safe for anyone without certs.
const { test } = require("node:test");
const assert = require("node:assert/strict");

const { getTA } = require("../../lib/core/auth");
const { loadRealConfig } = require("./helpers");

const { config, skipReason } = loadRealConfig();

test(
  "getTA obtains a real Ticket de Acceso (token/sign) from ARCA WSAA",
  { skip: skipReason },
  async () => {
    const ta = await getTA("wsfe", config);
    console.log("ARCA WSAA response (getTA):", JSON.stringify(ta, null, 2));

    assert.equal(typeof ta.token, "string");
    assert.ok(ta.token.length > 0);
    assert.equal(typeof ta.sign, "string");
    assert.ok(ta.sign.length > 0);
    assert.ok(new Date(ta.expirationTime) > new Date());
  }
);

test(
  "getTA reuses the cached TA on a second call instead of asking ARCA again",
  { skip: skipReason },
  async () => {
    const first = await getTA("wsfe", config);
    const second = await getTA("wsfe", config);
    console.log(
      "ARCA WSAA response (cached getTA):",
      JSON.stringify(second, null, 2)
    );

    assert.deepEqual(second, first);
  }
);
