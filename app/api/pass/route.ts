import { z } from 'zod';
import { normalizeBarcode, BarcodeError } from '@/lib/barcode';
import { isLocale } from '@/lib/i18n';
import { buildPassPayload } from '@/lib/pass-payload';

const UPSTREAM = 'https://api.walletwallet.dev/api/passes';
const MAX_BODY = 4_096;
const UPSTREAM_TIMEOUT_MS = 15_000;

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

  // Rechaza antes de bufferizar. La cabecera puede faltar o mentir, por eso
  // se mantiene la comprobacion sobre el texto ya leido mas abajo.
  const declarado = Number(request.headers.get('content-length') ?? 0);
  if (declarado > MAX_BODY) return malaEntrada('body_too_large');

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
      // Si el tercero se cuelga, preferimos un 502 claro a que el usuario
      // espere hasta que la plataforma mate la funcion.
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
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

  let data: unknown;
  try {
    data = await upstream.json();
  } catch {
    // 200 con HTML (WAF, mantenimiento) o cuerpo vacio.
    console.error('walletwallet: respuesta no es JSON');
    return Response.json({ error: 'upstream_failed' }, { status: 502 });
  }

  const esCadena = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
  const d = data as Record<string, unknown>;

  if (!esCadena(d.applePass) || !esCadena(d.googleSaveUrl)) {
    console.error('walletwallet: respuesta incompleta o con tipos inesperados');
    return Response.json({ error: 'upstream_failed' }, { status: 502 });
  }

  // Solo lo que el cliente necesita. serialNumber no sale de aqui.
  return Response.json(
    {
      applePass: d.applePass,
      googleSaveUrl: d.googleSaveUrl,
      shareUrl: esCadena(d.shareUrl) ? d.shareUrl : '',
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
