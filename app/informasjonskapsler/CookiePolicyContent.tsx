'use client'

import { useCookieConsent } from '@/contexts/CookieConsentContext'
import { Settings } from 'lucide-react'

export function CookiePolicyContent() {
  const { resetConsent } = useCookieConsent()

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
        Informasjonskapsler (cookies)
      </h1>

      {/* Introduction */}
      <section className="mb-8">
        <p className="text-gray-700 text-sm leading-relaxed mb-4">
          Informasjonskapsler (cookies) er små tekstfiler som plasseres på din datamaskin når du
          besøker en nettside. Vi bruker informasjonskapsler til følgende formål:
        </p>
        <ul className="list-disc list-inside text-gray-700 text-sm space-y-1 mb-4">
          <li>For at ulike tjenester på nettsiden vår skal fungere.</li>
          <li>For å samle inn anonymisert statistikk om besøk på nettsiden (analyse).</li>
        </ul>
        <p className="text-gray-700 text-sm leading-relaxed">
          Våre nettsider benytter noen få informasjonskapsler til sikkerhet. I tillegg bruker vi
          cookies til analyse og markedsføring der vi ber om samtykke først. Du kan trekke tilbake
          samtykket når som helst ved å velge «Administrer cookies» nederst på våre sider.
        </p>
      </section>

      {/* Necessary cookies */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Nødvendige cookies</h2>
        <p className="text-gray-700 text-sm mb-4">
          Disse støtter opp under kjernefunksjonalitet knyttet til sikkerhet og samtykke. Vi har
          vurdert disse som nødvendige, og de lagres derfor uten samtykke.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700 border-b">Navn</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700 border-b">Formål</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700 border-b">Lagringstid</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700 border-b">Mottaker</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-800">CookieConsent</td>
                <td className="px-4 py-2.5 text-gray-600">Administrasjon av samtykke</td>
                <td className="px-4 py-2.5 text-gray-600">90 dager</td>
                <td className="px-4 py-2.5 text-gray-600">vitalii.no</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Analytics and marketing cookies */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Analyse og markedsføring (valgfri)</h2>
        <p className="text-gray-700 text-sm mb-4">
          Dette er nødvendig å samtykke til dersom du ønsker å hjelpe oss med å forbedre nettsidene
          våre gjennom anonym statistikk. Den øvrige funksjonaliteten på nettsidene påvirkes ikke
          dersom du lar være å samtykke. Valget du tar gjelder i inntil 90 dager.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700 border-b">Navn</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700 border-b">Formål</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700 border-b">Lagringstid</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700 border-b">Mottaker</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-800">_ga</td>
                <td className="px-4 py-2.5 text-gray-600">Unik besøks-ID for Google Analytics</td>
                <td className="px-4 py-2.5 text-gray-600">2 år</td>
                <td className="px-4 py-2.5 text-gray-600">Google</td>
              </tr>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-800">_gid</td>
                <td className="px-4 py-2.5 text-gray-600">Skiller mellom økter</td>
                <td className="px-4 py-2.5 text-gray-600">24 timer</td>
                <td className="px-4 py-2.5 text-gray-600">Google</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-800">_gat</td>
                <td className="px-4 py-2.5 text-gray-600">Begrenser antall forespørsler</td>
                <td className="px-4 py-2.5 text-gray-600">1 minutt</td>
                <td className="px-4 py-2.5 text-gray-600">Google</td>
              </tr>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-800">_fbp</td>
                <td className="px-4 py-2.5 text-gray-600">Sporing på tvers av nettsteder</td>
                <td className="px-4 py-2.5 text-gray-600">90 dager</td>
                <td className="px-4 py-2.5 text-gray-600">Meta (Facebook)</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-800">_fbc</td>
                <td className="px-4 py-2.5 text-gray-600">Klikksporing fra Facebook</td>
                <td className="px-4 py-2.5 text-gray-600">90 dager</td>
                <td className="px-4 py-2.5 text-gray-600">Meta (Facebook)</td>
              </tr>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-800">li_sugr</td>
                <td className="px-4 py-2.5 text-gray-600">Nettleser-ID for LinkedIn</td>
                <td className="px-4 py-2.5 text-gray-600">90 dager</td>
                <td className="px-4 py-2.5 text-gray-600">LinkedIn</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-800">bcookie</td>
                <td className="px-4 py-2.5 text-gray-600">Nettleser-ID for LinkedIn</td>
                <td className="px-4 py-2.5 text-gray-600">1 år</td>
                <td className="px-4 py-2.5 text-gray-600">LinkedIn</td>
              </tr>
              <tr className="bg-gray-50/50">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-800">lidc</td>
                <td className="px-4 py-2.5 text-gray-600">Valg av datasenter</td>
                <td className="px-4 py-2.5 text-gray-600">24 timer</td>
                <td className="px-4 py-2.5 text-gray-600">LinkedIn</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-gray-500 text-xs mt-2">
          * Dersom du samtykker, vil valgfrie cookies lagres inntil du trekker samtykket tilbake.
          Valgfrie cookies vil uansett slettes automatisk etter angitt lagringstid.
        </p>
      </section>

      {/* Local storage */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Lokal lagring (localStorage)</h2>
        <p className="text-gray-700 text-sm mb-4">
          I tillegg til cookies bruker vi nettleserens lokale lagring for å forbedre brukeropplevelsen.
          Disse er ikke cookies og sendes ikke til tredjeparts tjenester.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700 border-b">Navn</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700 border-b">Formål</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700 border-b">Lagringstid</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-800">contactForm_lastSubmit</td>
                <td className="px-4 py-2.5 text-gray-600">Begrenser gjentatte innsendinger av kontaktskjema</td>
                <td className="px-4 py-2.5 text-gray-600">60 sekunder</td>
              </tr>
              <tr className="bg-gray-50/50">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-800">footerData_*</td>
                <td className="px-4 py-2.5 text-gray-600">Cache for vær- og stedsdata i bunnteksten</td>
                <td className="px-4 py-2.5 text-gray-600">30 minutter</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Manage cookies */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Administrere cookies</h2>
        <p className="text-gray-700 text-sm mb-4">
          Dersom du har godtatt eller reservert deg mot enkelte cookies på våre nettsider, kan du
          endre disse innstillingene ved å klikke på knappen nedenfor, eller via «Administrer cookies»
          nederst på sidene.
        </p>
        <p className="text-gray-700 text-sm mb-4">
          Du kan også blokkere og tillate cookies gjennom innstillingene i nettleseren din.
        </p>
        <button
          onClick={resetConsent}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all shadow-md"
        >
          <Settings className="w-4 h-4" />
          Endre innstillinger
        </button>
      </section>

      {/* Legal basis */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Juridisk grunnlag</h2>
        <p className="text-gray-700 text-sm leading-relaxed mb-2">
          Bruk av informasjonskapsler reguleres i{' '}
          <a
            href="https://lovdata.no/lov/2003-07-04-83/§2-7b"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-800 underline"
          >
            ekomloven § 2-7 b
          </a>{' '}
          (tidligere § 3-15).
        </p>
        <p className="text-gray-700 text-sm leading-relaxed">
          For mer informasjon om personvern og informasjonskapsler i Norge, se{' '}
          <a
            href="https://www.datatilsynet.no/om-datatilsynet/datatilsynets-cookie-erklaring/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-800 underline"
          >
            Datatilsynets cookie-erklæring
          </a>
          .
        </p>
      </section>

      {/* Contact */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Kontakt</h2>
        <p className="text-gray-700 text-sm">
          Har du spørsmål om vår bruk av informasjonskapsler, ta kontakt med oss på{' '}
          <a
            href="mailto:berbeha@vitalii.no"
            className="text-purple-600 hover:text-purple-800 underline"
          >
            berbeha@vitalii.no
          </a>
          .
        </p>
      </section>

      {/* Last updated */}
      <div className="pt-4 border-t border-gray-200">
        <p className="text-gray-400 text-xs">Sist endret: 28.02.2026</p>
      </div>
    </div>
  )
}
