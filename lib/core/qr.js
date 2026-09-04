const QRCode = require("qrcode");

// Base URL ARCA's own verification page (RG 4291) reads the invoice payload
// from. This never changes per-invoice - only the `?p=<base64>` query does.
const QR_VERIFICATION_BASE_URL = "https://www.afip.gob.ar/fe/qr/";

/**
 * @typedef {object} FacturaQRData
 * @property {string} fecha - Comprobante date, "YYYY-MM-DD".
 * @property {number} cuit - Issuer's CUIT.
 * @property {number} ptoVta - Punto de venta.
 * @property {number} tipoCmp - CbteTipo (same code used in FECAESolicitar).
 * @property {number} nroCmp - Comprobante number (CbteHasta of the response).
 * @property {number} importe - ImpTotal.
 * @property {string} moneda - MonId ("PES", "DOL", ...).
 * @property {number} ctz - MonCotiz.
 * @property {number} tipoDocRec - Receptor's DocTipo.
 * @property {number} nroDocRec - Receptor's DocNro.
 * @property {"E"|"A"} tipoCodAut - "E" for a CAE, "A" for a CAEA.
 * @property {string} codAut - The CAE or CAEA number, as a string.
 */

/**
 * Builds the JSON payload ARCA's QR verification page expects, per RG 4291.
 * You'll typically fill this in from a mix of the request you sent to
 * FECAESolicitar (importe, moneda, ctz, receptor) and the response you got
 * back (nroCmp, codAut) - neither one alone has every field.
 *
 * @param {FacturaQRData} data
 * @returns {object} The raw payload object (before base64/URL encoding).
 */
function buildFacturaQRPayload(data) {
  const required = [
    "fecha",
    "cuit",
    "ptoVta",
    "tipoCmp",
    "nroCmp",
    "importe",
    "moneda",
    "ctz",
    "tipoDocRec",
    "nroDocRec",
    "tipoCodAut",
    "codAut",
  ];
  const missing = required.filter(
    (field) => data?.[field] === undefined || data?.[field] === null
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing required field(s) for the QR payload: ${missing.join(", ")}.`
    );
  }

  return {
    ver: 1,
    fecha: data.fecha,
    cuit: data.cuit,
    ptoVta: data.ptoVta,
    tipoCmp: data.tipoCmp,
    nroCmp: data.nroCmp,
    importe: data.importe,
    moneda: data.moneda,
    ctz: data.ctz,
    tipoDocRec: data.tipoDocRec,
    nroDocRec: data.nroDocRec,
    tipoCodAut: data.tipoCodAut,
    codAut: data.codAut,
  };
}

/**
 * Builds the full ARCA verification URL the QR code should encode
 * (`https://www.afip.gob.ar/fe/qr/?p=<base64 payload>`). Use this directly
 * if you already generate QR images yourself with another library.
 *
 * @param {FacturaQRData} data
 * @returns {string} The verification URL.
 */
function buildFacturaQRUrl(data) {
  const payload = buildFacturaQRPayload(data);
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString(
    "base64"
  );
  return `${QR_VERIFICATION_BASE_URL}?p=${base64Payload}`;
}

/**
 * Builds the verification URL and renders it as a QR code image.
 *
 * @param {FacturaQRData} data
 * @param {object} [options]
 * @param {"dataUrl"|"png"|"svg"} [options.format="dataUrl"] - "dataUrl"
 *   returns a `data:image/png;base64,...` string ready for an <img src> or a
 *   PDF library; "png" returns a raw PNG Buffer; "svg" returns an SVG string.
 * @returns {Promise<{ url: string, image: string|Buffer }>}
 */
async function generateFacturaQR(data, options = {}) {
  const format = options.format || "dataUrl";
  const url = buildFacturaQRUrl(data);

  let image;
  if (format === "dataUrl") {
    image = await QRCode.toDataURL(url);
  } else if (format === "png") {
    image = await QRCode.toBuffer(url);
  } else if (format === "svg") {
    image = await QRCode.toString(url, { type: "svg" });
  } else {
    throw new Error(
      `Unknown QR format "${format}". Use "dataUrl", "png" or "svg".`
    );
  }

  return { url, image };
}

module.exports = { buildFacturaQRPayload, buildFacturaQRUrl, generateFacturaQR };
