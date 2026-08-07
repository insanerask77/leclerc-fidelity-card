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

  it('devuelve 502 si la API responde 200 con HTML en vez de JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response('<html>WAF</html>', { status: 200, headers: { 'content-type': 'text/html' } }),
    ));
    const res = await POST(peticion(VALIDO));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe('upstream_failed');
  });

  it('devuelve 502 si la API responde 200 con el cuerpo vacio', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200 })));
    expect((await POST(peticion(VALIDO))).status).toBe(502);
  });

  it('devuelve 502 si applePass no es una cadena', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      Response.json({ applePass: 12345, googleSaveUrl: 'https://x', shareUrl: 'https://y' }),
    ));
    expect((await POST(peticion(VALIDO))).status).toBe(502);
  });

  it('devuelve 502 si la API tarda demasiado', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      const e = new Error('The operation was aborted due to timeout');
      e.name = 'TimeoutError';
      throw e;
    }));
    expect((await POST(peticion(VALIDO))).status).toBe(502);
  });

  it('rechaza por content-length antes de leer el cuerpo', async () => {
    const res = await POST(
      new Request('http://localhost/api/pass', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': '999999' },
        body: JSON.stringify(VALIDO),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('tolera que shareUrl venga ausente', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      Response.json({ applePass: 'UEsDBBQ', googleSaveUrl: 'https://x' }),
    ));
    const res = await POST(peticion(VALIDO));
    expect(res.status).toBe(200);
    expect((await res.json()).shareUrl).toBe('');
  });
});
