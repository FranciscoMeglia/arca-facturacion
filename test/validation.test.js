const { test } = require("node:test");
const assert = require("node:assert/strict");

const { validateFECAERequest } = require("../lib/core/validation");

function baseParams(overrides = {}) {
  return {
    FeCAEReq: {
      FeCabReq: { CantReg: 1, PtoVta: 1, CbteTipo: 1, ...overrides.FeCabReq },
      FeDetReq: {
        FECAEDetRequest: [
          {
            Concepto: 1,
            DocTipo: 80,
            DocNro: 20111111112,
            CbteDesde: 1,
            CbteHasta: 1,
            CbteFch: "20260904",
            ImpTotal: 1210.0,
            ImpNeto: 1000.0,
            ImpIVA: 210.0,
            MonId: "PES",
            MonCotiz: 1,
            CondicionIVAReceptorId: 1,
            ...overrides.det,
          },
        ],
      },
    },
  };
}

test("validateFECAERequest accepts a well-formed Factura A request", () => {
  assert.doesNotThrow(() => validateFECAERequest(baseParams()));
});

test("validateFECAERequest rejects a CondicionIVAReceptorId invalid for the CbteTipo's clase", () => {
  // CondicionIVAReceptorId 5 (Consumidor Final) is only valid for C/49, not
  // Factura A (CbteTipo 1) - this is the exact bug the example hit.
  const params = baseParams({ det: { CondicionIVAReceptorId: 5 } });
  assert.throws(
    () => validateFECAERequest(params),
    /CondicionIVAReceptorId 5 .* not valid for CbteTipo 1/
  );
});

test("validateFECAERequest does not flag an unrecognized CbteTipo/condición combo (fails open)", () => {
  // CbteTipo 999 isn't in the reference snapshot, so it can't be checked -
  // the validator should skip it rather than reject on unknown data.
  const params = baseParams({
    FeCabReq: { CbteTipo: 999 },
    det: { CondicionIVAReceptorId: 5 },
  });
  assert.doesNotThrow(() => validateFECAERequest(params));
});

test("validateFECAERequest rejects when CantReg doesn't match the number of entries", () => {
  const params = baseParams({ FeCabReq: { CantReg: 2 } });
  assert.throws(() => validateFECAERequest(params), /CantReg/);
});

test("validateFECAERequest rejects a missing required field", () => {
  const params = baseParams();
  delete params.FeCAEReq.FeDetReq.FECAEDetRequest[0].ImpTotal;
  assert.throws(() => validateFECAERequest(params), /ImpTotal is required/);
});

test("validateFECAERequest rejects a malformed CbteFch", () => {
  const params = baseParams({ det: { CbteFch: "2026-09-04" } });
  assert.throws(() => validateFECAERequest(params), /CbteFch/);
});

test("validateFECAERequest rejects amounts that don't add up", () => {
  const params = baseParams({ det: { ImpTotal: 9999 } });
  assert.throws(() => validateFECAERequest(params), /does not add up/);
});

test("validateFECAERequest rejects a request with no FeCabReq", () => {
  assert.throws(() => validateFECAERequest({ FeCAEReq: {} }), /FeCabReq/);
});

test("validateFECAERequest rejects a request with an empty FECAEDetRequest array", () => {
  const params = baseParams();
  params.FeCAEReq.FeDetReq.FECAEDetRequest = [];
  assert.throws(() => validateFECAERequest(params), /non-empty array/);
});
