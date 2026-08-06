# Tarjeta de fidelización E.Leclerc — Plan de implementación

> **Para agentes:** SUB-SKILL OBLIGATORIA: usa `superpowers:subagent-driven-development`
> (recomendada) o `superpowers:executing-plans` para implementar este plan tarea a
> tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** una web donde un cliente escanea su tarjeta física de E. Leclerc
Andorra, escribe su nombre, y la añade a Apple Wallet o Google Wallet en menos
de un minuto.

**Arquitectura:** Next.js App Router en Vercel, sin estado y sin base de datos.
El código de barras se decodifica **en el navegador** con ZXing (la imagen nunca
se sube). El servidor solo añade la clave de API y la marca, y hace de
intermediario con walletwallet.dev, que devuelve el `.pkpass` ya firmado.

**Stack:** Next.js 16.3, React 19.2, TypeScript, Tailwind CSS v4, Vitest 4.1,
`@zxing/library` 0.23 + `@zxing/browser` 0.2.1, `zod` 4.4, `qrcode` 1.5.

**Spec:** `docs/superpowers/specs/2026-08-06-leclerc-fidelity-card-design.md`

---

## Restricciones globales

Aplican a **todas** las tareas:

- **`barcodeFormat` solo puede ser `QR`, `PDF417`, `Aztec` o `Code128`.** Ningún
  otro valor. EAN-13 se reemite como `Code128` conservando los dígitos.
- **`WALLETWALLET_API_KEY` nunca puede aparecer en código de cliente.** Solo se
  lee en Route Handlers, con `process.env`. Ningún módulo que la toque puede ser
  importado desde un componente `'use client'`.
- **No se persiste nada.** Ni base de datos, ni cookies, ni `localStorage`, ni
  logs con el nombre o el número de tarjeta. En los `console.error` del servidor
  nunca se vuelca el cuerpo de la petición.
- **La imagen de la tarjeta no sale del dispositivo.** Solo viaja el texto ya
  decodificado.
- **Idiomas:** `ca` (por defecto), `es`, `fr`, `en`. El pase se emite en el
  idioma que el usuario tenga activo.
- **Endpoint:** `POST https://api.walletwallet.dev/api/passes`, cabecera
  `Authorization: Bearer <clave>`. Devuelve
  `{serialNumber, applePass, googleSaveUrl, shareUrl}`; `applePass` es el
  `.pkpass` en base64.
- **La API exige al menos uno** de `title`, `primaryFields` o `logoText`.
- **Móvil primero.** Objetivos reales: iOS Safari y Android Chrome.
- **Commits** en cada tarea, mensajes en castellano, tiempo presente.

## Requisito previo (bloqueante para la Tarea 4)

`assets/logo.png` y `assets/icon.png` no están en el repositorio. Hay que
extraerlos del curl original siguiendo `assets/README.md` y verificar con
`file assets/*.png` que pesan varios KB. Un fichero de ~200 bytes significa
base64 truncado. Las tareas 1–3 no dependen de ellos.

## Estructura de ficheros

| Fichero | Responsabilidad | Tarea |
|---|---|---|
| `lib/barcode.ts` | Normaliza lo escaneado a `{value, format}` válido. Puro. | 2 |
| `lib/i18n.ts` | Diccionarios ca/es/fr/en, interfaz y pase. Puro. | 3 |
| `lib/brand.ts` | Assets y colores. **Solo servidor.** | 4 |
| `lib/pass-payload.ts` | Construye el cuerpo para walletwallet. Puro. | 4 |
| `app/api/pass/route.ts` | Valida, llama a la API, devuelve lo mínimo. | 5 |
| `app/api/download/route.ts` | Sirve el `.pkpass` binario. | 6 |
| `components/Scanner.tsx` | Cámara, foto y entrada manual. | 7 |
| `components/PassPreview.tsx` | Vista previa de la tarjeta. | 8 |
| `components/ResultStep.tsx` | Botones de monedero y QR de escritorio. | 9 |
| `app/[locale]/page.tsx` | Orquesta los tres pasos. | 9 |
| `app/page.tsx` | Redirección por `Accept-Language`. | 10 |

---

### Tarea 1: Andamiaje del proyecto

**Ficheros:**
- Crear: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`
- Crear: `app/layout.tsx`, `app/globals.css`
- Crear: `lib/smoke.test.ts` (se borra en la Tarea 2)

**Interfaces:**
- Consume: nada
- Produce: `npm test` y `npm run dev` funcionando

- [ ] **Paso 1: Crear el proyecto Next.js**

```bash
npx --yes create-next-app@16.3.0 . \
  --typescript --tailwind --eslint --app \
  --src-dir=false --import-alias "@/*" --turbopack --yes
```

Si el directorio no está vacío, `create-next-app` se queja: mueve `docs/`,
`assets/` y `PROVA-CAIXA.pkpass` a `/tmp`, ejecuta el comando y vuelve a
ponerlos en su sitio.

- [ ] **Paso 2: Instalar el resto de dependencias**

```bash
npm i @zxing/library@0.23.0 @zxing/browser@0.2.1 zod@4.4.3 qrcode@1.5.4 server-only
npm i -D vitest@4.1.10 @types/qrcode@1.5.5
```

Los dos paquetes de ZXing van **en el mismo comando y con la versión fijada**:
`@zxing/browser@0.2.1` declara `@zxing/library@^0.23.0` como peer, e instalarlos
por separado hace que npm resuelva la 0.21 y falle con `ERESOLVE`.

- [ ] **Paso 3: Configurar Vitest**

Crear `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'app/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- [ ] **Paso 4: Añadir el script de test**

En `package.json`, dentro de `"scripts"`, añadir:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Paso 5: Escribir un test de humo**

Crear `lib/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('andamiaje', () => {
  it('ejecuta los tests', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Paso 6: Verificar que pasa**

Ejecutar: `npm test`
Esperado: 1 test en verde.

- [ ] **Paso 7: Verificar que el servidor arranca**

Ejecutar: `npm run dev`
Esperado: responde en `http://localhost:3000`. Parar con Ctrl-C.

- [ ] **Paso 8: Commit**

```bash
git add -A
git commit -m "chore: andamiaje Next.js con Vitest"
```

---

### Tarea 2: `lib/barcode.ts` — normalización del código

Aquí vive el riesgo del proyecto. Todo el módulo es puro y se prueba sin
navegador.

**Ficheros:**
- Crear: `lib/barcode.ts`
- Crear: `lib/barcode.test.ts`
- Borrar: `lib/smoke.test.ts`

**Interfaces:**
- Consume: nada
- Produce:
  - `type ApiBarcodeFormat = 'QR' | 'PDF417' | 'Aztec' | 'Code128'`
  - `type NormalizedBarcode = { value: string; format: ApiBarcodeFormat }`
  - `class BarcodeError extends Error` con `.code`
  - `normalizeBarcode(rawValue: string, zxingFormat: string): NormalizedBarcode`
  - `isSuspicious(value: string): boolean`

- [ ] **Paso 1: Escribir los tests que fallan**

