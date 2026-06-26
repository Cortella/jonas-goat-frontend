import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { App } from './App';
import './styles.css';
import i18n from 'i18next';
import './lib/i18n';
import { detectLangFromIP } from './lib/i18n';
import { initAnalytics } from './lib/analytics';
import { captureAttribution } from './lib/attribution';

// Rastreamento (GA4/Google Ads) e atribuição de campanha. Ambos são no-op
// enquanto as variáveis VITE_GA4_ID / VITE_GADS_ID não estiverem no .env.
initAnalytics();
captureAttribution();

// Auto-detect language from IP on first visit (no stored preference)
if (!localStorage.getItem('jg_lang')) {
  detectLangFromIP().then((lang) => {
    if (lang) {
      i18n.changeLanguage(lang);
      localStorage.setItem('jg_lang', lang);
    }
  });
}

// Apply RTL direction for Arabic
i18n.on('languageChanged', (lng) => {
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
});
// Set initial direction
document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
document.documentElement.lang = i18n.language;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const router = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

const tree = (
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        {googleClientId
          ? <GoogleOAuthProvider clientId={googleClientId}>{router}</GoogleOAuthProvider>
          : router}
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>
);

// Quando a página foi pré-renderizada (react-snap gera HTML estático por rota),
// o #root já vem com conteúdo → hidrata em vez de recriar, preservando o HTML
// que os crawlers/anúncios do Google leem. Sem prerender, monta normalmente.
const rootElement = document.getElementById('root')!;
if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, tree);
} else {
  createRoot(rootElement).render(tree);
}
