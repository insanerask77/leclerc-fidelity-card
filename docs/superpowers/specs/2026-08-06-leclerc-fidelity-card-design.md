# Tarjeta de fidelización E.Leclerc — Diseño

Fecha: 2026-08-06

## Problema

Los clientes de E. Leclerc Andorra llevan una tarjeta de fidelización física.
Queremos que puedan pasarla al monedero del móvil (Apple Wallet / Google Wallet)
sin ir al mostrador y sin instalar nada.

El usuario aporta tres cosas: su nombre, el código de barras de la tarjeta
física, y nada más. Sale un pase de monedero añadido al teléfono.

## Alcance

Dentro:

- Captura del código de barras con cámara, foto o teclado.
- Generación del pase vía la API de walletwallet.dev.
- Entrega inmediata a Apple Wallet y Google Wallet.
- Interfaz en catalán, castellano, francés e inglés.

Fuera, explícitamente (YAGNI):

- Cuentas de usuario, sesiones, base de datos.
- Envío por correo electrónico.
- Panel de administración, estadísticas, exportaciones.
- Actualización o revocación de pases ya emitidos.
- Alta de tarjetas nuevas (el usuario debe tener ya la tarjeta física).

## Restricciones descubiertas

Verificadas contra la API real el 2026-08-06:

1. `POST https://api.walletwallet.dev/api/passes` devuelve
   `{serialNumber, applePass, googleSaveUrl, shareUrl}`. El campo `applePass` es
   el fichero `.pkpass` **ya firmado**, en base64 (~7,4 KB). No hay que firmar
   nada, ni gestionar certificados de Apple, ni montar base de datos.
2. `barcodeFormat` **solo acepta `QR`, `PDF417`, `Aztec` y `Code128`**. No
   acepta `EAN13`. Es la restricción más importante del proyecto.
3. La API exige al menos uno de `title`, `primaryFields` o `logoText`.
4. `shareUrl` es una página alojada por walletwallet.dev, en inglés y con su
   marca, que ofrece los dos botones de monedero.

## Riesgo principal

**Confirmado el 2026-08-06 con una tarjeta real:** las tarjetas de E. Leclerc
Andorra son **EAN-13**. Ejemplo verificado: `2953499220191` (prefijo 2, código
interno de tienda; dígito de control válido).

Hay que reemitir los mismos dígitos como **Code128**. Esto no es una limitación
de walletwallet.dev: **Apple Wallet no soporta EAN-13 en ningún caso** — su
`pass.json` solo admite `PKBarcodeFormatQR`, `PDF417`, `Aztec` y `Code128`. En
iOS, Code128 es la única representación posible de un número de tarjeta, y es
lo que hace el resto del sector.

La mayoría de lectores de caja devuelven la misma cadena de dígitos con ambas
simbologías, pero no todos: algunos TPV están configurados para aceptar solo
EAN.

**RIESGO CERRADO el 2026-08-07.** El pase de prueba `PROVA-CAIXA.pkpass`
(número real, reemitido como Code128) se ha escaneado en una caja de
E. Leclerc Andorra y **el TPV lo acepta**. La reemisión EAN-13 → Code128 no
rompe la lectura en caja.

Era el único riesgo que podía invalidar el proyecto entero, y no se podía
cerrar desde el código: dependía del TPV. Ya no está abierto.

## Fiabilidad del escaneo

Verificado el 2026-08-06 decodificando con ZXing una foto real de la tarjeta:

| Variante de la imagen | Resultado |
|---|---|
| Original (foto de móvil) | `EAN_13` → `2953499220191` |
| Escala de grises + normalizada | `EAN_13` → `2953499220191` |
| Reducida a 800 px de ancho | `EAN_13` → `2953499220191` |
| **Rotada 90°** | **no lee** |

Conclusión: ZXing es suficiente, pero es ciego a la orientación. La ruta de
«subir foto» debe reintentar la decodificación a 0°, 90°, 180° y 270° antes de
darse por vencida. La ruta de cámara en vivo no lo necesita: el usuario encuadra
en tiempo real.

## Arquitectura

Next.js (App Router) desplegado en Vercel. Sin estado: ningún dato personal se
guarda en ningún sitio, ni en el servidor ni en el navegador más allá de la
sesión.

```
Navegador                        Servidor (Vercel)          walletwallet.dev
─────────                        ─────────────────          ────────────────
1. Escanea con ZXing
   la imagen no sale nunca
   del dispositivo
2. POST /api/pass          ──▶   valida entrada
   {name, value, format,          añade clave + marca  ──▶  crea el pase
    locale}                                            ◀──  {applePass,
                           ◀──   {googleSaveUrl,             googleSaveUrl,
                                  applePass, shareUrl}       shareUrl}
3. Apple: form POST        ──▶   /api/download
   (navegación completa)          devuelve binario con
                                  application/vnd.apple.pkpass
                                  → iOS abre Wallet
   Google: enlace directo a googleSaveUrl
```

### Por qué un `form` POST para Apple

iOS solo abre Wallet si la navegación devuelve un cuerpo con
`Content-Type: application/vnd.apple.pkpass`. Descargarlo desde un `blob:` en el
cliente no es fiable en Safari. Un `<form method="POST">` oculto que envía el
base64 a `/api/download` y provoca una navegación completa sí lo es, y mantiene
el sistema sin estado: no hay que guardar el pase entre peticiones.

### Módulos

