const {
  getCbteTipoLetra,
  getCondicionIvaReceptor,
} = require("./arcaReferenceData");

const REQUIRED_DET_FIELDS = [
  "Concepto",
  "DocTipo",
  "DocNro",
  "CbteDesde",
  "CbteHasta",
  "CbteFch",
  "ImpTotal",
  "MonId",
  "MonCotiz",
];

const AMOUNT_EPSILON = 0.01;

/**
 * Validates a FECAESolicitar request against ARCA's known business rules
 * *before* spending a real request against ARCA, so a mistake (wrong
 * CondicionIVAReceptorId for the CbteTipo, amounts that don't add up, a
 * missing field) surfaces immediately instead of coming back as an
 * `Observaciones` entry buried inside an ARCA response.
 *
 * This only catches the class of errors ARCA's own reference tables make
 * knowable ahead of time - it is not a full replacement for ARCA's
 * validation, and intentionally does not flag anything it isn't confident
 * about (e.g. a CbteTipo or CondicionIVAReceptorId this snapshot doesn't
 * recognize is skipped, not rejected - see arcaReferenceData.js).
 *
 * @param {object} params - The same params object passed to
 *   `callWsfe("FECAESolicitar", params)`.
 * @throws {Error} If a problem is found, with all problems joined together.
 */
function validateFECAERequest(params) {
  const errors = [];

  const feCabReq = params?.FeCAEReq?.FeCabReq;
  const detRequests = params?.FeCAEReq?.FeDetReq?.FECAEDetRequest;

  if (!feCabReq) {
    throw new Error(
      "Invalid FECAESolicitar request: missing FeCAEReq.FeCabReq."
    );
  }
  if (!Array.isArray(detRequests) || detRequests.length === 0) {
    throw new Error(
      "Invalid FECAESolicitar request: FeCAEReq.FeDetReq.FECAEDetRequest must be a non-empty array."
    );
  }

  if (feCabReq.CantReg !== detRequests.length) {
    errors.push(
      `FeCabReq.CantReg (${feCabReq.CantReg}) does not match the number of FECAEDetRequest entries (${detRequests.length}).`
    );
  }
  if (typeof feCabReq.PtoVta !== "number") {
    errors.push("FeCabReq.PtoVta is required and must be a number.");
  }
  if (typeof feCabReq.CbteTipo !== "number") {
    errors.push("FeCabReq.CbteTipo is required and must be a number.");
  }

  const letra = getCbteTipoLetra(feCabReq.CbteTipo);

  detRequests.forEach((det, i) => {
    const label = `FECAEDetRequest[${i}]`;

    for (const field of REQUIRED_DET_FIELDS) {
      if (det[field] === undefined || det[field] === null) {
        errors.push(`${label}.${field} is required.`);
      }
    }

    if (det.CbteFch !== undefined && !/^\d{8}$/.test(String(det.CbteFch))) {
      errors.push(
        `${label}.CbteFch ("${det.CbteFch}") must be an 8-digit date in YYYYMMDD format.`
      );
    }

    // Cross-check CondicionIVAReceptorId against the CbteTipo's letra
    // (A/B/C/...) using ARCA's own table - this is the exact class of
    // rejection ("Condicion IVA receptor no es valido para la clase de
    // comprobante informado") that motivated this validator.
    if (letra && det.CondicionIVAReceptorId !== undefined) {
      const condicion = getCondicionIvaReceptor(det.CondicionIVAReceptorId);
      if (condicion && !condicion.clases.includes(letra)) {
        errors.push(
          `${label}.CondicionIVAReceptorId ${det.CondicionIVAReceptorId} ("${condicion.desc}") is not valid for CbteTipo ${feCabReq.CbteTipo} (clase ${letra}). Valid clases for this condición: ${condicion.clases.join("/")}.`
        );
      }
    }

    // Loose amount check: ImpTotal should equal the sum of whichever
    // breakdown fields are present. Fields ARCA didn't send for this
    // comprobante type (e.g. ImpIVA on a Factura C) are treated as 0 rather
    // than required, since which fields apply depends on Concepto/CbteTipo.
    if (
      typeof det.ImpTotal === "number" &&
      (typeof det.ImpNeto === "number" ||
        typeof det.ImpIVA === "number" ||
        typeof det.ImpTotConc === "number" ||
        typeof det.ImpOpEx === "number" ||
        typeof det.ImpTrib === "number")
    ) {
      const sum =
        (det.ImpNeto || 0) +
        (det.ImpIVA || 0) +
        (det.ImpTotConc || 0) +
        (det.ImpOpEx || 0) +
        (det.ImpTrib || 0);
      if (Math.abs(sum - det.ImpTotal) > AMOUNT_EPSILON) {
        errors.push(
          `${label}: ImpNeto + ImpIVA + ImpTotConc + ImpOpEx + ImpTrib (${sum}) does not add up to ImpTotal (${det.ImpTotal}).`
        );
      }
    }
  });

  if (errors.length > 0) {
    throw new Error(
      `Invalid FECAESolicitar request:\n- ${errors.join("\n- ")}`
    );
  }
}

module.exports = { validateFECAERequest };
