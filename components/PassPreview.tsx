import type { Dictionary } from '@/lib/i18n';

type Props = {
  dict: Dictionary;
  name: string;
  barcodeValue: string;
};

/** Maqueta de cómo se verá el pase. No es el pase real, solo una previsualización. */
export default function PassPreview({ dict, name, barcodeValue }: Props) {
  return (
    <div className="mx-auto w-full max-w-xs overflow-hidden rounded-2xl bg-leclerc-orange text-white shadow-lg">
      <div className="flex items-center justify-between px-5 pt-5">
        <span className="text-lg font-bold tracking-tight">E.Leclerc</span>
      </div>

      {/* Bloque de palabras de la tarjeta fisica. Decorativo: el lector de
          pantalla ya tiene el titulo y el nombre justo debajo. */}
      <p
        className="marca-palabras px-5 pt-4 text-[1.35rem] font-extrabold uppercase opacity-95"
        aria-hidden
      >
        Qualitat
        <span className="block font-light italic">Innovació</span>
        <span className="block font-bold">Preu baix</span>
      </p>

      {/* Los dos campos secundarios del pase, en el mismo orden y en columnas
          como los coloca Wallet. El numero va tambien en texto porque hay
          cajas sin lector que lo teclean a mano. */}
      <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide opacity-90">
            {dict.pass.nameLabel}
          </p>
          <p className="truncate text-lg font-medium">{name || '—'}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-sm font-semibold uppercase tracking-wide opacity-90">
            {dict.pass.numberLabel}
          </p>
          <p className="truncate font-mono text-lg font-medium">{barcodeValue}</p>
        </div>
      </div>

      <div className="bg-white px-5 py-4 text-center">
        <div className="flex h-14 items-end justify-center gap-[2px]" aria-hidden>
          {Array.from({ length: 42 }, (_, i) => (
            <span
              key={i}
              className="w-[2px] bg-black"
              style={{ height: `${40 + ((i * 37) % 60)}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
