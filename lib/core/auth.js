const fs = require("fs");
const path = require("path");
const { createSoapClient } = require("./soapClient");
const { execSync } = require("child_process");
const { parseStringPromise } = require("xml2js");
const { wsdlUrls } = require("../constants");

/**
 * Generates the XML body for the LoginTicketRequest used to authenticate with ARCA.
 *
 * @param {string} service - The ARCA service name.
 * @returns {string} The XML string.
 */
function generateLoginTicketRequest(service) {
  const uniqueId = Math.floor(Date.now() / 1000);
  const generationTime = new Date(Date.now() - 60000).toISOString();
  const expirationTime = new Date(Date.now() + 600000).toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${generationTime}</generationTime>
    <expirationTime>${expirationTime}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;
}

/**
 * Retrieves or generates a valid Ticket de Acceso (TA) for the given ARCA service.
 *
 * @param {string} service - The ARCA service identifier.
 * @param {object} config - Contains paths to the certificate and private key.
 * @returns {Promise<object>} The TA object including token, sign and expirationTime.
 */

async function getTA(service, config) {
  try {
    const environment = config.production ? "production" : "homologation";
    const folderName = config.production ? ".lastTokensP" : ".lastTokensH";

    const taPath = path.resolve(
      __dirname,
      `../../${folderName}/ta-${service}.json`
    );

    // Check if a valid TA already exists
    if (fs.existsSync(taPath)) {
      const cached = JSON.parse(fs.readFileSync(taPath, "utf8"));
      const expiration = new Date(cached.expirationTime);
      if (new Date() < expiration) return cached;
    }

    const xmlFilePath = path.resolve(
      __dirname,
      `../../${folderName}/LoginTicketRequest-${service}.xml`
    );
    const cmsFilePath = path.resolve(
      __dirname,
      `../../${folderName}/LoginTicketRequest-${service}.cms`
    );

    const loginTicketRequestXML = generateLoginTicketRequest(service);

    fs.writeFileSync(xmlFilePath, loginTicketRequestXML, "utf8");

    // Sign the XML using OpenSSL
    const opensslCmd = [
      "openssl smime -sign",
      "-inform DER",
      `-in ${xmlFilePath}`,
      `-signer ${config.certPath}`,
      `-inkey ${config.keyPath}`,
      "-outform DER",
      "-nodetach",
      "-binary",
      `-out ${cmsFilePath}`,
    ].join(" ");

    execSync(opensslCmd);

    const cmsBase64 = fs.readFileSync(cmsFilePath, "base64");
    const wsaaUrl = wsdlUrls.wsaa?.[environment];

    const client = await createSoapClient(wsaaUrl);
    const [response] = await client.loginCmsAsync({ in0: cmsBase64 });
    const parsedResponse = await parseStringPromise(response.loginCmsReturn);

    const ta = {
      token: parsedResponse.loginTicketResponse.credentials[0].token[0],
      sign: parsedResponse.loginTicketResponse.credentials[0].sign[0],
      expirationTime:
        parsedResponse.loginTicketResponse.header[0].expirationTime[0],
    };

    fs.mkdirSync(path.dirname(taPath), { recursive: true });
    fs.writeFileSync(taPath, JSON.stringify(ta, null, 2), "utf8");

    return ta;
  } catch (error) {
    console.error("Error generating or retrieving TA:", error);
    throw error;
  }
}

module.exports = { getTA };
