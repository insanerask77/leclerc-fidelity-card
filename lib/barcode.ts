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

/**
 * Mapa de nombres de ZXing (y de la propia API) → formato aceptado por la API.
 *
 * IMPORTANTE: Usamos Map en lugar de un objeto literal porque los accesos con
 * corchetes a objetos consultan la cadena de prototipos. Las claves heredadas de
 * Object.prototype (como 'constructor', 'toString', '__proto__', etc.) devolverían
 * valores truthy (funciones u objetos) que pasarían la validación de formato pero
 * no son ninguno de los cuatro permitidos. Esto es crítico porque en la Tarea 5 el
 * formato llega desde el cuerpo de una petición POST controlada por el cliente.
 */
const FORMAT_MAP = new Map<string, ApiBarcodeFormat>([
  // 1D: todos colapsan a Code128
  ['EAN_13', 'Code128'],
  ['EAN_8', 'Code128'],
  ['UPC_A', 'Code128'],
  ['UPC_E', 'Code128'],
  ['CODE_39', 'Code128'],
  ['CODE_93', 'Code128'],
  ['CODE_128', 'Code128'],
  ['ITF', 'Code128'],
  ['CODABAR', 'Code128'],
  // 2D: se conservan
  ['QR_CODE', 'QR'],
  ['PDF_417', 'PDF417'],
  ['AZTEC', 'Aztec'],
  // nombres que ya usa la API, por si llegan tal cual
  ['Code128', 'Code128'],
  ['QR', 'QR'],
  ['PDF417', 'PDF417'],
  ['Aztec', 'Aztec'],
]);

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
  // Los números vienen impresos con espacios en la tarjeta ("2 953499 220191")
  // y el usuario los teclea tal cual. El código de barras no los codifica.
  const value = rawValue.replace(/\s+/g, '');

  if (value.length === 0) throw new BarcodeError('empty');
  if (value.length < MIN_LENGTH) throw new BarcodeError('too_short');
  if (value.length > MAX_LENGTH) throw new BarcodeError('too_long');
  if (!isEncodable(value)) throw new BarcodeError('invalid_chars');

  const format = FORMAT_MAP.get(zxingFormat);
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