Crear `lib/barcode.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalizeBarcode, isSuspicious, BarcodeError } from './barcode';

describe('normalizeBarcode', () => {
  it('reemite EAN-13 como Code128 conservando los dígitos', () => {
    expect(normalizeBarcode('2953499220191', 'EAN_13')).toEqual({
      value: '2953499220191',
      format: 'Code128',
    });
  });

  it('mapea las demás simbologías 1D a Code128', () => {
    for (const f of ['EAN_8', 'UPC_A', 'UPC_E', 'CODE_39', 'ITF', 'CODABAR', 'CODE_128']) {
      expect(normalizeBarcode('12345678', f).format).toBe('Code128');
    }
  });

  it('conserva los formatos 2D que la API acepta', () => {
    expect(normalizeBarcode('ABC123', 'QR_CODE').format).toBe('QR');
    expect(normalizeBarcode('ABC123', 'PDF_417').format).toBe('PDF417');
    expect(normalizeBarcode('ABC123', 'AZTEC').format).toBe('Aztec');
  });

  it('acepta los nombres de formato de la propia API', () => {
    expect(normalizeBarcode('ABC123', 'Code128').format).toBe('Code128');
    expect(normalizeBarcode('ABC123', 'QR').format).toBe('QR');
  });

  it('recorta los espacios de alrededor', () => {
    expect(normalizeBarcode('  2953499220191  ', 'EAN_13').value).toBe('2953499220191');
  });

  it('nunca devuelve un formato que la API rechace', () => {
    const permitidos = ['QR', 'PDF417', 'Aztec', 'Code128'];
    for (const f of ['EAN_13', 'DATA_MATRIX', 'MAXICODE', 'cualquier_cosa']) {
      let salida: string;
      try {
        salida = normalizeBarcode('12345678', f).format;
      } catch {
        continue; // rechazar también es válido
      }
      expect(permitidos).toContain(salida);
    }
  });

  it('rechaza la cadena vacía', () => {
    expect(() => normalizeBarcode('   ', 'EAN_13')).toThrow(BarcodeError);
    try {
      normalizeBarcode('', 'EAN_13');
    } catch (e) {
      expect((e as BarcodeError).code).toBe('empty');
    }
  });

  it('rechaza los códigos demasiado cortos', () => {
    try {
      normalizeBarcode('123', 'EAN_13');
      throw new Error('debería haber lanzado');
    } catch (e) {
      expect((e as BarcodeError).code).toBe('too_short');
    }
  });

  it('rechaza los códigos demasiado largos', () => {
    try {
      normalizeBarcode('1'.repeat(81), 'CODE_128');
      throw new Error('debería haber lanzado');
    } catch (e) {
      expect((e as BarcodeError).code).toBe('too_long');
    }
  });

  it('rechaza los caracteres no imprimibles, que Code128 no puede codificar', () => {
    try {
      normalizeBarcode('1234 5678', 'CODE_128');
      throw new Error('debería haber lanzado');
    } catch (e) {
      expect((e as BarcodeError).code).toBe('invalid_chars');
    }
  });

  it('rechaza los caracteres fuera de ASCII', () => {
    try {
      normalizeBarcode('12345ñ678', 'CODE_128');
      throw new Error('debería haber lanzado');
    } catch (e) {
      expect((e as BarcodeError).code).toBe('invalid_chars');
    }
  });

  it('rechaza los formatos desconocidos', () => {
    try {
      normalizeBarcode('12345678', 'DATA_MATRIX');
      throw new Error('debería haber lanzado');
    } catch (e) {
      expect((e as BarcodeError).code).toBe('unsupported_format');
    }
  });
});

describe('isSuspicious', () => {
  it('marca los códigos de menos de 6 caracteres', () => {
    expect(isSuspicious('12345')).toBe(true);
  });

  it('no marca un EAN-13 normal', () => {
    expect(isSuspicious('2953499220191')).toBe(false);
  });
});
```

- [ ] **Paso 2: Verificar que fallan**

Ejecutar: `npx vitest run lib/barcode.test.ts`
Esperado: FALLA — no se resuelve `./barcode`.

- [ ] **Paso 3: Implementar el módulo**

Crear `lib/barcode.ts`:

```ts
/**
 * Normaliza lo que devuelve el escáner a algo que la API de walletwallet acepte.
 *
 * Apple Wallet solo admite QR, PDF417, Aztec y Code128 — EAN-13 no existe para
 * iOS. Las tarjetas de E. Leclerc Andorra son EAN-13, así que se reemiten como
 * Code128 con los mismos dígitos. Los lectores de caja devuelven la misma cadena
 * con ambas simbologías.
 */

export const API_FORMATS = ['QR', 'PDF417', 'Aztec', 'Code128'] as const;
export type ApiBarcodeFormat = (typeof API_FORMATS)[number];

export type NormalizedBarcode = {
  value: string;
  format: ApiBarcodeFormat;
};

export type BarcodeErrorCode =
  | 'empty'
  | 'too_short'
  | 'too_long'
  | 'invalid_chars'
  | 'unsupported_format';

export class BarcodeError extends Error {
  constructor(readonly code: BarcodeErrorCode) {
    super(`barcode: ${code}`);
    this.name = 'BarcodeError';
  }
}

const MIN_LENGTH = 4;
const MAX_LENGTH = 80;
const SUSPICIOUS_BELOW = 6;

/** Nombres de ZXing (y de la propia API) → formato aceptado por la API. */
const FORMAT_MAP: Record<string, ApiBarcodeFormat> = {
  // 1D: todos colapsan a Code128
  EAN_13: 'Code128',
  EAN_8: 'Code128',
  UPC_A: 'Code128',
  UPC_E: 'Code128',
  CODE_39: 'Code128',
  CODE_93: 'Code128',
  CODE_128: 'Code128',
  ITF: 'Code128',
  CODABAR: 'Code128',
  // 2D: se conservan
  QR_CODE: 'QR',
  PDF_417: 'PDF417',
  AZTEC: 'Aztec',
  // nombres que ya usa la API, por si llegan tal cual
  Code128: 'Code128',
  QR: 'QR',
  PDF417: 'PDF417',
  Aztec: 'Aztec',
};

/** Code128 solo codifica ASCII imprimible (32–126). */
function isEncodable(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c < 32 || c > 126) return false;
  }
  return true;
}

export function normalizeBarcode(
  rawValue: string,
  zxingFormat: string,
): NormalizedBarcode {
  const value = rawValue.trim();

  if (value.length === 0) throw new BarcodeError('empty');
  if (value.length < MIN_LENGTH) throw new BarcodeError('too_short');
  if (value.length > MAX_LENGTH) throw new BarcodeError('too_long');
  if (!isEncodable(value)) throw new BarcodeError('invalid_chars');

  const format = FORMAT_MAP[zxingFormat];
  if (!format) throw new BarcodeError('unsupported_format');

  return { value, format };
}

/**
 * Códigos que probablemente sean una lectura parcial. No son inválidos, pero
 * conviene que el usuario los confirme antes de generar el pase.
 */
export function isSuspicious(value: string): boolean {
  return value.trim().length < SUSPICIOUS_BELOW;
}
```

- [ ] **Paso 4: Verificar que pasan**

Ejecutar: `npx vitest run lib/barcode.test.ts`
Esperado: todos en verde.

- [ ] **Paso 5: Borrar el test de humo**

```bash
rm lib/smoke.test.ts
npm test
```

Esperado: siguen en verde solo los de `barcode`.

- [ ] **Paso 6: Commit**

```bash
git add lib/barcode.ts lib/barcode.test.ts
git rm --cached lib/smoke.test.ts 2>/dev/null; git add -A
git commit -m "feat: normalización de códigos de barras a formatos de Apple Wallet"
```

---

### Tarea 3: `lib/i18n.ts` — los cuatro idiomas

**Ficheros:**
- Crear: `lib/i18n.ts`
- Crear: `lib/i18n.test.ts`

**Interfaces:**
- Consume: nada
- Produce:
  - `const LOCALES = ['ca', 'es', 'fr', 'en'] as const`
  - `type Locale = 'ca' | 'es' | 'fr' | 'en'`
  - `const DEFAULT_LOCALE: Locale`
  - `function isLocale(value: string): value is Locale`
  - `function getDictionary(locale: Locale): Dictionary`
  - `type Dictionary` con las claves `ui` y `pass`

- [ ] **Paso 1: Escribir los tests que fallan**

