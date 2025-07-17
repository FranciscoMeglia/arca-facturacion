const path = require("path");
const { init, callWsfe } = require("../index");

// Inicializamos la librería con datos de homologación
init({
  certPath: path.resolve(__dirname, "../certs/tuCertificado.crt"),
  keyPath: path.resolve(__dirname, "../certs/tuCertificado.key"),
  cuit: 21111111115, // CUIT del emisor
  production: false, // false = homologación , true = producción
});

// Ejemplo utilizando el metodo del WSFE FECompConsultar
async function FECompUltimoAutorizado() {
  try {
    const params = {
      CbteTipo: 13,
      PtoVta: 1,
    };

    const response = await callWsfe("FECompUltimoAutorizado", params);
    console.log("Respuesta ARCA:", JSON.stringify(response));
  } catch (error) {
    console.error("Error ARCA:", error.message);
  }
}
