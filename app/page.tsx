import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n';

export default async function Root() {
  const accept = (await headers()).get('accept-language') ?? '';

  // "fr-FR,fr;q=0.9,en;q=0.8" → ["fr", "fr", "en"] → primero que soportemos
  const preferido = accept
    .split(',')
    .map((parte) => parte.split(';')[0].trim().slice(0, 2).toLowerCase())
    .find((codigo) => isLocale(codigo));

  redirect(`/${preferido ?? DEFAULT_LOCALE}`);
}