Crear `lib/i18n.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { LOCALES, DEFAULT_LOCALE, isLocale, getDictionary } from './i18n';

describe('i18n', () => {
  it('el idioma por defecto es el catalán', () => {
    expect(DEFAULT_LOCALE).toBe('ca');
  });

  it('reconoce los idiomas soportados', () => {
    expect(isLocale('ca')).toBe(true);
    expect(isLocale('de')).toBe(false);
  });

  it('todos los idiomas tienen exactamente las mismas claves', () => {
    const referencia = JSON.stringify(estructura(getDictionary('ca')));
    for (const l of LOCALES) {
      expect(JSON.stringify(estructura(getDictionary(l)))).toBe(referencia);
    }
  });

  it('ningún texto está vacío', () => {
    for (const l of LOCALES) {
      for (const [clave, valor] of textos(getDictionary(l))) {
        expect(valor.trim(), `${l}.${clave}`).not.toBe('');
      }
    }
  });

  it('los campos del pase están traducidos, no copiados del catalán', () => {
    expect(getDictionary('es').pass.title).toBe('Tarjeta de fidelización');
    expect(getDictionary('fr').pass.title).toBe('Carte de fidélité');
    expect(getDictionary('en').pass.nameLabel).toBe('Name');
  });
});

function estructura(o: unknown): unknown {
  if (typeof o !== 'object' || o === null) return typeof o;
  return Object.fromEntries(
    Object.entries(o).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, estructura(v)]),
  );
}

function textos(o: unknown, prefijo = ''): [string, string][] {
  if (typeof o === 'string') return [[prefijo, o]];
  if (typeof o !== 'object' || o === null) return [];
  return Object.entries(o).flatMap(([k, v]) => textos(v, prefijo ? `${prefijo}.${k}` : k));
}
```

- [ ] **Paso 2: Verificar que fallan**

Ejecutar: `npx vitest run lib/i18n.test.ts`
Esperado: FALLA — no se resuelve `./i18n`.

- [ ] **Paso 3: Implementar el módulo**

Crear `lib/i18n.ts`:

```ts
export const LOCALES = ['ca', 'es', 'fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ca';

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export type Dictionary = {
  /** Textos que van dentro del pase de monedero. */
  pass: {
    title: string;
    nameLabel: string;
  };
  /** Textos de la interfaz web. */
  ui: {
    appTitle: string;
    tagline: string;
    scanTitle: string;
    scanHint: string;
    usePhoto: string;
    useManual: string;
    manualLabel: string;
    manualHint: string;
    torch: string;
    nameTitle: string;
    nameLabel: string;
    namePlaceholder: string;
    continue: string;
    back: string;
    generating: string;
    readyTitle: string;
    readySubtitle: string;
    addApple: string;
    addGoogle: string;
    desktopQr: string;
    confirmSuspicious: string;
    confirmYes: string;
    confirmNo: string;
    errorCamera: string;
    errorDecode: string;
    errorNetwork: string;
    errorTooShort: string;
    errorInvalid: string;
    retry: string;
  };
};

const ca: Dictionary = {
  pass: { title: 'Targeta de fidelitat', nameLabel: 'Nom' },
  ui: {
    appTitle: 'Targeta de fidelitat',
    tagline: 'Porta la teva targeta al mòbil',
    scanTitle: 'Escaneja la teva targeta',
    scanHint: 'Enquadra el codi de barres dins del marc',
    usePhoto: 'Fer una foto',
    useManual: 'Introduir el número a mà',
    manualLabel: 'Número de la targeta',
    manualHint: 'És el número imprès sota el codi de barres',
    torch: 'Llanterna',
    nameTitle: 'Com et dius?',
    nameLabel: 'Nom',
    namePlaceholder: 'El teu nom',
    continue: 'Continuar',
    back: 'Enrere',
    generating: 'Creant la targeta…',
    readyTitle: 'Ja la tens!',
    readySubtitle: 'Afegeix-la al moneder del teu mòbil',
    addApple: 'Afegir a Apple Wallet',
    addGoogle: 'Guardar a Google Wallet',
    desktopQr: 'Escaneja aquest codi amb el mòbil per continuar-hi',
    confirmSuspicious: 'El número sembla massa curt. És correcte?',
    confirmYes: 'Sí, és correcte',
    confirmNo: 'No, tornar a escanejar',
    errorCamera: 'No podem accedir a la càmera. Fes una foto o escriu el número.',
    errorDecode: 'No hem pogut llegir el codi. Prova amb més llum o escriu el número.',
    errorNetwork: 'No hem pogut crear la targeta. Torna-ho a provar.',
    errorTooShort: 'El número és massa curt.',
    errorInvalid: 'Aquest número no és vàlid.',
    retry: 'Tornar a provar',
  },
};

const es: Dictionary = {
  pass: { title: 'Tarjeta de fidelización', nameLabel: 'Nombre' },
  ui: {
    appTitle: 'Tarjeta de fidelización',
    tagline: 'Lleva tu tarjeta en el móvil',
    scanTitle: 'Escanea tu tarjeta',
    scanHint: 'Encuadra el código de barras dentro del marco',
    usePhoto: 'Hacer una foto',
    useManual: 'Introducir el número a mano',
    manualLabel: 'Número de la tarjeta',
    manualHint: 'Es el número impreso bajo el código de barras',
    torch: 'Linterna',
    nameTitle: '¿Cómo te llamas?',
    nameLabel: 'Nombre',
    namePlaceholder: 'Tu nombre',
    continue: 'Continuar',
    back: 'Atrás',
    generating: 'Creando la tarjeta…',
    readyTitle: '¡Ya la tienes!',
    readySubtitle: 'Añádela al monedero de tu móvil',
    addApple: 'Añadir a Apple Wallet',
    addGoogle: 'Guardar en Google Wallet',
    desktopQr: 'Escanea este código con el móvil para continuar allí',
    confirmSuspicious: 'El número parece demasiado corto. ¿Es correcto?',
    confirmYes: 'Sí, es correcto',
    confirmNo: 'No, volver a escanear',
    errorCamera: 'No podemos acceder a la cámara. Haz una foto o escribe el número.',
    errorDecode: 'No hemos podido leer el código. Prueba con más luz o escribe el número.',
    errorNetwork: 'No hemos podido crear la tarjeta. Inténtalo de nuevo.',
    errorTooShort: 'El número es demasiado corto.',
    errorInvalid: 'Este número no es válido.',
    retry: 'Volver a intentar',
  },
};

const fr: Dictionary = {
  pass: { title: 'Carte de fidélité', nameLabel: 'Nom' },
  ui: {
    appTitle: 'Carte de fidélité',
    tagline: 'Emportez votre carte sur votre mobile',
    scanTitle: 'Scannez votre carte',
    scanHint: 'Cadrez le code-barres dans le cadre',
    usePhoto: 'Prendre une photo',
    useManual: 'Saisir le numéro manuellement',
    manualLabel: 'Numéro de la carte',
    manualHint: 'C’est le numéro imprimé sous le code-barres',
    torch: 'Lampe',
    nameTitle: 'Comment vous appelez-vous ?',
    nameLabel: 'Nom',
    namePlaceholder: 'Votre nom',
    continue: 'Continuer',
    back: 'Retour',
    generating: 'Création de la carte…',
    readyTitle: 'C’est prêt !',
    readySubtitle: 'Ajoutez-la au portefeuille de votre mobile',
    addApple: 'Ajouter à Apple Wallet',
    addGoogle: 'Enregistrer dans Google Wallet',
    desktopQr: 'Scannez ce code avec votre mobile pour continuer',
    confirmSuspicious: 'Le numéro semble trop court. Est-il correct ?',
    confirmYes: 'Oui, c’est correct',
    confirmNo: 'Non, scanner à nouveau',
    errorCamera: 'Accès à la caméra impossible. Prenez une photo ou saisissez le numéro.',
    errorDecode: 'Code illisible. Essayez avec plus de lumière ou saisissez le numéro.',
    errorNetwork: 'Impossible de créer la carte. Réessayez.',
    errorTooShort: 'Le numéro est trop court.',
    errorInvalid: 'Ce numéro n’est pas valide.',
    retry: 'Réessayer',
  },
};

const en: Dictionary = {
  pass: { title: 'Loyalty card', nameLabel: 'Name' },
  ui: {
    appTitle: 'Loyalty card',
    tagline: 'Carry your card on your phone',
    scanTitle: 'Scan your card',
    scanHint: 'Line the barcode up inside the frame',
    usePhoto: 'Take a photo',
    useManual: 'Enter the number manually',
    manualLabel: 'Card number',
    manualHint: 'It is the number printed under the barcode',
    torch: 'Torch',
    nameTitle: 'What is your name?',
    nameLabel: 'Name',
    namePlaceholder: 'Your name',
    continue: 'Continue',
    back: 'Back',
    generating: 'Creating your card…',
    readyTitle: 'All set!',
    readySubtitle: 'Add it to your phone’s wallet',
    addApple: 'Add to Apple Wallet',
    addGoogle: 'Save to Google Wallet',
    desktopQr: 'Scan this code with your phone to carry on there',
    confirmSuspicious: 'That number looks too short. Is it right?',
    confirmYes: 'Yes, that is right',
    confirmNo: 'No, scan again',
    errorCamera: 'We cannot reach the camera. Take a photo or type the number.',
    errorDecode: 'We could not read the code. Try more light, or type the number.',
    errorNetwork: 'We could not create your card. Please try again.',
    errorTooShort: 'That number is too short.',
    errorInvalid: 'That number is not valid.',
    retry: 'Try again',
  },
};

const DICTIONARIES: Record<Locale, Dictionary> = { ca, es, fr, en };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}
```

