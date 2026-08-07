'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  normalizeBarcode,
  isSuspicious,
  BarcodeError,
  type NormalizedBarcode,
} from '@/lib/barcode';
import type { Dictionary } from '@/lib/i18n';

type Modo = 'camara' | 'manual';

type Props = {
  dict: Dictionary;
  onDetected: (barcode: NormalizedBarcode) => void;
};

/**
 * Formatos que pedimos a ZXing. Menos formatos, lectura más rápida.
 *
 * Devuelve también `nombreFormato`, porque `result.getBarcodeFormat()` da un
 * NÚMERO (EAN_13 es el 7), no el nombre. Sin esta conversión, normalizeBarcode
 * recibiría "7" y rechazaría siempre el código como formato desconocido.
 */
async function crearLector() {
  const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] =
    await Promise.all([import('@zxing/browser'), import('@zxing/library')]);

  const hints = new Map();
  hints.set(DecodeHintType.TRY_HARDER, true);
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.ITF,
    BarcodeFormat.QR_CODE,
  ]);

  return {
    lector: new BrowserMultiFormatReader(hints),
    /** 7 → "EAN_13" */
    nombreFormato: (codigo: number): string => BarcodeFormat[codigo] ?? 'desconocido',
  };
}

export default function Scanner({ dict, onDetected }: Props) {
  const [modo, setModo] = useState<Modo>('camara');
  const [error, setError] = useState<string | null>(null);
  const [pistaManual, setPistaManual] = useState(false);
  const [pendiente, setPendiente] = useState<NormalizedBarcode | null>(null);
  const [manual, setManual] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const procesandoRef = useRef(false);
  const montadoRef = useRef(true);

  /** Punto único de salida: valida, y si el código es raro pide confirmación. */
  const aceptar = useCallback(
    (valor: string, formato: string) => {
      try {
        const b = normalizeBarcode(valor, formato);
        controlsRef.current?.stop();
        if (isSuspicious(b.value)) setPendiente(b);
        else onDetected(b);
      } catch (e) {
        if (e instanceof BarcodeError) {
          setError(e.code === 'too_short' ? dict.ui.errorTooShort : dict.ui.errorInvalid);
        } else {
          setError(dict.ui.errorInvalid);
        }
      }
    },
    [dict, onDetected],
  );

  // Se dispara al desmontar: procesarFoto lo consulta tras cada await para no
  // tocar estado ni llamar a onDetected sobre un componente que ya no existe.
  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
    };
  }, []);

  // Cámara en vivo
  useEffect(() => {
    if (modo !== 'camara' || pendiente) return;
    let cancelado = false;

    (async () => {
      try {
        const { lector, nombreFormato } = await crearLector();
        const controls = await lector.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result) => {
            if (!result || cancelado) return;
            navigator.vibrate?.(60);
            aceptar(result.getText(), nombreFormato(result.getBarcodeFormat()));
          },
        );
        if (cancelado) controls.stop();
        else controlsRef.current = controls;
      } catch {
        if (!cancelado) {
          setError(dict.ui.errorCamera);
          setModo('manual');
        }
      }
    })();

    // A los 15 s sin lectura, ofrecemos el teclado sin cortar el escaneo.
    const t = setTimeout(() => setPistaManual(true), 15_000);

    return () => {
      cancelado = true;
      clearTimeout(t);
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [modo, pendiente, aceptar, dict]);

  /**
   * Foto. ZXing es ciego a la orientación (verificado: girada 90° no lee), así
   * que probamos las cuatro rotaciones antes de rendirnos.
   */
  const procesarFoto = useCallback(
    async (file: File) => {
      // Guarda de reentrada: si el usuario elige otra foto mientras esta se
      // procesa, la segunda se ignora en vez de correr en paralelo.
      if (procesandoRef.current) return;
      procesandoRef.current = true;
      setError(null);

      let bitmap: ImageBitmap | null = null;
      try {
        // createImageBitmap rechaza con HEIC, JPEG corrupto o truncado.
        bitmap = await createImageBitmap(file);
        const { lector, nombreFormato } = await crearLector();

        // ZXing es ciego a la orientacion: girada 90 grados no lee nada.
        for (const grados of [0, 90, 180, 270]) {
          const vertical = grados % 180 !== 0;
          const w = vertical ? bitmap.height : bitmap.width;
          const h = vertical ? bitmap.width : bitmap.height;

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d')!;
          ctx.translate(w / 2, h / 2);
          ctx.rotate((grados * Math.PI) / 180);
          ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);

          try {
            const r = lector.decodeFromCanvas(canvas);
            if (!montadoRef.current) return;
            aceptar(r.getText(), nombreFormato(r.getBarcodeFormat()));
            return;
          } catch {
            // probamos la siguiente rotacion
          }
        }

        if (!montadoRef.current) return;
        setError(dict.ui.errorDecode);
        setModo('manual');
      } catch {
        // La imagen no se pudo ni abrir. Antes esto dejaba al usuario
        // sin mensaje y sin salida.
        if (!montadoRef.current) return;
        setError(dict.ui.errorDecode);
        setModo('manual');
      } finally {
        bitmap?.close();
        procesandoRef.current = false;
      }
    },
    [aceptar, dict],
  );

  // Confirmación de un código sospechoso
  if (pendiente) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-lg">{dict.ui.confirmSuspicious}</p>
        <p className="font-mono text-2xl tracking-widest">{pendiente.value}</p>
        <div className="flex gap-3">
          <button
            className="flex-1 rounded-xl bg-leclerc-blue px-4 py-4 text-white"
            onClick={() => onDetected(pendiente)}
          >
            {dict.ui.confirmYes}
          </button>
          <button
            className="flex-1 rounded-xl border border-zinc-300 px-4 py-4"
            onClick={() => {
              setPendiente(null);
              setModo('camara');
            }}
          >
            {dict.ui.confirmNo}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">{dict.ui.scanTitle}</h2>

      {modo === 'camara' && (
        <>
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} className="w-full" playsInline muted />
            <div className="pointer-events-none absolute inset-x-6 inset-y-1/3 rounded-lg border-4 border-white/80" />
          </div>
          <p className="text-center text-sm text-zinc-500">{dict.ui.scanHint}</p>
        </>
      )}

      {modo === 'manual' && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            aceptar(manual, 'Code128');
          }}
        >
          <label className="block text-sm font-medium" htmlFor="manual">
            {dict.ui.manualLabel}
          </label>
          <input
            id="manual"
            className="w-full rounded-xl border border-zinc-300 px-4 py-4 text-lg tracking-widest"
            inputMode="numeric"
            autoComplete="off"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
          />
          <p className="text-sm text-zinc-500">{dict.ui.manualHint}</p>
          <button className="w-full rounded-xl bg-leclerc-blue px-4 py-4 text-white" type="submit">
            {dict.ui.continue}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {error}
        </p>
      )}

      <div className="flex justify-center gap-6 text-sm">
        <button className="underline" onClick={() => fileRef.current?.click()}>
          {dict.ui.usePhoto}
        </button>
        <button
          className={`underline ${pistaManual ? 'font-semibold' : ''}`}
          onClick={() => setModo('manual')}
        >
          {dict.ui.useManual}
        </button>
      </div>

      {/* Sin `capture`: iOS y Android abren una hoja nativa con camara Y
          galeria. Con `capture="environment"` se fuerza la camara y se pierde
          el acceso a fotos ya hechas, que es justo el caso de quien ya tenia
          fotografiada la tarjeta o se la mandaron. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void procesarFoto(f);
        }}
      />
    </div>
  );
}
