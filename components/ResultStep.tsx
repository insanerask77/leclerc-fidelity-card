'use client';

import { useEffect, useState } from 'react';
import type { Dictionary } from '@/lib/i18n';

type Props = {
  dict: Dictionary;
  applePass: string;
  googleSaveUrl: string;
  shareUrl: string;
};

function esIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function esAndroid() {
  if (typeof navigator === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

export default function ResultStep({ dict, applePass, googleSaveUrl, shareUrl }: Props) {
  const [qr, setQr] = useState<string | null>(null);
  const movil = esIOS() || esAndroid();

  // El QR solo tiene sentido en escritorio: sirve para saltar al móvil.
  useEffect(() => {
    if (movil || !shareUrl) return;
    void import('qrcode').then((m) => m.toDataURL(shareUrl, { width: 220 }).then(setQr));
  }, [movil, shareUrl]);

  return (
    <div className="space-y-6 text-center">
      <div>
        <h2 className="text-2xl font-semibold">{dict.ui.readyTitle}</h2>
        <p className="text-zinc-500">{dict.ui.readySubtitle}</p>
      </div>

      {/* Apple exige una navegación completa que devuelva el tipo MIME correcto:
          por eso es un form POST y no un enlace de descarga. */}
      {(esIOS() || !movil) && (
        <form method="POST" action="/api/download">
          <input type="hidden" name="applePass" value={applePass} />
          <button className="w-full rounded-xl bg-black px-4 py-4 text-white" type="submit">
            {dict.ui.addApple}
          </button>
        </form>
      )}

      {(esAndroid() || !movil) && (
        <a
          className="block w-full rounded-xl border-2 border-zinc-300 px-4 py-4 font-medium"
          href={googleSaveUrl}
        >
          {dict.ui.addGoogle}
        </a>
      )}

      {qr && (
        <div className="space-y-2 border-t border-zinc-200 pt-6">
          <p className="text-sm text-zinc-500">{dict.ui.desktopQr}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mx-auto" src={qr} alt="" width={220} height={220} />
        </div>
      )}
    </div>
  );
}
