const soap = require("soap");
const https = require("https");

async function createSoapClient(wsdlUrl) {
  return soap.createClientAsync(wsdlUrl, {
    wsdl_options: {
      agent: new https.Agent({ rejectUnauthorized: false }),
      proxy: false,
    },
  });
}

module.exports = { createSoapClient };
