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
