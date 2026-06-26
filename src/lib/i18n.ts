import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Só o português entra no bundle inicial (idioma-base/fallback). Os outros 19
// idiomas são carregados sob demanda (ver loadLanguage) — cada locale vira um
// chunk separado, em vez de ~280KB de JSON embutidos no bundle principal.
import pt from '../locales/pt.json';

// Loaders preguiçosos de cada locale. import.meta.glob devolve um mapa
// caminho→() => import(), que o Vite transforma em chunks dinâmicos.
const localeModules = import.meta.glob('../locales/*.json');
const localeLoaders: Record<string, () => Promise<unknown>> = {};
for (const [filePath, loader] of Object.entries(localeModules)) {
  const code = /\/([a-z]{2})\.json$/.exec(filePath)?.[1];
  if (code && code !== 'pt') localeLoaders[code] = loader;
}

const loadedLocales = new Set<string>(['pt']);

/**
 * Garante que o bundle de tradução do idioma esteja carregado. No-op para o
 * pt (já embutido) e para idiomas sem arquivo. Idempotente.
 */
export async function loadLanguage(lng: string): Promise<void> {
  const code = lng?.split('-')[0];
  if (!code || loadedLocales.has(code) || !localeLoaders[code]) return;
  try {
    const mod = (await localeLoaders[code]()) as { default: Record<string, unknown> };
    i18n.addResourceBundle(code, 'translation', mod.default, true, true);
    loadedLocales.add(code);
  } catch {
    // Falha de rede no chunk → segue no fallback (pt). Não quebra a UI.
  }
}

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

// Mapas para SEO: og:locale (Open Graph) e hreflang (Google) por idioma.
export const OG_LOCALE: Record<string, string> = {
  pt: 'pt_BR', en: 'en_US', zh: 'zh_CN', hi: 'hi_IN', es: 'es_ES', fr: 'fr_FR',
  ar: 'ar_AR', bn: 'bn_BD', ru: 'ru_RU', id: 'id_ID', de: 'de_DE', ja: 'ja_JP',
  ko: 'ko_KR', it: 'it_IT', tr: 'tr_TR', vi: 'vi_VN', pl: 'pl_PL', uk: 'uk_UA',
  nl: 'nl_NL', th: 'th_TH',
};
export const HREFLANG: Record<string, string> = {
  pt: 'pt-BR', en: 'en', zh: 'zh', hi: 'hi', es: 'es', fr: 'fr', ar: 'ar',
  bn: 'bn', ru: 'ru', id: 'id', de: 'de', ja: 'ja', ko: 'ko', it: 'it',
  tr: 'tr', vi: 'vi', pl: 'pl', uk: 'uk', nl: 'nl', th: 'th',
};

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
    // Só o pt embutido; os demais entram via loadLanguage (addResourceBundle).
    resources: {
      pt: { translation: pt },
    },
    partialBundledLanguages: true,
    fallbackLng: 'pt',
    detection: {
      // querystring (?lng=xx) primeiro → permite URLs por idioma (hreflang/SEO).
      order: ['querystring', 'localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupQuerystring: 'lng',
      lookupLocalStorage: 'jg_lang',
    },
    interpolation: { escapeValue: false },
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    react: { useSuspense: false },
  });

// Carrega o bundle do idioma sempre que ele muda (seletor de idioma, detecção
// por IP etc.) e já dispara o do idioma inicial detectado no init.
i18n.on('languageChanged', (lng) => {
  void loadLanguage(lng);
});
void loadLanguage(i18n.language);

export default i18n;
