# Assets de marca

- `logo.png` — 160×160, va en `logoURL` de la llamada a walletwallet.dev
- `icon.png` — 120×120, va en `iconURL`
- `originales/` — los ficheros tal como los entregó el dueño del proyecto

`lib/brand.ts` los lee de aquí al arrancar y los convierte a data URI, de modo
que no haya base64 gigante en el código fuente. Sustituirlos no requiere tocar
ni una línea de código.

## Por qué están redimensionados

Los originales eran 1024×1024 (icono, 175 KB) y 256×256 (logo, 30 KB).
**La API de walletwallet.dev no redimensiona nada**: incrusta los PNG tal cual
en el `.pkpass`, y además por duplicado (`@1x` y `@2x`). Con los originales el
pase salía de **415 KB**, cuyo base64 son 553.036 caracteres — por encima del
límite de 512.000 de `app/api/download/route.ts`, así que **nuestra propia ruta
lo rechazaba con un 400 y el flujo de Apple no funcionaba**.

Redimensionados a 160×160 y 120×120 el pase queda en 43 KB (57.552 caracteres
de base64). Verificado de extremo a extremo contra la API real.

No se pierde calidad visible: Apple Wallet dibuja el icono a 29 pt (87 px en
pantallas @3x) y el logo a 160×50 pt como máximo.

## Si cambias los assets

Vuelve a comprobar el tamaño del pase resultante. La regla es que el base64 del
`.pkpass` debe quedar por debajo de 512.000 caracteres:

```bash
file assets/*.png     # comprueba dimensiones
ls -l assets/*.png    # entre 5 y 30 KB cada uno es lo razonable
npm test              # lib/pass-payload.test.ts debe seguir en verde
```

## Nota sobre qué fichero es cuál

Los originales venían con los roles intercambiados: `originales/logo.png` es el
**icono redondo** de la "L" y `originales/icon.png` es el **wordmark**
horizontal "E.Leclerc" rodeado de mucho blanco.

En un pase de Apple Wallet esos dos roles son distintos:

- `iconURL` → cuadrado pequeño, aparece en notificaciones y pantalla de bloqueo.
  Se dibuja a 29 pt. Aquí va el **icono redondo**.
- `logoURL` → la marca de la cabecera del pase, máximo 160×50 pt. Aquí va el
  **wordmark**.

Tal como venían, el wordmark habría acabado en el cuadradito de 29 pt, donde el
texto queda ilegible. Están recolocados: `logo.png` es el wordmark recortado a
su contenido real (480×150) y `icon.png` es el icono redondo (120×120). Ambos
cuantizados a paleta, porque son colores planos.
