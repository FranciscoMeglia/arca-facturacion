const { test, mock, before, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");

// mock.module() needs file:// URL specifiers for local files on Windows
// (a plain "C:\..." path silently fails to intercept the require).
const soapClientUrl = pathToFileURL(
  require.resolve("../lib/core/soapClient")
).href;
const authUrl = pathToFileURL(require.resolve("../lib/core/auth")).href;

const fakeTA = { token: "fake-token", sign: "fake-sign" };

let soapClientMock;
let getTASpy;

before(() => {
  soapClientMock = mock.module(soapClientUrl, {
    exports: {
      createSoapClient: async () => ({
        FEDummyAsync: async () => [{ AppServer: "OK" }],
      }),
    },
  });

  getTASpy = mock.fn(async () => fakeTA);
  mock.module(authUrl, {
    exports: {
      getTA: (...args) => getTASpy(...args),
    },
  });
});

let wsfe;
beforeEach(() => {
  delete require.cache[require.resolve("../lib/wsfe")];
  wsfe = require("../lib/wsfe");
});

test("callWsfe throws when there is no config", async () => {
  await assert.rejects(
    () => wsfe.callWsfe("FEDummy", {}),
    /Missing configuration/
  );
});

test("callWsfe uses the config passed via init()", async () => {
  wsfe.init({ certPath: "a", keyPath: "b", cuit: 123, production: false });
  const response = await wsfe.callWsfe("FEDummy", {});
  assert.deepEqual(response, { AppServer: "OK" });
});

test("callWsfe accepts a config passed directly, overriding init()", async () => {
  const response = await wsfe.callWsfe(
    "FEDummy",
    {},
    { certPath: "a", keyPath: "b", cuit: 456, production: true }
  );
  assert.deepEqual(response, { AppServer: "OK" });
});

test("callWsfe merges Auth (token/sign/cuit) with the given params", async () => {
  soapClientMock.restore();
  soapClientMock = mock.module(soapClientUrl, {
    exports: {
      createSoapClient: async () => ({
        FECompUltimoAutorizadoAsync: async (request) => [request],
      }),
    },
  });
  delete require.cache[require.resolve("../lib/wsfe")];
  wsfe = require("../lib/wsfe");

  const config = { certPath: "a", keyPath: "b", cuit: 789, production: false };
  const response = await wsfe.callWsfe(
    "FECompUltimoAutorizado",
    { CbteTipo: 13, PtoVta: 1 },
    config
  );

  assert.deepEqual(response, {
    Auth: { Token: fakeTA.token, Sign: fakeTA.sign, Cuit: 789 },
    CbteTipo: 13,
    PtoVta: 1,
  });
});

test("callWsfe throws when the SOAP client does not expose the method", async () => {
  await assert.rejects(
    () =>
      wsfe.callWsfe(
        "MetodoInexistente",
        {},
        { certPath: "a", keyPath: "b", cuit: 1, production: false }
      ),
    /MetodoInexistenteAsync not found/
  );
});

test("callWsfe validates FECAESolicitar params before touching auth/network", async () => {
  getTASpy.mock.resetCalls();

  await assert.rejects(
    () =>
      wsfe.callWsfe(
        "FECAESolicitar",
        { FeCAEReq: {} }, // missing FeDetReq - invalid
        { certPath: "a", keyPath: "b", cuit: 1, production: false }
      ),
    /Invalid FECAESolicitar request/
  );

  assert.equal(getTASpy.mock.calls.length, 0);
});
