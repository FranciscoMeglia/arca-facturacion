const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  buildFacturaQRPayload,
  buildFacturaQRUrl,
  generateFacturaQR,
} = require("../lib/core/qr");

function baseQRData(overrides = {}) {
  return {
    fecha: "2026-09-04",
    cuit: 21111111115,
    ptoVta: 1,
    tipoCmp: 1,
    nroCmp: 216,
    importe: 1210.0,
    moneda: "PES",
    ctz: 1,
    tipoDocRec: 80,
    nroDocRec: 20111111112,
    tipoCodAut: "E",
    codAut: "86360850379715",
    ...overrides,
  };
}

test("buildFacturaQRPayload returns the RG 4291 payload shape", () => {
  const payload = buildFacturaQRPayload(baseQRData());
  assert.deepEqual(payload, {
    ver: 1,
    fecha: "2026-09-04",
    cuit: 21111111115,
    ptoVta: 1,
    tipoCmp: 1,
    nroCmp: 216,
    importe: 1210.0,
    moneda: "PES",
    ctz: 1,
    tipoDocRec: 80,
    nroDocRec: 20111111112,
    tipoCodAut: "E",
    codAut: "86360850379715",
  });
});

test("buildFacturaQRPayload throws when a required field is missing", () => {
  const data = baseQRData();
  delete data.codAut;
  assert.throws(() => buildFacturaQRPayload(data), /codAut/);
});

test("buildFacturaQRUrl encodes the payload as base64 in ARCA's verification URL", () => {
  const data = baseQRData();
  const url = buildFacturaQRUrl(data);

  assert.match(url, /^https:\/\/www\.afip\.gob\.ar\/fe\/qr\/\?p=/);

  const base64Payload = url.split("?p=")[1];
  const decoded = JSON.parse(
    Buffer.from(base64Payload, "base64").toString("utf8"),
  );
  assert.equal(decoded.cuit, data.cuit);
  assert.equal(decoded.codAut, data.codAut);
});

test("generateFacturaQR returns a data URL by default", async () => {
  const { url, image } = await generateFacturaQR(baseQRData());
  assert.match(url, /^https:\/\/www\.afip\.gob\.ar\/fe\/qr\//);
  assert.match(image, /^data:image\/png;base64,/);
});

test("generateFacturaQR can return a PNG buffer", async () => {
  const { image } = await generateFacturaQR(baseQRData(), { format: "png" });
  assert.ok(Buffer.isBuffer(image));
  assert.ok(image.length > 0);
});

test("generateFacturaQR can return an SVG string", async () => {
  const { image } = await generateFacturaQR(baseQRData(), { format: "svg" });
  assert.match(image, /<svg/);
});

test("generateFacturaQR rejects an unknown format", async () => {
  await assert.rejects(
    () => generateFacturaQR(baseQRData(), { format: "bmp" }),
    /Unknown QR format/,
  );
});
