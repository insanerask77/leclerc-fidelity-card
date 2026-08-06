/** Un .pkpass es un ZIP: debe empezar por la firma PK\x03\x04. */
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const MAX_PASS_BYTES = 512_000;

function mal() {
  return new Response('Bad Request', { status: 400 });
}

export async function POST(request: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    // Content-Type ausente o cuerpo no parseable: entrada malformada, no un fallo nuestro.
    return mal();
  }
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
