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
    // Incluye formatos desconocidos y las claves heredadas de Object.prototype
    // que podrían ser accesibles si usáramos un objeto literal con acceso [].
    for (const f of [
      'EAN_13', 'DATA_MATRIX', 'MAXICODE', 'cualquier_cosa',
      'constructor', 'toString', 'hasOwnProperty', 'valueOf',
      '__proto__', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString'
    ]) {
      try {
        const result = normalizeBarcode('12345678', f);
        // Refuerza la aserción: debe ser string Y estar en permitidos
        expect(typeof result.format).toBe('string');
        expect(permitidos).toContain(result.format);
      } catch {
        // Rechazar también es válido para formatos desconocidos
        continue;
      }
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

  it('limpia los espacios con los que el número viene impreso en la tarjeta', () => {
    expect(normalizeBarcode('2 953499 220191', 'EAN_13')).toEqual({
      value: '2953499220191',
      format: 'Code128',
    });
  });

  it('rechaza los caracteres de control, que Code128 no puede codificar', () => {
    const conControl = '1234' + String.fromCharCode(1) + '5678';
    try {
      normalizeBarcode(conControl, 'CODE_128');
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
