import { z } from 'zod';
import { normalizeBarcode, BarcodeError } from '@/lib/barcode';
import { isLocale } from '@/lib/i18n';
import { buildPassPayload } from '@/lib/pass-payload';

const UPSTREAM = 'https://api.walletwallet.dev/api/passes';
const MAX_BODY = 4_096;

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

  const data = (await upstream.json()) as {
    applePass?: string;
    googleSaveUrl?: string;
    shareUrl?: string;
  };

  if (!data.applePass || !data.googleSaveUrl) {
    console.error('walletwallet: respuesta incompleta');
    return Response.json({ error: 'upstream_failed' }, { status: 502 });
  }

  // Solo lo que el cliente necesita. serialNumber no sale de aquí.
  return Response.json(
    {
      applePass: data.applePass,
      googleSaveUrl: data.googleSaveUrl,
      shareUrl: data.shareUrl ?? '',
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