- [ ] **Paso 4: Verificar que pasan**

Ejecutar: `npx vitest run lib/i18n.test.ts`
Esperado: todos en verde. El test de estructura idéntica falla si a algún idioma
le falta una clave.

- [ ] **Paso 5: Commit**

```bash
git add lib/i18n.ts lib/i18n.test.ts
git commit -m "feat: diccionarios en catalán, castellano, francés e inglés"
```

---

### Tarea 4: `lib/brand.ts` y `lib/pass-payload.ts` — el cuerpo del pase

**Requisito previo:** `assets/logo.png` y `assets/icon.png` presentes y con
varios KB de tamaño. Ver `assets/README.md`.

**Ficheros:**
- Crear: `lib/brand.ts`
- Crear: `lib/pass-payload.ts`
- Crear: `lib/pass-payload.test.ts`

**Interfaces:**
- Consume: `NormalizedBarcode`, `ApiBarcodeFormat` (Tarea 2); `Locale`,
  `getDictionary` (Tarea 3)
- Produce:
  - `type PassInput = { name: string; barcode: NormalizedBarcode; locale: Locale }`
  - `function buildPassPayload(input: PassInput): Record<string, unknown>`
  - `const MAX_NAME_LENGTH = 40`
  - De `lib/brand.ts`: `BRAND_COLOR`, `ORG_NAME`, `LOGO_TEXT`, `logoDataUri()`,
    `iconDataUri()`

- [ ] **Paso 1: Escribir los tests que fallan**

Crear `lib/pass-payload.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildPassPayload, MAX_NAME_LENGTH } from './pass-payload';
import { LOCALES } from './i18n';
import { API_FORMATS } from './barcode';

const base = {
  name: 'Jordi Puig',
  barcode: { value: '2953499220191', format: 'Code128' as const },
  locale: 'ca' as const,
};

describe('buildPassPayload', () => {
  it('lleva el código y el formato tal cual', () => {
    const p = buildPassPayload(base);
    expect(p.barcodeValue).toBe('2953499220191');
    expect(p.barcodeFormat).toBe('Code128');
  });

  it('pasa el formato tal cual, sin reinterpretarlo', () => {
    for (const f of API_FORMATS) {
      const p = buildPassPayload({ ...base, barcode: { value: '12345678', format: f } });
      expect(p.barcodeFormat, f).toBe(f);
    }
  });

  it('siempre incluye uno de los campos que la API exige', () => {
    for (const l of LOCALES) {
      const p = buildPassPayload({ ...base, locale: l });
      const tieneAlguno = 'title' in p || 'primaryFields' in p || 'logoText' in p;
      expect(tieneAlguno, l).toBe(true);
    }
  });

  it('traduce los campos del pase según el idioma', () => {
    expect(JSON.stringify(buildPassPayload({ ...base, locale: 'es' })))
      .toContain('Tarjeta de fidelización');
    expect(JSON.stringify(buildPassPayload({ ...base, locale: 'fr' })))
      .toContain('Carte de fidélité');
  });

  it('pone el nombre en el campo secundario', () => {
    const p = buildPassPayload(base) as { secondaryFields: { label: string; value: string }[] };
    expect(p.secondaryFields[0].value).toBe('Jordi Puig');
    expect(p.secondaryFields[0].label).toBe('Nom');
  });

  it('recorta los nombres demasiado largos', () => {
    const p = buildPassPayload({ ...base, name: 'X'.repeat(100) }) as {
      secondaryFields: { value: string }[];
    };
    expect(p.secondaryFields[0].value.length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
  });

  it('recorta los espacios del nombre', () => {
    const p = buildPassPayload({ ...base, name: '  Jordi  ' }) as {
      secondaryFields: { value: string }[];
    };
    expect(p.secondaryFields[0].value).toBe('Jordi');
  });

  it('incluye la marca de la tienda', () => {
    const p = buildPassPayload(base);
    expect(p.organizationName).toBe('E. Leclerc Andorra');
    expect(p.logoText).toBe('E.Leclerc');
  });

  it('adjunta el logo y el icono como data URI', () => {
    const p = buildPassPayload(base) as { logoURL: string; iconURL: string };
    expect(p.logoURL.startsWith('data:image/png;base64,')).toBe(true);
    expect(p.iconURL.startsWith('data:image/png;base64,')).toBe(true);
    // un PNG real ocupa bastante más que unos pocos cientos de bytes
    expect(p.logoURL.length).toBeGreaterThan(1000);
    expect(p.iconURL.length).toBeGreaterThan(1000);
  });

  it('no filtra la clave de la API', () => {
    expect(JSON.stringify(buildPassPayload(base))).not.toContain('ww_live');
  });
});
```

- [ ] **Paso 2: Verificar que fallan**

Ejecutar: `npx vitest run lib/pass-payload.test.ts`
Esperado: FALLA — no se resuelve `./pass-payload`.

- [ ] **Paso 3: Implementar `lib/brand.ts`**

```ts
import 'server-only';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Assets de marca. Los PNG viven en assets/ en binario, no como base64 en el
 * código fuente: así el diff se mantiene legible y el fichero no engorda.
 */

export const BRAND_COLOR = '#1e40af';
export const COLOR_PRESET = 'blue';
export const ORG_NAME = 'E. Leclerc Andorra';
export const LOGO_TEXT = 'E.Leclerc';

function loadDataUri(file: string): string {
  const full = path.join(process.cwd(), 'assets', file);
  const bytes = readFileSync(full);
  if (bytes.length < 500) {
    throw new Error(
      `assets/${file} solo ocupa ${bytes.length} bytes: parece un base64 truncado. Ver assets/README.md`,
    );
  }
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

let logoCache: string | null = null;
let iconCache: string | null = null;

export function logoDataUri(): string {
  logoCache ??= loadDataUri('logo.png');
  return logoCache;
}

export function iconDataUri(): string {
  iconCache ??= loadDataUri('icon.png');
  return iconCache;
}
```

`server-only` ya se instaló en la Tarea 1. Hace que el build falle si algún
componente de cliente importa este módulo por error, que es justo lo que
protege la clave de API.

- [ ] **Paso 4: Implementar `lib/pass-payload.ts`**

