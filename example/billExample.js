const path = require("path");
const { init, callWsfe } = require("../index");

// Inicializamos la librería con datos de homologación
init({
  certPath: path.resolve(__dirname, "../.certs/tuCertificado.crt"),
  keyPath: path.resolve(__dirname, "../.certs/tuClave.key"),
  cuit: 21111111115, // CUIT del emisor
  production: false, // false = homologación , true = producción
});

// Ejemplo utilizando el metodo del WSFE FECompConsultar
async function ConsultarComprobante() {
  try {
    const params = {
      FeCompConsReq: {
        CbteTipo: 13,
        CbteNro: 1,
        PtoVta: 1,
      },
    };

    const response = await callWsfe("FECompConsultar", params);
    console.log("Respuesta ARCA:", response);
  } catch (error) {
    console.error("Error ARCA:", error.message);
  }
}
