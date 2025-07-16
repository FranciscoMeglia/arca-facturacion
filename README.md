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
          CondicionIVAReceptorId: 5,
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

## ⚙️ Configuración

| Campo        | Descripción                               |
| ------------ | ----------------------------------------- |
| `certPath`   | Ruta absoluta al archivo `.crt`           |
| `keyPath`    | Ruta absoluta a la clave privada `.key`   |
| `cuit`       | CUIT del emisor autorizado por ARCA       |
| `production` | `true` para producción, `false` para test |

---

## 📚 Información Adicional

Toda la información de los métodos , ya sea para saber que método utilizar en situaciones determinadas , como enviar los datos del request o cualquier otro tipo de información podes verlo en el [manual para desarolladores WSFE de ARCA](https://www.arca.gob.ar/fe/documentos/manual-desarrollador-ARCA-COMPG-v4-0.pdf).

---

## 📜 Licencia

MIT

---

## 👨‍💻 Autor

Hecho con pasión por [Francisco Meglia](https://github.com/FranciscoMeglia) 🇦🇷
