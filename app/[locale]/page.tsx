import { notFound } from 'next/navigation';
import Link from 'next/link';
import { LOCALES, isLocale, getDictionary } from '@/lib/i18n';
import CardWizard from './CardWizard';

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-5 py-8">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1e40af]">E.Leclerc</h1>
          <p className="text-sm text-zinc-500">{dict.ui.tagline}</p>
        </div>
        <nav className="flex gap-2 text-xs uppercase">
          {LOCALES.map((l) => (
            <Link
              key={l}
              href={`/${l}`}
              className={l === locale ? 'font-bold text-[#1e40af]' : 'text-zinc-400'}
            >
              {l}
            </Link>
          ))}
        </nav>
      </header>

      <CardWizard dict={dict} locale={locale} />
    </main>
  );
}
