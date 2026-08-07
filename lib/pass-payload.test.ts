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
    expect(p.organizationName).toBe('E.Leclerc Andorra');
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

  it('adjunta la banda como data URI', () => {
    const p = buildPassPayload(base) as { stripURL: string };
    expect(p.stripURL.startsWith('data:image/png;base64,')).toBe(true);
    // la banda es la imagen mas pesada del pase: si baja de esto, esta truncada
    expect(p.stripURL.length).toBeGreaterThan(5000);
  });

  it('no filtra la clave de la API', () => {
    expect(JSON.stringify(buildPassPayload(base))).not.toContain('ww_live');
  });
});
