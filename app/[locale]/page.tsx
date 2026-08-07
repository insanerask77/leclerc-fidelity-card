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
    <div className="min-h-dvh">
      {/* Franja de marca: naranja con tipografia de display, como la tarjeta
          fisica. El blanco sobre naranja da 3.03:1, valido solo a este tamano. */}
      <header className="bg-leclerc-orange px-5 pb-6 pt-7 text-white">
        <div className="mx-auto max-w-md">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight">
              E.Leclerc<span className="ml-1 font-normal opacity-80">Andorra</span>
            </h1>
            <nav className="flex gap-2 pt-1 text-xs font-semibold uppercase">
              {LOCALES.map((l) => (
                <Link
                  key={l}
                  href={`/${l}`}
                  aria-current={l === locale ? 'page' : undefined}
                  className={
                    l === locale
                      ? 'rounded bg-white px-1.5 py-0.5 text-leclerc-orange-dark'
                      : 'px-1.5 py-0.5 text-white/80 hover:text-white'
                  }
                >
                  {l}
                </Link>
              ))}
            </nav>
          </div>

          <p className="marca-palabras mt-5 text-3xl font-extrabold uppercase">
            Fidelitat
            <span className="block text-2xl font-light italic normal-case tracking-normal opacity-90">
              {dict.ui.tagline}
            </span>
          </p>
        </div>
      </header>

      <main className="mx-auto flex max-w-md flex-col gap-8 px-5 pb-10 pt-7">
        <CardWizard dict={dict} locale={locale} />
      </main>
    </div>
  );
}
