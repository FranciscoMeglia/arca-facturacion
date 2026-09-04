const path = require("path");
const { init, callWsfe, generateFacturaQR } = require("../index");

// Initialize the library with homologación (testing) data
const arcaConfig = {
  certPath: path.resolve(__dirname, "../certs/arca.crt"),
  keyPath: path.resolve(__dirname, "../certs/arca.key"),
  cuit: 21111111115, // Issuer's CUIT
  production: false, // false = homologación (testing), true = production
};
init(arcaConfig);

// Example using the WSFE method FECompUltimoAutorizado
async function FECompUltimoAutorizado() {
  try {
    const params = {
      CbteTipo: 13,
      PtoVta: 1,
    };

    const response = await callWsfe("FECompUltimoAutorizado", params);
    console.log("ARCA response:", JSON.stringify(response));
  } catch (error) {
    console.error("ARCA error:", error.message);
  }
}

// Example using the WSFE method FECAESolicitar to issue a test invoice
async function FECAESolicitar() {
  try {
    const ptoVta = 1;
    const cbteTipo = 1; // Factura A

    // Ask ARCA for the last authorized voucher number so this example can
    // run more than once without reusing a CbteDesde/CbteHasta already taken.
    const ultimo = await callWsfe("FECompUltimoAutorizado", {
      PtoVta: ptoVta,
      CbteTipo: cbteTipo,
    });
    const proximoNro = ultimo.FECompUltimoAutorizadoResult.CbteNro + 1;

    const todayCompact = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, ""); // YYYYMMDD, as CbteFch expects
    const todayDashed = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, as the QR payload expects

    const det = {
      Concepto: 1,
      DocTipo: 80,
      DocNro: 20111111112,
      CbteDesde: proximoNro,
      CbteHasta: proximoNro,
      CbteFch: todayCompact,
      ImpTotal: 1210.0,
      ImpNeto: 1000.0,
      ImpIVA: 210.0,
      MonId: "PES",
      MonCotiz: 1,
      CondicionIVAReceptorId: 1, // 1 = IVA Responsable Inscripto (requerido para Factura A)
      Iva: {
        AlicIva: [
          {
            Id: 5,
            BaseImp: 1000.0,
            Importe: 210.0,
          },
        ],
      },
    };

    const params = {
      FeCAEReq: {
        FeCabReq: {
          CantReg: 1,
          PtoVta: ptoVta,
          CbteTipo: cbteTipo,
        },
        FeDetReq: {
          FECAEDetRequest: [det],
        },
      },
    };

    // callWsfe validates this request locally before sending it to ARCA -
    // e.g. it would reject CondicionIVAReceptorId 5 above for a Factura A.
    const response = await callWsfe("FECAESolicitar", params);
    console.log("ARCA response:", JSON.stringify(response));

    const result = response.FECAESolicitarResult;

    // ARCA can reject the whole request at the header level (e.g. punto de
    // venta not habilitado) without ever processing the detalle - in that
    // case there's no FeDetResp at all, only an Errors list.
    if (result.Errors) {
      console.error(
        "ARCA rejected the request:",
        JSON.stringify(result.Errors),
      );
      return;
    }

    const detResp = result.FeDetResp.FECAEDetResponse[0];
    if (detResp.Resultado !== "A") {
      console.error(
        "Comprobante rechazado, no se genera QR:",
        JSON.stringify(detResp.Observaciones),
      );
      return;
    }

    // Build the mandatory QR (RG 4291). Every field except the CAE is
    // already known from what we sent in `det` - ARCA's response doesn't
    // even include importe/moneda/cotización, and for an accepted request it
    // never changes DocTipo/DocNro/CbteHasta from what was requested. The
    // CAE is the one value only ARCA can give you, so that's the only field
    // pulled from detResp.
    const { url, image } = await generateFacturaQR({
      fecha: todayDashed,
      cuit: arcaConfig.cuit,
      ptoVta,
      tipoCmp: cbteTipo,
      nroCmp: det.CbteHasta,
      importe: det.ImpTotal,
      moneda: det.MonId,
      ctz: det.MonCotiz,
      tipoDocRec: det.DocTipo,
      nroDocRec: det.DocNro,
      tipoCodAut: "E", // "E" = CAE, "A" = CAEA
      codAut: detResp.CAE,
    });
    console.log("QR verification URL:", url);
    console.log(
      "QR image (data URL, embed directly in an <img> or PDF):",
      image.slice(0, 60) + "...",
    );
  } catch (error) {
    console.error("ARCA error:", error.message);
  }
}

//FECompUltimoAutorizado();

FECAESolicitar();