```ts
import type { NormalizedBarcode } from './barcode';
import { type Locale, getDictionary } from './i18n';
import {
  BRAND_COLOR,
  COLOR_PRESET,
  ORG_NAME,
  LOGO_TEXT,
  logoDataUri,
  iconDataUri,
} from './brand';

/** Lo que cabe en el campo secundario del pase sin que se corte visualmente. */
export const MAX_NAME_LENGTH = 40;

export type PassInput = {
  name: string;
  barcode: NormalizedBarcode;
  locale: Locale;
};

export function buildPassPayload(input: PassInput): Record<string, unknown> {
  const dict = getDictionary(input.locale);
  const name = input.name.trim().slice(0, MAX_NAME_LENGTH);

  return {
    barcodeValue: input.barcode.value,
    barcodeFormat: input.barcode.format,
    logoText: LOGO_TEXT,
    organizationName: ORG_NAME,
    colorPreset: COLOR_PRESET,
    color: BRAND_COLOR,
    logoURL: logoDataUri(),
    iconURL: iconDataUri(),
    primaryFields: [{ value: dict.pass.title }],
    secondaryFields: [{ label: dict.pass.nameLabel, value: name }],
    backFields: [{ label: 'Notifications', value: ' ', changeMessage: '%@' }],
  };
}
```

- [ ] **Paso 5: Verificar que pasan**

Ejecutar: `npx vitest run lib/pass-payload.test.ts`
Esperado: todos en verde. Si falla con «parece un base64 truncado», los assets
están mal: vuelve al requisito previo.

- [ ] **Paso 6: Commit**

```bash
git add lib/brand.ts lib/pass-payload.ts lib/pass-payload.test.ts package.json package-lock.json
git commit -m "feat: construcción del cuerpo del pase con la marca de la tienda"
```

---

### Tarea 5: `app/api/pass/route.ts` — el intermediario

**Ficheros:**
- Crear: `app/api/pass/route.ts`
- Crear: `app/api/pass/route.test.ts`
- Crear: `.env.local.example`

**Interfaces:**
- Consume: `buildPassPayload` (Tarea 4), `normalizeBarcode`, `API_FORMATS`
  (Tarea 2), `isLocale` (Tarea 3)
- Produce: `POST /api/pass`
  - Entrada: `{ name: string, barcodeValue: string, barcodeFormat: string, locale: string }`
  - Salida 200: `{ applePass: string, googleSaveUrl: string, shareUrl: string }`
  - Salida 400: `{ error: 'invalid_input', detail: string }`
  - Salida 502: `{ error: 'upstream_failed' }`
  - Salida 500: `{ error: 'not_configured' }`

- [ ] **Paso 1: Escribir los tests que fallan**

Crear `app/api/pass/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './route';

const OK_UPSTREAM = {
  serialNumber: 'abc-123',
  applePass: 'UEsDBBQ' + 'A'.repeat(200),
  googleSaveUrl: 'https://pay.google.com/gp/v/save/xyz',
  shareUrl: 'https://api.walletwallet.dev/p/abc-123',
};

function peticion(body: unknown) {
  return new Request('http://localhost/api/pass', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALIDO = {
  name: 'Jordi Puig',
  barcodeValue: '2953499220191',
  barcodeFormat: 'EAN_13',
  locale: 'ca',
};

beforeEach(() => {
  process.env.WALLETWALLET_API_KEY = 'ww_test_clave';
  vi.stubGlobal('fetch', vi.fn(async () => Response.json(OK_UPSTREAM)));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('POST /api/pass', () => {
  it('devuelve solo los campos que el cliente necesita', async () => {
    const res = await POST(peticion(VALIDO));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(['applePass', 'googleSaveUrl', 'shareUrl']);
  });

  it('convierte EAN_13 en Code128 antes de llamar a la API', async () => {
    await POST(peticion(VALIDO));
    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const enviado = JSON.parse((init as RequestInit).body as string);
    expect(enviado.barcodeFormat).toBe('Code128');
    expect(enviado.barcodeValue).toBe('2953499220191');
  });

  it('manda la clave en la cabecera Authorization', async () => {
    await POST(peticion(VALIDO));
    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.get('authorization')).toBe('Bearer ww_test_clave');
  });

  it('nunca devuelve la clave al cliente', async () => {
    const res = await POST(peticion(VALIDO));
    expect(await res.text()).not.toContain('ww_test_clave');
  });

  it('rechaza el nombre vacío', async () => {
    const res = await POST(peticion({ ...VALIDO, name: '   ' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_input');
  });

  it('rechaza un código de barras inválido', async () => {
    const res = await POST(peticion({ ...VALIDO, barcodeValue: '12' }));
    expect(res.status).toBe(400);
  });

  it('rechaza un formato que la API no acepta', async () => {
    const res = await POST(peticion({ ...VALIDO, barcodeFormat: 'DATA_MATRIX' }));
    expect(res.status).toBe(400);
  });

  it('rechaza un idioma desconocido', async () => {
    const res = await POST(peticion({ ...VALIDO, locale: 'de' }));
    expect(res.status).toBe(400);
  });

  it('rechaza un cuerpo que no es JSON', async () => {
    const res = await POST(
      new Request('http://localhost/api/pass', { method: 'POST', body: 'no soy json' }),
    );
    expect(res.status).toBe(400);
  });

  it('devuelve 502 si la API de terceros falla', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })));
    const res = await POST(peticion(VALIDO));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe('upstream_failed');
  });

  it('devuelve 502 si la red se cae', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNRESET'); }));
    const res = await POST(peticion(VALIDO));
    expect(res.status).toBe(502);
  });

  it('devuelve 500 si falta la clave', async () => {
    delete process.env.WALLETWALLET_API_KEY;
    const res = await POST(peticion(VALIDO));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('not_configured');
  });
});
```

- [ ] **Paso 2: Verificar que fallan**

Ejecutar: `npx vitest run app/api/pass/route.test.ts`
Esperado: FALLA — no se resuelve `./route`.

- [ ] **Paso 3: Implementar la ruta**

Crear `app/api/pass/route.ts`:

```ts
import { z } from 'zod';
import { normalizeBarcode, BarcodeError } from '@/lib/barcode';
import { isLocale } from '@/lib/i18n';
import { buildPassPayload } from '@/lib/pass-payload';

const UPSTREAM = 'https://api.walletwallet.dev/api/passes';
const MAX_BODY = 4_096;

const Entrada = z.object({
  name: z.string().trim().min(1).max(100),
  barcodeValue: z.string().min(1).max(200),
  barcodeFormat: z.string().min(1).max(40),
  locale: z.string().min(2).max(5),
});

function malaEntrada(detail: string) {
  return Response.json({ error: 'invalid_input', detail }, { status: 400 });
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.WALLETWALLET_API_KEY;
  if (!apiKey) {
    console.error('WALLETWALLET_API_KEY no está configurada');
    return Response.json({ error: 'not_configured' }, { status: 500 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY) return malaEntrada('body_too_large');

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return malaEntrada('not_json');
  }

  const parsed = Entrada.safeParse(json);
  if (!parsed.success) return malaEntrada('schema');

  const { name, barcodeValue, barcodeFormat, locale } = parsed.data;
  if (!isLocale(locale)) return malaEntrada('locale');

  let barcode;
  try {
    barcode = normalizeBarcode(barcodeValue, barcodeFormat);
  } catch (e) {
    return malaEntrada(e instanceof BarcodeError ? e.code : 'barcode');
  }

  const payload = buildPassPayload({ name, barcode, locale });

  let upstream: Response;
  try {
    upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Nunca volcamos el cuerpo: lleva el nombre y el número de tarjeta.
    console.error('walletwallet: fallo de red');
    return Response.json({ error: 'upstream_failed' }, { status: 502 });
  }

  if (!upstream.ok) {
    console.error('walletwallet: estado', upstream.status);
    return Response.json({ error: 'upstream_failed' }, { status: 502 });
  }

  const data = (await upstream.json()) as {
    applePass?: string;
    googleSaveUrl?: string;
    shareUrl?: string;
  };

  if (!data.applePass || !data.googleSaveUrl) {
    console.error('walletwallet: respuesta incompleta');
    return Response.json({ error: 'upstream_failed' }, { status: 502 });
  }

  // Solo lo que el cliente necesita. serialNumber no sale de aquí.
  return Response.json(
    {
      applePass: data.applePass,
      googleSaveUrl: data.googleSaveUrl,
      shareUrl: data.shareUrl ?? '',
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
```

