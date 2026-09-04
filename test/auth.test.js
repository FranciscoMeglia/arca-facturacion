const { test, mock, before, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");

// Builtins can be mocked by their bare specifier, but mock.module() needs
// file:// URLs for local/node_modules files on Windows (a plain "C:\..."
// path silently fails to intercept the require).
const soapClientUrl = pathToFileURL(
  require.resolve("../lib/core/soapClient")
).href;
const xml2jsUrl = pathToFileURL(require.resolve("xml2js")).href;

let fsState;

before(() => {
  mock.module("fs", {
    exports: {
      existsSync: (...args) => fsState.existsSync(...args),
      readFileSync: (...args) => fsState.readFileSync(...args),
      writeFileSync: (...args) => fsState.writeFileSync(...args),
      mkdirSync: (...args) => fsState.mkdirSync(...args),
      rmSync: (...args) => fsState.rmSync(...args),
    },
  });

  mock.module("child_process", {
    exports: {
      execSync: (...args) => fsState.execSync(...args),
    },
  });

  mock.module(soapClientUrl, {
    exports: {
      createSoapClient: async () => ({
        loginCmsAsync: async () => [{ loginCmsReturn: "<xml/>" }],
      }),
    },
  });

  mock.module(xml2jsUrl, {
    exports: {
      parseStringPromise: async () => ({
        loginTicketResponse: {
          credentials: [{ token: ["fresh-token"], sign: ["fresh-sign"] }],
          header: [{ expirationTime: ["2999-01-01T00:00:00.000Z"] }],
        },
      }),
    },
  });
});

let auth;
beforeEach(() => {
  delete require.cache[require.resolve("../lib/core/auth")];
  auth = require("../lib/core/auth");
  fsState = {
    existsSync: mock.fn(() => false),
    readFileSync: mock.fn(() => "{}"),
    writeFileSync: mock.fn(),
    mkdirSync: mock.fn(),
    rmSync: mock.fn(),
    execSync: mock.fn(),
  };
});

test("getTA returns the cached TA when it is still valid", async () => {
  const cached = {
    token: "cached-token",
    sign: "cached-sign",
    expirationTime: "2999-01-01T00:00:00.000Z",
  };
  fsState.existsSync = mock.fn(() => true);
  fsState.readFileSync = mock.fn(() => JSON.stringify(cached));

  const ta = await auth.getTA("wsfe", {
    certPath: "a",
    keyPath: "b",
    production: false,
  });

  assert.deepEqual(ta, cached);
  assert.equal(fsState.execSync.mock.calls.length, 0);
});

test("getTA generates a new TA (via openssl + WSAA) when there is no cache", async () => {
  const ta = await auth.getTA("wsfe", {
    certPath: "a",
    keyPath: "b",
    production: false,
  });

  assert.equal(ta.token, "fresh-token");
  assert.equal(ta.sign, "fresh-sign");
  assert.equal(fsState.execSync.mock.calls.length, 1);
  assert.match(fsState.execSync.mock.calls[0].arguments[0], /openssl smime -sign/);
  assert.equal(fsState.writeFileSync.mock.calls.length, 2); // xml request + ta.json
  assert.equal(fsState.rmSync.mock.calls.length, 2); // temp xml + cms cleaned up
});

test("getTA generates a new TA when the cached one is expired", async () => {
  const expired = {
    token: "old-token",
    sign: "old-sign",
    expirationTime: "2000-01-01T00:00:00.000Z",
  };
  fsState.existsSync = mock.fn(() => true);
  fsState.readFileSync = mock.fn((p) =>
    String(p).endsWith(".json") ? JSON.stringify(expired) : "base64data"
  );

  const ta = await auth.getTA("wsfe", {
    certPath: "a",
    keyPath: "b",
    production: false,
  });

  assert.equal(ta.token, "fresh-token");
  assert.equal(fsState.execSync.mock.calls.length, 1);
});
