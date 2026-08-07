import 'server-only';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Assets de marca. Los PNG viven en assets/ en binario, no como base64 en el
 * código fuente: así el diff se mantiene legible y el fichero no engorda.
 */

export const BRAND_COLOR = '#e07608';
export const COLOR_PRESET = 'orange';
export const ORG_NAME = 'E.Leclerc Andorra';
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
let stripCache: string | null = null;

export function logoDataUri(): string {
  logoCache ??= loadDataUri('logo.png');
  return logoCache;
}

export function iconDataUri(): string {
  iconCache ??= loadDataUri('icon.png');
  return iconCache;
}

/**
 * Banda que ocupa el ancho del pase, encima del codigo de barras. Es lo que
 * hace que el pase se parezca a la tarjeta fisica. Apple la dibuja a 375x144
 * pt; el fichero esta a 750x288 (@2x) y cuantizado a 8 colores, porque son
 * colores planos y a @3x el pase se pasaba del limite de /api/download.
 */
export function stripDataUri(): string {
  stripCache ??= loadDataUri('strip.png');
  return stripCache;
}