- [ ] **Paso 4: Verificar que pasan**

Ejecutar: `npx vitest run app/api/pass/route.test.ts`
Esperado: todos en verde.

- [ ] **Paso 5: Documentar la variable de entorno**

Crear `.env.local.example`:

```
# Clave de walletwallet.dev. Solo servidor: nunca con prefijo NEXT_PUBLIC_.
WALLETWALLET_API_KEY=ww_live_pon_aqui_tu_clave
```

Y crear el `.env.local` real (no se commitea, ya está en `.gitignore`) con la
clave rotada.

- [ ] **Paso 6: Commit**

```bash
git add app/api/pass .env.local.example
git commit -m "feat: endpoint de creación de pases con la clave en el servidor"
```

---

### Tarea 6: `app/api/download/route.ts` — servir el `.pkpass`

iOS solo abre Wallet si la navegación devuelve `application/vnd.apple.pkpass`.
Un `<form method="POST">` con el base64 provoca esa navegación sin que haya que
guardar el pase entre peticiones.

**Ficheros:**
- Crear: `app/api/download/route.ts`
- Crear: `app/api/download/route.test.ts`

**Interfaces:**
- Consume: nada
- Produce: `POST /api/download`, cuerpo `application/x-www-form-urlencoded` con
  el campo `applePass` (base64). Devuelve el binario o 400.

- [ ] **Paso 1: Escribir los tests que fallan**

Crear `app/api/download/route.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { POST } from './route';

/** Un ZIP mínimo válido: firma "PK\x03\x04" y relleno. */
const PKPASS_B64 = Buffer.concat([
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.alloc(600, 1),
]).toString('base64');

function form(campos: Record<string, string>) {
  return new Request('http://localhost/api/download', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(campos).toString(),
  });
}

describe('POST /api/download', () => {
  it('sirve el pase con el tipo que iOS necesita', async () => {
    const res = await POST(form({ applePass: PKPASS_B64 }));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/vnd.apple.pkpass');
  });

  it('lo sirve como adjunto con nombre .pkpass', async () => {
    const res = await POST(form({ applePass: PKPASS_B64 }));
    expect(res.headers.get('content-disposition')).toContain('.pkpass');
  });

  it('no permite que se cachee', async () => {
    const res = await POST(form({ applePass: PKPASS_B64 }));
    expect(res.headers.get('cache-control')).toContain('no-store');
  });

  it('devuelve los bytes originales', async () => {
    const res = await POST(form({ applePass: PKPASS_B64 }));
    const bytes = Buffer.from(await res.arrayBuffer());
    expect(bytes.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  });

  it('rechaza si falta el campo', async () => {
    expect((await POST(form({}))).status).toBe(400);
  });

  it('rechaza el base64 corrupto', async () => {
    expect((await POST(form({ applePass: '!!!no-base64!!!' }))).status).toBe(400);
  });

  it('rechaza lo que no sea un ZIP', async () => {
    const noZip = Buffer.alloc(600, 7).toString('base64');
    expect((await POST(form({ applePass: noZip }))).status).toBe(400);
  });

  it('rechaza un cuerpo desmesurado', async () => {
    const enorme = Buffer.alloc(600_000, 1).toString('base64');
    expect((await POST(form({ applePass: enorme }))).status).toBe(400);
  });
});
```

- [ ] **Paso 2: Verificar que fallan**

Ejecutar: `npx vitest run app/api/download/route.test.ts`
Esperado: FALLA — no se resuelve `./route`.

- [ ] **Paso 3: Implementar la ruta**

Crear `app/api/download/route.ts`:

```ts
/** Un .pkpass es un ZIP: debe empezar por la firma PK\x03\x04. */
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const MAX_PASS_BYTES = 512_000;

function mal() {
  return new Response('Bad Request', { status: 400 });
}

export async function POST(request: Request): Promise<Response> {
  const form = await request.formData();
  const b64 = form.get('applePass');

  if (typeof b64 !== 'string' || b64.length === 0) return mal();
  if (b64.length > MAX_PASS_BYTES) return mal();
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return mal();

  const bytes = Buffer.from(b64, 'base64');
  if (bytes.length < 100) return mal();
  if (!ZIP_MAGIC.every((b, i) => bytes[i] === b)) return mal();

  return new Response(new Uint8Array(bytes), {
    headers: {
      'content-type': 'application/vnd.apple.pkpass',
      'content-disposition': 'attachment; filename="eleclerc.pkpass"',
      'cache-control': 'no-store',
      'content-length': String(bytes.length),
    },
  });
}
```

- [ ] **Paso 4: Verificar que pasan**

Ejecutar: `npx vitest run app/api/download/route.test.ts`
Esperado: todos en verde.

- [ ] **Paso 5: Commit**

```bash
git add app/api/download
git commit -m "feat: descarga del .pkpass con el tipo MIME que iOS necesita"
```

---

### Tarea 7: `components/Scanner.tsx` — cámara, foto y teclado

**Ficheros:**
- Crear: `components/Scanner.tsx`

**Interfaces:**
- Consume: `normalizeBarcode`, `isSuspicious`, `BarcodeError` (Tarea 2);
  `Dictionary` (Tarea 3)
- Produce:
  ```ts
  type ScannerProps = {
    dict: Dictionary;
    onDetected: (barcode: NormalizedBarcode) => void;
  };
  export default function Scanner(props: ScannerProps): JSX.Element
  ```

- [ ] **Paso 1: Escribir el componente**

