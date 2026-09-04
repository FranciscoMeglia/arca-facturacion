const { callWsfe, init } = require("./lib/wsfe");
const { validateFECAERequest } = require("./lib/core/validation");
const {
  buildFacturaQRPayload,
  buildFacturaQRUrl,
  generateFacturaQR,
} = require("./lib/core/qr");

module.exports = {
  init,
  callWsfe,
  validateFECAERequest,
  buildFacturaQRPayload,
  buildFacturaQRUrl,
  generateFacturaQR,
};