| Fichero | Responsabilidad | Depende de |
|---|---|---|
| `lib/barcode.ts` | Normaliza el resultado del escaneo a `{value, format}` válido para la API. Mapea EAN-13/EAN-8/UPC/Code39/ITF → `Code128`. Valida longitud y caracteres. **Puro, sin DOM.** | nada |
| `lib/pass-payload.ts` | Construye el cuerpo JSON del pase: marca, colores, campos, idioma. **Puro.** | `lib/brand.ts`, `lib/i18n.ts` |
| `lib/i18n.ts` | Diccionarios ca/es/fr/en para la interfaz y para los campos del pase. | nada |
| `lib/brand.ts` | Los dos PNG en base64 (logo e icono) y los colores. **Solo servidor.** | nada |
| `app/api/pass/route.ts` | Valida la entrada, llama a walletwallet con la clave del entorno, devuelve solo lo necesario. | `lib/pass-payload.ts` |
| `app/api/download/route.ts` | Devuelve el `.pkpass` binario con las cabeceras correctas. | nada |
| `components/Scanner.tsx` | Cámara en vivo, foto y entrada manual. ZXing cargado en diferido. | `lib/barcode.ts` |
| `components/PassPreview.tsx` | Vista previa de cómo quedará la tarjeta. | `lib/i18n.ts` |
| `app/[locale]/page.tsx` | Orquesta los tres pasos. | todo lo anterior |

Toda la lógica que puede fallar en silencio vive en los dos módulos puros
(`barcode.ts`, `pass-payload.ts`), que se prueban sin navegador ni red.

## Flujo de usuario

Una sola página, tres pasos.

**1. Escanear.** La cámara se abre de inmediato con un marco guía y botón de
linterna. Al detectar un código: vibración corta y avance automático. Debajo,
dos enlaces discretos: «Hacer una foto» e «Introducir el número a mano».

**2. Nombre.** Un único campo de texto, máximo 40 caracteres (lo que cabe en la
tarjeta). Debajo, vista previa en vivo del pase.

**3. Listo.** Botón «Añadir a Apple Wallet» en iOS, «Guardar en Google Wallet»
en Android, ambos si no se puede detectar. En escritorio, además, un QR hacia
`shareUrl` para pasar al móvil.

El selector de idioma está siempre visible en la cabecera.

## Gestión de errores

Ningún error deja al usuario sin salida.

| Situación | Comportamiento |
|---|---|
| Permiso de cámara denegado | Pasa directamente a foto/manual, sin mensaje alarmante |
| No hay cámara (escritorio) | Arranca en modo manual |
| 15 s sin detectar nada | Sugiere la entrada manual sin interrumpir el escaneo |
| La foto no se puede decodificar | Reintenta una vez en escala de grises y más contraste; si falla, manual |
| Código sospechoso (< 6 caracteres, o caracteres no imprimibles) | Pide confirmación antes de generar |
| La API falla o no responde | Mensaje claro y botón de reintentar; el nombre y el código se conservan |
| `barcodeFormat` no soportado | Ya no puede ocurrir: `lib/barcode.ts` solo emite formatos válidos |

## Seguridad y privacidad

- La clave vive en `WALLETWALLET_API_KEY`, solo en el servidor. Nunca se envía
  al navegador.
- **La clave `ww_live_<REDACTADA>` se ha compartido por
  chat y debe considerarse comprometida. Hay que rotarla antes de publicar.**
- La foto de la tarjeta no sale nunca del dispositivo: se decodifica en el
  navegador.
- No se guarda ningún nombre, ni número de tarjeta, ni registro. El servidor es
  un intermediario sin memoria.
- `/api/pass` limita el tamaño del cuerpo y valida todos los campos antes de
  reenviar nada a terceros.

## Pruebas

- **Unitarias (Vitest)** sobre `lib/barcode.ts`: mapeo de formatos, validación
  de longitud, rechazo de caracteres inválidos, casos límite (EAN-13 con dígito
  de control, cadena vacía, espacios).
- **Unitarias** sobre `lib/pass-payload.ts`: el cuerpo generado siempre lleva
  uno de los campos obligatorios de la API, los cuatro idiomas producen
  etiquetas correctas, el formato siempre es uno de los cuatro aceptados.
- **Ruta API** con `fetch` simulado: entrada inválida → 400; error de terceros →
  502 con mensaje útil; éxito → solo los campos esperados.
- **Manual**, antes de publicar: escaneo real en iPhone y en Android, añadir a
  ambos monederos, y **escanear el pase resultante en una caja de E. Leclerc**
  para cerrar el riesgo de la simbología. Hecho el 2026-08-07: el TPV acepta
  el Code128.

## Identidad visual

Tomada de la tarjeta física de E. Leclerc Andorra (naranja con tipografía de
display blanca y el wordmark azul):

| Color | Hex | Blanco encima | Uso |
|---|---|---|---|
| Naranja Leclerc | `#e07608` | 3.11:1 | Superficies de marca y texto de display |
| Azul Leclerc | `#0f6cb1` | 5.53:1 | Botones y cualquier texto pequeño |

El naranja con blanco cumple WCAG AA **solo para texto grande** (≥24 px, o
≥18.66 px en negrita). Por eso las zonas naranjas llevan únicamente tipografía
de display, y todo el contenido interactivo va sobre blanco. Los botones usan
el azul, que pasa AA a cualquier tamaño.

Sin tema oscuro: la identidad es naranja y blanco, y una inversión automática
la rompe.

**Limitación del proveedor:** la API deriva ella misma `foregroundColor` y
`labelColor` del pase e ignora los que se le envíen. Con fondo naranja usa
negro para los valores (6.93:1, correcto) pero gris para las etiquetas
(2.70:1, por debajo de AA). No es corregible desde nuestro lado.

## Criterios de éxito

1. Un cliente con la tarjeta física en la mano tiene el pase en el monedero en
   menos de un minuto, sin ayuda.
2. El pase escanea correctamente en la caja.
3. Ningún dato personal queda guardado en ningún sitio.
4. Funciona en iOS Safari y en Android Chrome, los dos navegadores que importan.
