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
