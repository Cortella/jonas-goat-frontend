import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeToggle } from './components/ThemeToggle';
import { trackPageview } from './lib/analytics';
import { AdminRoute, AuthProvider, ProtectedRoute } from './lib/auth';

// Componentes sempre montados (fora das rotas) ficam eager.
import { EmailConfirmBanner } from './components/EmailConfirmBanner';
import { SupportBubble } from './components/SupportChat';
import { SubscribeOffer } from './components/SubscribeOffer';
import { SubscriberTour } from './components/SubscriberTour';

// LandingPage fica eager: é o destino principal dos anúncios (o LCP da
// campanha) e não deve piscar um fallback de carregamento na primeira pintura.
import { LandingPage } from './pages/LandingPage';

// Demais páginas carregam sob demanda — cada uma vira um chunk separado. Tira
// o bloco grande de páginas (sobretudo o admin) do bundle inicial, derrubando
// o JS que o visitante baixa antes de ver a landing.
const PricingPage = lazy(() => import('./pages/PricingPage').then((m) => ({ default: m.PricingPage })));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const CreditsPage = lazy(() => import('./pages/CreditsPage').then((m) => ({ default: m.CreditsPage })));
const AdminOrdersPage = lazy(() => import('./pages/AdminOrdersPage').then((m) => ({ default: m.AdminOrdersPage })));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })));
const PredictionsPage = lazy(() => import('./pages/PredictionsPage').then((m) => ({ default: m.PredictionsPage })));
const AlertsPage = lazy(() => import('./pages/AlertsPage').then((m) => ({ default: m.AlertsPage })));
const BankrollPage = lazy(() => import('./pages/BankrollPage').then((m) => ({ default: m.BankrollPage })));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage').then((m) => ({ default: m.ReviewsPage })));
const AchievementsPage = lazy(() => import('./pages/AchievementsPage').then((m) => ({ default: m.AchievementsPage })));
const MethodologyPage = lazy(() => import('./pages/MethodologyPage').then((m) => ({ default: m.MethodologyPage })));
const MatchDetailPage = lazy(() => import('./pages/MatchDetailPage').then((m) => ({ default: m.MatchDetailPage })));
const LiveMatchPage = lazy(() => import('./pages/LiveMatchPage').then((m) => ({ default: m.LiveMatchPage })));
const WorldCupPage = lazy(() => import('./pages/WorldCupPage').then((m) => ({ default: m.WorldCupPage })));
const SelecaoPage = lazy(() => import('./pages/SelecaoPage').then((m) => ({ default: m.SelecaoPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const GoogleOnboardingPage = lazy(() => import('./pages/GoogleOnboardingPage').then((m) => ({ default: m.GoogleOnboardingPage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then((m) => ({ default: m.SignupPage })));
const ThankYouPage = lazy(() => import('./pages/ThankYouPage').then((m) => ({ default: m.ThankYouPage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then((m) => ({ default: m.TermsPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
const AdminUserDetailPage = lazy(() => import('./pages/AdminUserDetailPage').then((m) => ({ default: m.AdminUserDetailPage })));
const AdminSubscriptionsPage = lazy(() => import('./pages/AdminSubscriptionsPage').then((m) => ({ default: m.AdminSubscriptionsPage })));
const AdminCommissionsPage = lazy(() => import('./pages/AdminCommissionsPage').then((m) => ({ default: m.AdminCommissionsPage })));
const AdminNotificationsPage = lazy(() => import('./pages/AdminNotificationsPage').then((m) => ({ default: m.AdminNotificationsPage })));
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })));
const AdminPricingPage = lazy(() => import('./pages/AdminPricingPage').then((m) => ({ default: m.AdminPricingPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const AdminAccessLogsPage = lazy(() => import('./pages/AdminAccessLogsPage').then((m) => ({ default: m.AdminAccessLogsPage })));
const AdminActivityLogPage = lazy(() => import('./pages/AdminActivityLogPage').then((m) => ({ default: m.AdminActivityLogPage })));
const AdminSecurityPage = lazy(() => import('./pages/AdminSecurityPage').then((m) => ({ default: m.AdminSecurityPage })));
const AdminFinancePage = lazy(() => import('./pages/AdminFinancePage').then((m) => ({ default: m.AdminFinancePage })));
const ChangelogPage = lazy(() => import('./pages/ChangelogPage').then((m) => ({ default: m.ChangelogPage })));
const ConfirmEmailPage = lazy(() => import('./pages/ConfirmEmailPage').then((m) => ({ default: m.ConfirmEmailPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const AdminSupportPage = lazy(() => import('./pages/AdminSupportPage').then((m) => ({ default: m.AdminSupportPage })));
const AdminReviewsPage = lazy(() => import('./pages/AdminReviewsPage').then((m) => ({ default: m.AdminReviewsPage })));
const SupportPage = lazy(() => import('./pages/SupportPage').then((m) => ({ default: m.SupportPage })));
const VisionPage = lazy(() => import('./pages/VisionPage').then((m) => ({ default: m.VisionPage })));
const AdminSuggestionsPage = lazy(() => import('./pages/AdminSuggestionsPage').then((m) => ({ default: m.AdminSuggestionsPage })));

// Dispara um pageview a cada troca de rota (a SPA não recarrega a página, então
// o GA4 não contaria as navegações seguintes sozinho).
function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageview(location.pathname + location.search);
  }, [location.pathname, location.search]);
  return null;
}

// Fallback enquanto o chunk da rota carrega. Discreto, no mesmo tom das outras
// telas de carregamento do app.
function RouteFallback() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
      Carregando…
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <RouteTracker />
      <ThemeToggle />
      <EmailConfirmBanner />
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/precos" element={<PricingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro-google" element={<GoogleOnboardingPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/termos" element={<TermsPage />} />
        <Route path="/atualizacoes" element={<ChangelogPage />} />
        <Route path="/confirmar-email" element={<ConfirmEmailPage />} />
        <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
        <Route path="/predictions" element={<PredictionsPage />} />
        <Route path="/predictions/:matchId" element={<MatchDetailPage />} />
        <Route path="/partida-ao-vivo/:matchId" element={<LiveMatchPage />} />
        {/* Comparador e Transparência desativados — rotas bloqueadas. */}
        <Route path="/comparador" element={<Navigate to="/" replace />} />
        <Route path="/transparencia" element={<Navigate to="/" replace />} />
        <Route path="/metodologia" element={<MethodologyPage />} />
        <Route path="/copa-2026" element={<WorldCupPage />} />
        <Route path="/copa-2026/selecao/:slug" element={<SelecaoPage />} />
        <Route path="/founders" element={<VisionPage />} />
        <Route path="/visao" element={<Navigate to="/founders" replace />} />

        {/* Authenticated only */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/alertas"
          element={
            <ProtectedRoute>
              <AlertsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bankroll"
          element={
            <ProtectedRoute>
              <BankrollPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/avaliacoes"
          element={
            <ProtectedRoute>
              <ReviewsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/conquistas"
          element={
            <ProtectedRoute>
              <AchievementsPage />
            </ProtectedRoute>
          }
        />
        {/* Afiliados desativado — rota bloqueada. */}
        <Route path="/afiliados" element={<Navigate to="/" replace />} />
        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/creditos"
          element={
            <ProtectedRoute>
              <CreditsPage />
            </ProtectedRoute>
          }
        />
        {/* Página de conversão: destino pós-pagamento que o Google Ads mede. */}
        <Route
          path="/obrigado"
          element={
            <ProtectedRoute>
              <ThankYouPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/suporte"
          element={
            <ProtectedRoute>
              <SupportPage />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/usuarios"
          element={
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/usuarios/:id"
          element={
            <AdminRoute>
              <AdminUserDetailPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/assinaturas"
          element={
            <AdminRoute>
              <AdminSubscriptionsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/precos"
          element={
            <AdminRoute>
              <AdminPricingPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/pedidos"
          element={
            <AdminRoute>
              <AdminOrdersPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/comissoes"
          element={
            <AdminRoute>
              <AdminCommissionsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/notificacoes"
          element={
            <AdminRoute>
              <AdminNotificationsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/acessos"
          element={
            <AdminRoute>
              <AdminAccessLogsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/atividade"
          element={
            <AdminRoute>
              <AdminActivityLogPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/seguranca"
          element={
            <AdminRoute>
              <AdminSecurityPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/financeiro"
          element={
            <AdminRoute>
              <AdminFinancePage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/suporte"
          element={
            <AdminRoute>
              <AdminSupportPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/avaliacoes"
          element={
            <AdminRoute>
              <AdminReviewsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/sugestoes"
          element={
            <AdminRoute>
              <AdminSuggestionsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/configuracoes"
          element={
            <AdminRoute>
              <AdminSettingsPage />
            </AdminRoute>
          }
        />

        {/* Aliases */}
        <Route path="/world-cup-2026" element={<Navigate to="/copa-2026" replace />} />
        <Route path="/performance" element={<Navigate to="/transparencia" replace />} />
        <Route path="/history" element={<Navigate to="/bankroll" replace />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
      <SupportBubble />
      <SubscribeOffer />
      <SubscriberTour />
    </AuthProvider>
  );
}