Crear `components/Scanner.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  normalizeBarcode,
  isSuspicious,
  BarcodeError,
  type NormalizedBarcode,
} from '@/lib/barcode';
import type { Dictionary } from '@/lib/i18n';

type Modo = 'camara' | 'manual';

type Props = {
  dict: Dictionary;
  onDetected: (barcode: NormalizedBarcode) => void;
};

/**
 * Formatos que pedimos a ZXing. Menos formatos, lectura más rápida.
 *
 * Devuelve también `nombreFormato`, porque `result.getBarcodeFormat()` da un
 * NÚMERO (EAN_13 es el 7), no el nombre. Sin esta conversión, normalizeBarcode
 * recibiría "7" y rechazaría siempre el código como formato desconocido.
 */
async function crearLector() {
  const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] =
    await Promise.all([import('@zxing/browser'), import('@zxing/library')]);

  const hints = new Map();
  hints.set(DecodeHintType.TRY_HARDER, true);
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.ITF,
    BarcodeFormat.QR_CODE,
  ]);

  return {
    lector: new BrowserMultiFormatReader(hints),
    /** 7 → "EAN_13" */
    nombreFormato: (codigo: number): string => BarcodeFormat[codigo] ?? 'desconocido',
  };
}

export default function Scanner({ dict, onDetected }: Props) {
  const [modo, setModo] = useState<Modo>('camara');
  const [error, setError] = useState<string | null>(null);
  const [pistaManual, setPistaManual] = useState(false);
  const [pendiente, setPendiente] = useState<NormalizedBarcode | null>(null);
  const [manual, setManual] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  /** Punto único de salida: valida, y si el código es raro pide confirmación. */
  const aceptar = useCallback(
    (valor: string, formato: string) => {
      try {
        const b = normalizeBarcode(valor, formato);
        controlsRef.current?.stop();
        if (isSuspicious(b.value)) setPendiente(b);
        else onDetected(b);
      } catch (e) {
        if (e instanceof BarcodeError) {
          setError(e.code === 'too_short' ? dict.ui.errorTooShort : dict.ui.errorInvalid);
        } else {
          setError(dict.ui.errorInvalid);
        }
      }
    },
    [dict, onDetected],
  );

  // Cámara en vivo
  useEffect(() => {
    if (modo !== 'camara' || pendiente) return;
    let cancelado = false;

    (async () => {
      try {
        const { lector, nombreFormato } = await crearLector();
        const controls = await lector.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result) => {
            if (!result || cancelado) return;
            navigator.vibrate?.(60);
            aceptar(result.getText(), nombreFormato(result.getBarcodeFormat()));
          },
        );
        if (cancelado) controls.stop();
        else controlsRef.current = controls;
      } catch {
        if (!cancelado) {
          setError(dict.ui.errorCamera);
          setModo('manual');
        }
      }
    })();

    // A los 15 s sin lectura, ofrecemos el teclado sin cortar el escaneo.
    const t = setTimeout(() => setPistaManual(true), 15_000);

    return () => {
      cancelado = true;
      clearTimeout(t);
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [modo, pendiente, aceptar, dict]);

  /**
   * Foto. ZXing es ciego a la orientación (verificado: girada 90° no lee), así
   * que probamos las cuatro rotaciones antes de rendirnos.
   */
  const procesarFoto = useCallback(
    async (file: File) => {
      setError(null);
      const bitmap = await createImageBitmap(file);
      const { lector, nombreFormato } = await crearLector();

      for (const grados of [0, 90, 180, 270]) {
        const vertical = grados % 180 !== 0;
        const w = vertical ? bitmap.height : bitmap.width;
        const h = vertical ? bitmap.width : bitmap.height;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.translate(w / 2, h / 2);
        ctx.rotate((grados * Math.PI) / 180);
        ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);

        try {
          const r = lector.decodeFromCanvas(canvas);
          aceptar(r.getText(), nombreFormato(r.getBarcodeFormat()));
          return;
        } catch {
          // probamos la siguiente rotación
        }
      }

      setError(dict.ui.errorDecode);
      setModo('manual');
    },
    [aceptar, dict],
  );

  // Confirmación de un código sospechoso
  if (pendiente) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-lg">{dict.ui.confirmSuspicious}</p>
        <p className="font-mono text-2xl tracking-widest">{pendiente.value}</p>
        <div className="flex gap-3">
          <button
            className="flex-1 rounded-xl bg-[#1e40af] px-4 py-4 text-white"
            onClick={() => onDetected(pendiente)}
          >
            {dict.ui.confirmYes}
          </button>
          <button
            className="flex-1 rounded-xl border border-zinc-300 px-4 py-4"
            onClick={() => {
              setPendiente(null);
              setModo('camara');
            }}
          >
            {dict.ui.confirmNo}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">{dict.ui.scanTitle}</h2>

      {modo === 'camara' && (
        <>
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} className="w-full" playsInline muted />
            <div className="pointer-events-none absolute inset-x-6 inset-y-1/3 rounded-lg border-4 border-white/80" />
          </div>
          <p className="text-center text-sm text-zinc-500">{dict.ui.scanHint}</p>
        </>
      )}

      {modo === 'manual' && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            aceptar(manual, 'Code128');
          }}
        >
          <label className="block text-sm font-medium" htmlFor="manual">
            {dict.ui.manualLabel}
          </label>
          <input
            id="manual"
            className="w-full rounded-xl border border-zinc-300 px-4 py-4 text-lg tracking-widest"
            inputMode="numeric"
            autoComplete="off"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
          />
          <p className="text-sm text-zinc-500">{dict.ui.manualHint}</p>
          <button className="w-full rounded-xl bg-[#1e40af] px-4 py-4 text-white" type="submit">
            {dict.ui.continue}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {error}
        </p>
      )}

      <div className="flex justify-center gap-6 text-sm">
        <button className="underline" onClick={() => fileRef.current?.click()}>
          {dict.ui.usePhoto}
        </button>
        <button
          className={`underline ${pistaManual ? 'font-semibold' : ''}`}
          onClick={() => setModo('manual')}
        >
          {dict.ui.useManual}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void procesarFoto(f);
        }}
      />
    </div>
  );
}
```

- [ ] **Paso 2: Comprobar que compila**

Ejecutar: `npx tsc --noEmit`
Esperado: sin errores.

La API usada aquí está verificada contra `@zxing/browser` 0.2.1 instalado:
`constructor(hints?, options?)`, `decodeFromVideoDevice(deviceId, previewElem, callback)
: Promise<IScannerControls>` y `decodeFromCanvas(canvas): Result` (síncrono, lanza
si no encuentra nada). Existen y tienen esas firmas.

- [ ] **Paso 3: Commit**

```bash
git add components/Scanner.tsx
git commit -m "feat: escáner con cámara, foto multi-rotación y entrada manual"
```

---

### Tarea 8: `components/PassPreview.tsx` — vista previa

**Ficheros:**
- Crear: `components/PassPreview.tsx`

**Interfaces:**
- Consume: `Dictionary` (Tarea 3)
- Produce:
  ```ts
  type PassPreviewProps = { dict: Dictionary; name: string; barcodeValue: string };
  export default function PassPreview(props: PassPreviewProps): JSX.Element
  ```

- [ ] **Paso 1: Escribir el componente**

Crear `components/PassPreview.tsx`:

```tsx
import type { Dictionary } from '@/lib/i18n';

type Props = {
  dict: Dictionary;
  name: string;
  barcodeValue: string;
};

/** Maqueta de cómo se verá el pase. No es el pase real, solo una previsualización. */
export default function PassPreview({ dict, name, barcodeValue }: Props) {
  return (
    <div className="mx-auto w-full max-w-xs overflow-hidden rounded-2xl bg-[#1e40af] text-white shadow-lg">
      <div className="flex items-center justify-between px-5 pt-5">
        <span className="text-lg font-bold tracking-tight">E.Leclerc</span>
      </div>

      <div className="px-5 pb-4 pt-6">
        <p className="text-xs uppercase tracking-wide text-white/60">
          {dict.pass.title}
        </p>
        <p className="mt-3 text-xs uppercase tracking-wide text-white/60">
          {dict.pass.nameLabel}
        </p>
        <p className="truncate text-lg font-medium">{name || '—'}</p>
      </div>

      <div className="bg-white px-5 py-4 text-center">
        <div className="flex h-14 items-end justify-center gap-[2px]" aria-hidden>
          {Array.from({ length: 42 }, (_, i) => (
            <span
              key={i}
              className="w-[2px] bg-black"
              style={{ height: `${40 + ((i * 37) % 60)}%` }}
            />
          ))}
        </div>
        <p className="mt-2 font-mono text-sm tracking-[0.2em] text-black">
          {barcodeValue}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Paso 2: Comprobar que compila**

Ejecutar: `npx tsc --noEmit`
Esperado: sin errores.

- [ ] **Paso 3: Commit**

```bash
git add components/PassPreview.tsx
git commit -m "feat: vista previa de la tarjeta"
```

---

### Tarea 9: `components/ResultStep.tsx` y `app/[locale]/page.tsx`

**Ficheros:**
- Crear: `components/ResultStep.tsx`
- Crear: `app/[locale]/page.tsx`
- Crear: `app/[locale]/CardWizard.tsx`

**Interfaces:**
- Consume: todo lo anterior
- Produce: la app funcionando en `/ca`, `/es`, `/fr`, `/en`

- [ ] **Paso 1: Escribir `ResultStep`**

Crear `components/ResultStep.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import type { Dictionary } from '@/lib/i18n';

type Props = {
  dict: Dictionary;
  applePass: string;
  googleSaveUrl: string;
  shareUrl: string;
};

function esIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function esAndroid() {
  if (typeof navigator === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

export default function ResultStep({ dict, applePass, googleSaveUrl, shareUrl }: Props) {
  const [qr, setQr] = useState<string | null>(null);
  const movil = esIOS() || esAndroid();

  // El QR solo tiene sentido en escritorio: sirve para saltar al móvil.
  useEffect(() => {
    if (movil || !shareUrl) return;
    void import('qrcode').then((m) => m.toDataURL(shareUrl, { width: 220 }).then(setQr));
  }, [movil, shareUrl]);

  return (
    <div className="space-y-6 text-center">
      <div>
        <h2 className="text-2xl font-semibold">{dict.ui.readyTitle}</h2>
        <p className="text-zinc-500">{dict.ui.readySubtitle}</p>
      </div>

      {/* Apple exige una navegación completa que devuelva el tipo MIME correcto:
          por eso es un form POST y no un enlace de descarga. */}
      {(esIOS() || !movil) && (
        <form method="POST" action="/api/download">
          <input type="hidden" name="applePass" value={applePass} />
          <button className="w-full rounded-xl bg-black px-4 py-4 text-white" type="submit">
            {dict.ui.addApple}
          </button>
        </form>
      )}

      {(esAndroid() || !movil) && (
        <a
          className="block w-full rounded-xl border-2 border-zinc-300 px-4 py-4 font-medium"
          href={googleSaveUrl}
        >
          {dict.ui.addGoogle}
        </a>
      )}

      {qr && (
        <div className="space-y-2 border-t border-zinc-200 pt-6">
          <p className="text-sm text-zinc-500">{dict.ui.desktopQr}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mx-auto" src={qr} alt="" width={220} height={220} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Paso 2: Escribir el orquestador**

Crear `app/[locale]/CardWizard.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Scanner from '@/components/Scanner';
import PassPreview from '@/components/PassPreview';
import ResultStep from '@/components/ResultStep';
import type { NormalizedBarcode } from '@/lib/barcode';
import type { Dictionary, Locale } from '@/lib/i18n';

type Resultado = { applePass: string; googleSaveUrl: string; shareUrl: string };

export default function CardWizard({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const [barcode, setBarcode] = useState<NormalizedBarcode | null>(null);
  const [name, setName] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function generar() {
    if (!barcode || !name.trim()) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch('/api/pass', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          barcodeValue: barcode.value,
          barcodeFormat: barcode.format,
          locale,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setResultado(await res.json());
    } catch {
      // El nombre y el código se conservan: reintentar no obliga a reescanear.
      setError(dict.ui.errorNetwork);
    } finally {
      setCargando(false);
    }
  }

  if (resultado) return <ResultStep dict={dict} {...resultado} />;

  if (!barcode) return <Scanner dict={dict} onDetected={setBarcode} />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">{dict.ui.nameTitle}</h2>

      <input
        className="w-full rounded-xl border border-zinc-300 px-4 py-4 text-lg"
        placeholder={dict.ui.namePlaceholder}
        aria-label={dict.ui.nameLabel}
        maxLength={40}
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <PassPreview dict={dict} name={name} barcodeValue={barcode.value} />

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          className="rounded-xl border border-zinc-300 px-5 py-4"
          onClick={() => setBarcode(null)}
        >
          {dict.ui.back}
        </button>
        <button
          className="flex-1 rounded-xl bg-[#1e40af] px-4 py-4 text-white disabled:opacity-40"
          disabled={!name.trim() || cargando}
          onClick={() => void generar()}
        >
          {cargando ? dict.ui.generating : dict.ui.continue}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Paso 3: Escribir la página**

Crear `app/[locale]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { LOCALES, isLocale, getDictionary } from '@/lib/i18n';
import CardWizard from './CardWizard';

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-5 py-8">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1e40af]">E.Leclerc</h1>
          <p className="text-sm text-zinc-500">{dict.ui.tagline}</p>
        </div>
        <nav className="flex gap-2 text-xs uppercase">
          {LOCALES.map((l) => (
            <Link
              key={l}
              href={`/${l}`}
              className={l === locale ? 'font-bold text-[#1e40af]' : 'text-zinc-400'}
            >
              {l}
            </Link>
          ))}
        </nav>
      </header>

      <CardWizard dict={dict} locale={locale} />
    </main>
  );
}
```

- [ ] **Paso 4: Comprobar que compila y arranca**

```bash
npx tsc --noEmit
npm run build
```

Esperado: build correcto. Abrir `/ca`, `/es`, `/fr` y `/en` con `npm run dev`.

- [ ] **Paso 5: Commit**

```bash
git add components/ResultStep.tsx app/\[locale\]
git commit -m "feat: flujo completo de tres pasos en los cuatro idiomas"
```

---

### Tarea 10: Redirección de idioma, pulido y despliegue

**Ficheros:**
- Crear: `app/page.tsx`
- Modificar: `app/layout.tsx`
- Crear: `README.md`

**Interfaces:**
- Consume: `LOCALES`, `DEFAULT_LOCALE`, `isLocale` (Tarea 3)
- Produce: la app desplegada

- [ ] **Paso 1: Redirigir la raíz según el navegador**

Crear `app/page.tsx`:

```tsx
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n';

export default async function Root() {
  const accept = (await headers()).get('accept-language') ?? '';

  // "fr-FR,fr;q=0.9,en;q=0.8" → ["fr", "fr", "en"] → primero que soportemos
  const preferido = accept
    .split(',')
    .map((parte) => parte.split(';')[0].trim().slice(0, 2).toLowerCase())
    .find((codigo) => isLocale(codigo));

  redirect(`/${preferido ?? DEFAULT_LOCALE}`);
}
```

- [ ] **Paso 2: Ajustar el layout**

En `app/layout.tsx`, poner metadatos y viewport para móvil:

```tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'E.Leclerc — Targeta de fidelitat',
  description: 'Porta la teva targeta de fidelitat al moneder del mòbil',
};

export const viewport: Viewport = {
  themeColor: '#1e40af',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ca">
      <body className="bg-white text-zinc-900 antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Paso 3: Pasar toda la batería de pruebas**

```bash
npm test
npx tsc --noEmit
npm run build
```

Esperado: todo en verde.

- [ ] **Paso 4: Escribir el README**

Crear `README.md` con: qué hace la app, cómo arrancarla, la variable
`WALLETWALLET_API_KEY`, el requisito de `assets/*.png`, y un apartado
**«Antes de publicar»** que recoja la lista de comprobación manual del paso 6.

- [ ] **Paso 5: Commit**

```bash
git add -A
git commit -m "feat: detección de idioma, metadatos y documentación"
```

- [ ] **Paso 6: Comprobación manual antes de publicar**

Esto no lo cubre ningún test. Hacerlo en dispositivos reales:

- [ ] iPhone Safari: la cámara se abre y lee una tarjeta real
- [ ] iPhone: «Afegir a Apple Wallet» abre la hoja de Wallet y el pase se añade
- [ ] Android Chrome: la cámara se abre y lee una tarjeta real
- [ ] Android: «Guardar a Google Wallet» añade el pase
- [ ] Denegar el permiso de cámara → cae en manual sin bloquearse
- [ ] Subir una foto girada 90° → la lee igualmente
- [ ] Escritorio: aparece el QR y lleva al móvil
- [ ] Los cuatro idiomas se ven bien y sin textos cortados
- [ ] **Escanear el pase generado en una caja de E. Leclerc** ← el go/no-go

- [ ] **Paso 7: Desplegar**

```bash
npm i -g vercel
vercel link
vercel env add WALLETWALLET_API_KEY production   # usar la clave ROTADA
vercel deploy --prod
```

- [ ] **Paso 8: Commit final**

```bash
git add -A
git commit -m "chore: configuración de despliegue"
```

---

## Notas de verificación del plan

Comprobado contra la spec:

- Captura por cámara, foto y teclado → Tarea 7
- Reemisión EAN-13 → Code128 → Tarea 2
- Reintento multi-rotación de la foto → Tarea 7, paso 1
- Cuatro idiomas, también en el pase → Tareas 3, 4, 9
- Clave solo en servidor → Tarea 5, verificado por test
- Nada persistido → sin base de datos en ninguna tarea
- Entrega a los dos monederos + QR de escritorio → Tarea 9
- Todos los casos de error de la spec → Tareas 5, 7, 9
- Validación en caja → Tarea 10, paso 6
