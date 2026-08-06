import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n';

export default async function Root() {
  const accept = (await headers()).get('accept-language') ?? '';

  // "fr-FR,fr;q=0.9,en;q=0.8" -> ordenado por peso, nos quedamos con el primero
  // que soportemos. q=0 significa "no lo quiero", asi que se descarta.
  const preferido = accept
    .split(',')
    .map((parte) => {
      const [etiqueta, ...parametros] = parte.split(';');
      const q = parametros.map((p) => p.trim()).find((p) => p.startsWith('q='));
      const peso = q ? Number.parseFloat(q.slice(2)) : 1;
      return {
        codigo: etiqueta.trim().slice(0, 2).toLowerCase(),
        peso: Number.isFinite(peso) ? peso : 0,
      };
    })
    .filter((entrada) => entrada.peso > 0 && isLocale(entrada.codigo))
    .sort((a, b) => b.peso - a.peso)[0]?.codigo;

  redirect(`/${preferido ?? DEFAULT_LOCALE}`);
}
