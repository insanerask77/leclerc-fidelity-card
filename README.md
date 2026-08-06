# Tarjeta de fidelización E.Leclerc Andorra

Web para que los clientes de E.Leclerc Andorra pasen su tarjeta física de
fidelización al monedero del móvil (Apple Wallet / Google Wallet) sin
instalar ninguna app. El cliente escanea la tarjeta con la cámara (o escribe
el número a mano), pone su nombre, y en menos de un minuto tiene el pase
listo para añadir.

No hay base de datos ni cuentas de usuario. No se persiste nada: ni el
nombre, ni el número de tarjeta, ni cookies, ni `localStorage`. La imagen de
la tarjeta se decodifica en el propio navegador (con ZXing) y nunca sale del
dispositivo; solo viaja el número ya leído.

## Arquitectura

Next.js App Router desplegado en Vercel, sin estado. El servidor solo hace
de intermediario con [walletwallet.dev](https://walletwallet.dev), que es
quien firma y devuelve el fichero `.pkpass`. El servidor añade la clave de
API y los datos de marca (logo, icono, colores) antes de reenviar la
petición.

Idiomas soportados: catalán (por defecto), castellano, francés e inglés. El
pase se emite en el idioma que el usuario tenga activo en el navegador.

## Cómo arrancarla en local

Requisitos: Node.js y npm.

```bash
npm install
npm run dev
```

La app queda en `http://localhost:3000`. La raíz (`/`) redirige
automáticamente a `/ca`, `/es`, `/fr` o `/en` según la cabecera
`Accept-Language` del navegador, con `ca` como idioma por defecto si no hay
ninguno soportado.

### Variables de entorno

| Variable | Dónde se usa | Notas |
|---|---|---|
| `WALLETWALLET_API_KEY` | Solo en Route Handlers del servidor (`process.env`) | **Nunca** debe llevar el prefijo `NEXT_PUBLIC_`. Si lo llevara, Next.js la incluiría en el bundle de cliente y quedaría expuesta a cualquiera que abra las herramientas de desarrollador. Ningún módulo que la lea puede importarse desde un componente `'use client'`. |

Crea un `.env.local` (no se versiona) con:

```
WALLETWALLET_API_KEY=tu_clave_aqui
```

### Assets de marca obligatorios

`assets/logo.png` (160×160) y `assets/icon.png` (120×120) **no están en el
repositorio** y son necesarios para que el pase incluya el logo y el icono
de E.Leclerc. Instrucciones para obtenerlos y verificarlos en
[`assets/README.md`](./assets/README.md).

## Qué está hecho y qué falta

Hecho y revisado:

- Tarea 1 — Andamiaje Next.js + Vitest
- Tarea 2 — `lib/barcode.ts` (normalización de códigos de barras)
- Tarea 3 — `lib/i18n.ts` (idiomas y diccionarios)
- Tarea 6 — `app/api/download/route.ts` (descarga del `.pkpass`)
- Tarea 7 — `components/Scanner.tsx` (cámara, foto, entrada manual)
- Tarea 8 — `components/PassPreview.tsx` (vista previa de la tarjeta)
- Tarea 9 — `components/ResultStep.tsx` y `app/[locale]/page.tsx` /
  `app/[locale]/CardWizard.tsx` (flujo completo de tres pasos)
- Tarea 10 (parcial, esta misma) — redirección de idioma en `app/page.tsx`,
  metadatos y viewport en `app/layout.tsx`, batería de pruebas y este README

**Pendiente y bloqueado — Tareas 4 y 5:**

- Tarea 4 (`lib/brand.ts` y `lib/pass-payload.ts`) y Tarea 5
  (`app/api/pass/route.ts`) **no están hechas**. Están bloqueadas porque
  faltan `assets/logo.png` y `assets/icon.png` (ver más arriba y
  `assets/README.md` para cómo obtenerlos).
- Consecuencia práctica: **`/api/pass` no existe todavía**. El último paso
  del asistente (generar el pase) dará un **404** hasta que se complete la
  Tarea 5. Es el comportamiento esperado en el estado actual del proyecto,
  no un fallo a corregir con este README.

## Antes de publicar

Esta lista es de comprobación **manual**, en dispositivos reales. Ningún
test automático la cubre.

- [ ] iPhone Safari: la cámara se abre y lee una tarjeta real
- [ ] iPhone: «Afegir a Apple Wallet» abre la hoja de Wallet y el pase se añade
- [ ] Android Chrome: la cámara se abre y lee una tarjeta real
- [ ] Android: «Guardar a Google Wallet» añade el pase
- [ ] Denegar el permiso de cámara → cae en entrada manual sin bloquearse
- [ ] Subir una foto girada 90° → la lee igualmente
- [ ] Escritorio: aparece el QR y lleva al móvil
- [ ] Los cuatro idiomas (ca, es, fr, en) se ven bien y sin textos cortados

### El punto decisivo (go/no-go)

- [ ] **Escanear el pase generado en una caja real de E. Leclerc.**

  Este punto decide si el proyecto se puede publicar o no. Las tarjetas de
  fidelización de E.Leclerc son código de barras **EAN-13**, pero Apple
  Wallet no soporta EAN-13 como formato de pase. Por eso el pase se reemite
  como **Code128 con los mismos dígitos** (ver la normalización en
  `lib/barcode.ts`). Un Code128 con los dígitos correctos debería ser legible
  por cualquier TPV que ya lea EAN-13, pero **hay que confirmarlo en una caja
  real** antes de dar el proyecto por bueno: si el lector de caja no acepta
  Code128, no hay forma de arreglarlo solo con software y hay que replantear
  el enfoque.

### Rotar la clave de API

- [ ] **Rotar `WALLETWALLET_API_KEY` antes de publicar.** La clave actual se
  compartió por un canal no seguro durante el desarrollo, así que hay que
  pedir una clave nueva a walletwallet.dev y usar esa (nunca la antigua) en
  la configuración de producción.

## Despliegue

El despliegue a Vercel (enlazar el proyecto, configurar la variable de
entorno con la clave rotada, y publicar) queda fuera del alcance de este
commit: requiere credenciales de Vercel y una decisión del dueño del
proyecto sobre cuándo publicar. Ver el plan de implementación
(`.superpowers/sdd/2026-08-06-leclerc-fidelity-card/task-10-brief.md`,
pasos 7 y 8) para los comandos exactos cuando se decida seguir adelante.
