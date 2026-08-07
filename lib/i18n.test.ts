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
    expect(getDictionary('es').pass.numberLabel).toBe('Número');
    expect(getDictionary('fr').pass.numberLabel).toBe('Numéro');
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
