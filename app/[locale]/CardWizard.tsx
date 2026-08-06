'use client';

import { useState } from 'react';
import Scanner from '@/components/Scanner';
import PassPreview from '@/components/PassPreview';
import ResultStep from '@/components/ResultStep';
import type { NormalizedBarcode } from '@/lib/barcode';
import type { Dictionary, Locale } from '@/lib/i18n';

type Resultado = { applePass: string; googleSaveUrl: string; shareUrl: string };

export default function CardWizard({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const [barcode, setBarcode] = useState<NormalizedBarcode | null>(null);
  const [name, setName] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function generar() {
    if (!barcode || !name.trim()) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch('/api/pass', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          barcodeValue: barcode.value,
          barcodeFormat: barcode.format,
          locale,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setResultado(await res.json());
    } catch {
      // El nombre y el código se conservan: reintentar no obliga a reescanear.
      setError(dict.ui.errorNetwork);
    } finally {
      setCargando(false);
    }
  }

  if (resultado) return <ResultStep dict={dict} {...resultado} />;

  if (!barcode) return <Scanner dict={dict} onDetected={setBarcode} />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">{dict.ui.nameTitle}</h2>

      <input
        className="w-full rounded-xl border border-zinc-300 px-4 py-4 text-lg"
        placeholder={dict.ui.namePlaceholder}
        aria-label={dict.ui.nameLabel}
        maxLength={40}
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <PassPreview dict={dict} name={name} barcodeValue={barcode.value} />

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          className="rounded-xl border border-zinc-300 px-5 py-4"
          onClick={() => setBarcode(null)}
        >
          {dict.ui.back}
        </button>
        <button
          className="flex-1 rounded-xl bg-[#1e40af] px-4 py-4 text-white disabled:opacity-40"
          disabled={!name.trim() || cargando}
          onClick={() => void generar()}
        >
          {cargando ? dict.ui.generating : dict.ui.continue}
        </button>
      </div>
    </div>
  );
}
