# arca-facturacion

Una librería simple y moderna para interactuar con el **Web Service de Facturación Electrónica (WSFE)** de ARCA utilizando Node.js.

## 🚀 ¿Qué hace esta librería?

Esta herramienta encapsula toda la lógica para:

- Autenticarse con ARCA.
- Crear el cliente SOAP.
- Llamar cualquier método del WSFE fácilmente y rapido.

👉 Vos solo te preocupás por **llamar el método deseado** y enviar los datos correctos.

---

## 📦 Instalación

```bash
npm install arca-facturacion
```

---

## 🧪 Ejemplo de uso

```js
const path = require("path");
const { init, callWsfe } = require("arca-facturacion");

// Inicializamos la librería

init({
  certPath: path.resolve(__dirname, "./certs/tuCertificado.crt"), // Tu .crt
  keyPath: path.resolve(__dirname, "./certs/tuClave.key"), // Tu .key
  cuit: 31111111119, // CUIT del emisor
  production: false, // false = homologación , true = produccion
});

async function dummy() {
  try {
    const response = await callWsfe("FEDummy", {}); // Pasamos por parametro el metodo y los datos a enviar
    console.log("Respuesta ARCA:", response);
  } catch (error) {
    console.error("Error consultando ARCA:", error.message);
  }
}
```

---

## ✨ ¿Qué métodos puedo usar?

Podés usar cualquier método del WSFE, como:

- `FEDummy`
- `FECAESolicitar`
- `FECAEASolicitar`
- `FECompUltimoAutorizado`
- `FECompConsultar`
- `FEParamGetTiposCbte`
- `FEParamGetPtosVenta`
- `FEParamGetTiposIva`
- y muchos más...

### 📌 Ejemplo `FECAESolicitar` (emitir factura electronica):

```js
const params = {
  FeCAEReq: {
    FeCabReq: {
      CantReg: 1,
      PtoVta: 1,
      CbteTipo: 1,
    },
    FeDetReq: {
      FECAEDetRequest: [
        {
          Concepto: 1,
          DocTipo: 80,
          DocNro: 20111111112,
          CbteDesde: 1,
          CbteHasta: 1,
          CbteFch: "20250716",
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
        },
      ],
    },
  },
};

const result = await callWsfe("FECAESolicitar", params);
```

---

## ✅ Validación de parámetros

Antes de enviar un `FECAESolicitar` a ARCA, la librería lo valida localmente contra las reglas de negocio conocidas de ARCA (campos requeridos, que los importes cierren, y que la `CondicionIVAReceptorId` sea válida para el `CbteTipo` indicado). Si algo no cierra, se tira un error inmediatamente **sin gastar un request contra ARCA**:

```js
try {
  await callWsfe("FECAESolicitar", params);
} catch (error) {
  console.error(error.message);
  // Invalid FECAESolicitar request:
  // - FECAEDetRequest[0].CondicionIVAReceptorId 5 ("Consumidor Final") is not
  //   valid for CbteTipo 1 (clase A). Valid clases for this condición: C/49.
}
```

También podés correr la validación vos mismo, sin llegar a llamar a `callWsfe`:

```js
const { validateFECAERequest } = require("arca-facturacion");

validateFECAERequest(params); // tira un error si algo está mal, no devuelve nada si está OK
```

> Esta validación solo cubre lo que las propias tablas de referencia de ARCA permiten chequear de antemano (campos obligatorios, importes, y compatibilidad `CondicionIVAReceptorId` ↔ `CbteTipo`) — no reemplaza la validación de ARCA, es una primera barrera para no gastar requests en errores previsibles.

---

## 🔳 Generar el QR obligatorio (RG 4291)

Desde la RG 4291, toda factura electrónica tiene que mostrar un código QR que apunte a la página de verificación de ARCA. Casi todos los datos que necesita el QR ya los tenés en el request que vos armaste (`det`) — la respuesta de ARCA (`detResp`) ni siquiera trae importe/moneda, y para un comprobante aceptado nunca cambia el `DocTipo`/`DocNro`/número que le pediste. El **único** dato que solo ARCA puede darte es el `CAE`:

```js
const { callWsfe, generateFacturaQR } = require("arca-facturacion");

// `det` es el mismo objeto que le pasaste en FeDetReq.FECAEDetRequest[0]
const response = await callWsfe("FECAESolicitar", params);
const detResp = response.FECAESolicitarResult.FeDetResp.FECAEDetResponse[0];

const { url, image } = await generateFacturaQR({
  fecha: "2026-09-04", // YYYY-MM-DD
  cuit: 20111111112, // CUIT del emisor
  ptoVta: 1,
  tipoCmp: 1, // mismo CbteTipo que enviaste
  nroCmp: det.CbteHasta,
  importe: det.ImpTotal,
  moneda: det.MonId,
  ctz: det.MonCotiz,
  tipoDocRec: det.DocTipo,
  nroDocRec: det.DocNro,
  tipoCodAut: "E", // "E" = CAE, "A" = CAEA
  codAut: detResp.CAE, // el único campo que sale de la respuesta de ARCA
});

console.log(url); // https://www.afip.gob.ar/fe/qr/?p=...
console.log(image); // data:image/png;base64,... listo para un <img src> o para insertar en un PDF
```

`generateFacturaQR(data, { format })` acepta `"dataUrl"` (default), `"png"` (Buffer) o `"svg"` (string). Si ya generás las imágenes QR con otra librería, `buildFacturaQRUrl(data)` te da solo la URL, sin generar ninguna imagen.

Ver el ejemplo completo, con `FECAESolicitar` + QR encadenados, en [`example/billExample.js`](example/billExample.js).

---

## ⚙️ Configuración

| Campo        | Descripción                               |
| ------------ | ----------------------------------------- |
| `certPath`   | Ruta absoluta al archivo `.crt`           |
| `keyPath`    | Ruta absoluta a la clave privada `.key`   |
| `cuit`       | CUIT del emisor autorizado por ARCA       |
| `production` | `true` para producción, `false` para test |

---

## 🧪 Tests

```bash
npm test
```

Corre los tests unitarios (mockean el cliente SOAP y ARCA, no requieren certificados ni red).

Para correr también los tests de integración, que pegan contra el WSFE/WSAA real de ARCA (homologación por defecto) usando tus propios certificados:

```bash
# Opción 1: dejá tus certs en certs/arca.crt y certs/arca.key, y pasá el CUIT como argumento
npm run test:integration 20111111112

# Opción 2: apuntá a otra ubicación de certs con variables de entorno
ARCA_CERT_PATH=/ruta/a/arca.crt ARCA_KEY_PATH=/ruta/a/arca.key npm run test:integration 20111111112
```

Si no encuentran certificados, estos tests se skipean (no fallan) — son opcionales y pensados para correr localmente con tus propias credenciales.

---

## 📚 Información Adicional

Toda la información de los métodos , ya sea para saber que método utilizar en situaciones determinadas , como enviar los datos del request o cualquier otro tipo de información podes verlo en el [manual para desarolladores WSFE de ARCA](https://www.arca.gob.ar/fe/documentos/manual-desarrollador-ARCA-COMPG-v4-0.pdf).

---

## 📜 Licencia

MIT

---

## 👨‍💻 Autor

Hecho con pasión por [Francisco Meglia](https://github.com/FranciscoMeglia) 🇦🇷
