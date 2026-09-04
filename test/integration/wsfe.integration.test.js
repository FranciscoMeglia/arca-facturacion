// Integration test: hits the REAL ARCA WSFE service (homologación by
// default) using your own certs. See helpers.js for how to point at them.
// Skips (does not fail) when they are not available, so `npm test` stays
// safe for anyone without certs.
const { test } = require("node:test");
const assert = require("node:assert/strict");

const { callWsfe } = require("../../lib/wsfe");
const { loadRealConfig } = require("./helpers");

const { config, skipReason } = loadRealConfig();

test(
  "callWsfe('FEDummy') reaches ARCA and reports the service as available",
  { skip: skipReason },
  async () => {
    const response = await callWsfe("FEDummy", {}, config);
    console.log(
      "ARCA WSFE response (FEDummy):",
      JSON.stringify(response, null, 2)
    );

    assert.equal(response.FEDummyResult.AppServer, "OK");
    assert.equal(response.FEDummyResult.DbServer, "OK");
    assert.equal(response.FEDummyResult.AuthServer, "OK");
  }
);

test(
  "callWsfe('FECompUltimoAutorizado') returns a real last-authorized voucher number",
  { skip: skipReason },
  async () => {
    const ptoVta = process.env.ARCA_PTO_VTA
      ? Number(process.env.ARCA_PTO_VTA)
      : 1;
    const cbteTipo = process.env.ARCA_CBTE_TIPO
      ? Number(process.env.ARCA_CBTE_TIPO)
      : 6; // Factura B

    const response = await callWsfe(
      "FECompUltimoAutorizado",
      { PtoVta: ptoVta, CbteTipo: cbteTipo },
      config
    );
    console.log(
      "ARCA WSFE response (FECompUltimoAutorizado):",
      JSON.stringify(response, null, 2)
    );

    assert.equal(response.FECompUltimoAutorizadoResult.PtoVta, ptoVta);
    assert.equal(response.FECompUltimoAutorizadoResult.CbteTipo, cbteTipo);
    assert.equal(
      typeof response.FECompUltimoAutorizadoResult.CbteNro,
      "number"
    );
  }
);
