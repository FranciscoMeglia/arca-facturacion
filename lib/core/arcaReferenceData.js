/**
 * Static snapshot of ARCA's WSFE reference tables, used for client-side
 * validation before spending a real request against ARCA (see validation.js).
 *
 * Fetched from FEParamGetTiposCbte / FEParamGetCondicionIvaReceptor against
 * ARCA homologación on 2026-09-04. These tables change rarely (mostly to add
 * new CbteTipo/CondicionIVA codes), so a static snapshot is refreshed here
 * occasionally rather than calling ARCA on every validation. If ARCA rejects
 * a combination this file doesn't know about yet, treat it as this snapshot
 * being out of date rather than a bug in the request itself - re-fetch both
 * methods and update the tables below.
 */

// Maps each CbteTipo id to its "letra"/class, as used by
// FEParamGetCondicionIvaReceptor's Cmp_Clase field ("A", "B", "C", "ALEY" for
// the "Operación Sujeta a Retención" comprobantes, "49" for the standalone
// "Comprobante de Compra de Bienes Usados a Consumidor Final"). CbteTipo ids
// not listed here (e.g. exportación "E" or "M" comprobantes, not present in
// this account's habilitados list) are simply skipped by validation instead
// of being flagged - unknown is treated as "can't check", not "invalid".
const CBTE_TIPO_LETRA = {
  1: "A",
  2: "A",
  3: "A",
  4: "A",
  5: "A",
  34: "A",
  39: "A",
  60: "A",
  63: "A",
  201: "A",
  202: "A",
  203: "A",
  6: "B",
  7: "B",
  8: "B",
  9: "B",
  10: "B",
  35: "B",
  40: "B",
  61: "B",
  64: "B",
  206: "B",
  207: "B",
  208: "B",
  11: "C",
  12: "C",
  13: "C",
  15: "C",
  211: "C",
  212: "C",
  213: "C",
  51: "ALEY",
  52: "ALEY",
  53: "ALEY",
  54: "ALEY",
  49: "49",
};

// Which CondicionIVAReceptorId values are valid for each letra/class, parsed
// from FEParamGetCondicionIvaReceptor's "Cmp_Clase" ("A/ALEY/C", "B/C", ...).
const CONDICION_IVA_RECEPTOR = [
  { id: 1, desc: "IVA Responsable Inscripto", clases: ["A", "ALEY", "C"] },
  { id: 6, desc: "Responsable Monotributo", clases: ["A", "ALEY", "C"] },
  { id: 13, desc: "Monotributista Social", clases: ["A", "ALEY", "C"] },
  {
    id: 16,
    desc: "Monotributo Trabajador Independiente Promovido",
    clases: ["A", "ALEY", "C"],
  },
  { id: 4, desc: "IVA Sujeto Exento", clases: ["B", "C"] },
  { id: 7, desc: "Sujeto No Categorizado", clases: ["B", "C"] },
  { id: 8, desc: "Proveedor del Exterior", clases: ["B", "C"] },
  { id: 9, desc: "Cliente del Exterior", clases: ["B", "C"] },
  { id: 10, desc: "IVA Liberado – Ley N° 19.640", clases: ["B", "C"] },
  { id: 15, desc: "IVA No Alcanzado", clases: ["B", "C"] },
  { id: 5, desc: "Consumidor Final", clases: ["C", "49"] },
];

function getCbteTipoLetra(cbteTipo) {
  return CBTE_TIPO_LETRA[cbteTipo];
}

function getCondicionIvaReceptor(condicionIVAReceptorId) {
  return CONDICION_IVA_RECEPTOR.find((c) => c.id === condicionIVAReceptorId);
}

module.exports = {
  CBTE_TIPO_LETRA,
  CONDICION_IVA_RECEPTOR,
  getCbteTipoLetra,
  getCondicionIvaReceptor,
};
