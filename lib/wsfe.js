const { createSoapClient } = require("./core/soapClient");
const { getTA } = require("./core/auth");
const { wsdlUrls } = require("./constants");

let globalConfig = null;

function init(config) {
  globalConfig = config;
}

async function callWsfe(methodName, params, config = globalConfig) {
  if (!config)
    throw new Error(
      "Missing configuration. Call init(config) or pass config directly."
    );

  const environment = config.production ? "production" : "homologation";
  const wsdlUrl = wsdlUrls.wsfe?.[environment];

  if (!wsdlUrl) throw new Error("WSDL URL not defined for WSFE service");

  const { token, sign } = await getTA("wsfe", config);

  const client = await createSoapClient(wsdlUrl);

  const request = {
    Auth: {
      Token: token,
      Sign: sign,
      Cuit: config.cuit,
    },
    ...params,
  };

  const asyncMethod = client[`${methodName}Async`];
  if (typeof asyncMethod !== "function") {
    throw new Error(`Method ${methodName}Async not found in SOAP client`);
  }

  const [response] = await asyncMethod(request);
  return response;
}

module.exports = { init, callWsfe };
