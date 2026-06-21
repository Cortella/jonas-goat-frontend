import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import pt from '../locales/pt.json';
import en from '../locales/en.json';
import zh from '../locales/zh.json';
import hi from '../locales/hi.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import ar from '../locales/ar.json';
import bn from '../locales/bn.json';
import ru from '../locales/ru.json';
import id from '../locales/id.json';
import de from '../locales/de.json';
import ja from '../locales/ja.json';
import ko from '../locales/ko.json';
import it from '../locales/it.json';
import tr from '../locales/tr.json';
import vi from '../locales/vi.json';
import pl from '../locales/pl.json';
import uk from '../locales/uk.json';
import nl from '../locales/nl.json';
import th from '../locales/th.json';

// Country → language mapping for IP-based detection
export const COUNTRY_LANG: Record<string, string> = {
  // Portuguese
  BR: 'pt', PT: 'pt', AO: 'pt', MZ: 'pt', CV: 'pt',
  // English
  US: 'en', GB: 'en', AU: 'en', CA: 'en', NZ: 'en', IE: 'en', ZA: 'en', NG: 'en', GH: 'en', KE: 'en', PK: 'en', PH: 'en',
  // Chinese (Mandarin)
  CN: 'zh', TW: 'zh', HK: 'zh', SG: 'zh', MO: 'zh',
  // Hindi
  IN: 'hi',
  // Spanish
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', EC: 'es', BO: 'es', PY: 'es', UY: 'es', CR: 'es', PA: 'es', DO: 'es', CU: 'es', GT: 'es', HN: 'es', SV: 'es', NI: 'es',
  // French
  FR: 'fr', BE: 'fr', CH: 'fr', MA: 'fr', DZ: 'fr', TN: 'fr', CI: 'fr', SN: 'fr', CM: 'fr',
  // Arabic
  SA: 'ar', AE: 'ar', EG: 'ar', IQ: 'ar', JO: 'ar', KW: 'ar', LB: 'ar', LY: 'ar', QA: 'ar', SY: 'ar', YE: 'ar', OM: 'ar', BH: 'ar', SD: 'ar',
  // Bengali
  BD: 'bn',
  // Russian
  RU: 'ru', BY: 'ru', KZ: 'ru',
  // Indonesian
  ID: 'id', MY: 'id',
  // German
  DE: 'de', AT: 'de',
  // Japanese
  JP: 'ja',
  // Korean
  KR: 'ko',
  // Italian
  IT: 'it',
  // Turkish
  TR: 'tr', AZ: 'tr',
  // Vietnamese
  VN: 'vi',
  // Polish
  PL: 'pl',
  // Ukrainian
  UA: 'uk',
  // Dutch
  NL: 'nl',
  // Thai
  TH: 'th',
};

export const SUPPORTED_LANGUAGES = [
  { code: 'pt', label: 'Português', flag: '🇧🇷', nativeName: 'Português' },
  { code: 'en', label: 'English',   flag: '🇬🇧', nativeName: 'English' },
  { code: 'zh', label: '中文',       flag: '🇨🇳', nativeName: '中文' },
  { code: 'hi', label: 'हिन्दी',     flag: '🇮🇳', nativeName: 'हिन्दी' },
  { code: 'es', label: 'Español',   flag: '🇪🇸', nativeName: 'Español' },
  { code: 'fr', label: 'Français',  flag: '🇫🇷', nativeName: 'Français' },
  { code: 'ar', label: 'العربية',   flag: '🇸🇦', nativeName: 'العربية' },
  { code: 'bn', label: 'বাংলা',     flag: '🇧🇩', nativeName: 'বাংলা' },
  { code: 'ru', label: 'Русский',   flag: '🇷🇺', nativeName: 'Русский' },
  { code: 'id', label: 'Indonesia', flag: '🇮🇩', nativeName: 'Bahasa Indonesia' },
  { code: 'de', label: 'Deutsch',   flag: '🇩🇪', nativeName: 'Deutsch' },
  { code: 'ja', label: '日本語',     flag: '🇯🇵', nativeName: '日本語' },
  { code: 'ko', label: '한국어',     flag: '🇰🇷', nativeName: '한국어' },
  { code: 'it', label: 'Italiano',  flag: '🇮🇹', nativeName: 'Italiano' },
  { code: 'tr', label: 'Türkçe',   flag: '🇹🇷', nativeName: 'Türkçe' },
  { code: 'vi', label: 'Tiếng Việt',flag: '🇻🇳', nativeName: 'Tiếng Việt' },
  { code: 'pl', label: 'Polski',    flag: '🇵🇱', nativeName: 'Polski' },
  { code: 'uk', label: 'Українська',flag: '🇺🇦', nativeName: 'Українська' },
  { code: 'nl', label: 'Nederlands',flag: '🇳🇱', nativeName: 'Nederlands' },
  { code: 'th', label: 'ภาษาไทย',  flag: '🇹🇭', nativeName: 'ภาษาไทย' },
];

/** Detect language from IP (ipapi.co - free, no key required for basic usage) */
export async function detectLangFromIP(): Promise<string | null> {
  try {
    const r = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const data = await r.json() as { country_code?: string };
    const country = data.country_code;
    if (country && COUNTRY_LANG[country]) return COUNTRY_LANG[country];
  } catch {
    // Silently fail — fallback to browser/localStorage
  }
  return null;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
      zh: { translation: zh },
      hi: { translation: hi },
      es: { translation: es },
      fr: { translation: fr },
      ar: { translation: ar },
      bn: { translation: bn },
      ru: { translation: ru },
      id: { translation: id },
      de: { translation: de },
      ja: { translation: ja },
      ko: { translation: ko },
      it: { translation: it },
      tr: { translation: tr },
      vi: { translation: vi },
      pl: { translation: pl },
      uk: { translation: uk },
      nl: { translation: nl },
      th: { translation: th },
    },
    fallbackLng: 'pt',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'jg_lang',
    },
    interpolation: { escapeValue: false },
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    react: { useSuspense: false },
  });

export default i18n;
