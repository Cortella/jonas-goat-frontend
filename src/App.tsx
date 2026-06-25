import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeToggle } from './components/ThemeToggle';
import { AdminRoute, AuthProvider, ProtectedRoute } from './lib/auth';
import { LandingPage } from './pages/LandingPage';
import { PricingPage } from './pages/PricingPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { CreditsPage } from './pages/CreditsPage';
import { AdminOrdersPage } from './pages/AdminOrdersPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { PredictionsPage } from './pages/PredictionsPage';
import { ComparatorPage } from './pages/ComparatorPage';
import { AlertsPage } from './pages/AlertsPage';
import { BankrollPage } from './pages/BankrollPage';
import { TransparencyPage } from './pages/TransparencyPage';
import { MethodologyPage } from './pages/MethodologyPage';
import { MatchDetailPage } from './pages/MatchDetailPage';
import { LiveMatchPage } from './pages/LiveMatchPage';
import { WorldCupPage } from './pages/WorldCupPage';
import { SelecaoPage } from './pages/SelecaoPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { TermsPage } from './pages/TermsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminUserDetailPage } from './pages/AdminUserDetailPage';
import { AdminSubscriptionsPage } from './pages/AdminSubscriptionsPage';
import { AdminCommissionsPage } from './pages/AdminCommissionsPage';
import { AdminNotificationsPage } from './pages/AdminNotificationsPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { AdminPricingPage } from './pages/AdminPricingPage';
import { AffiliatePage } from './pages/AffiliatePage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminAccessLogsPage } from './pages/AdminAccessLogsPage';
import { AdminActivityLogPage } from './pages/AdminActivityLogPage';
import { AdminSecurityPage } from './pages/AdminSecurityPage';
import { AdminFinancePage } from './pages/AdminFinancePage';
import { ChangelogPage } from './pages/ChangelogPage';
import { ConfirmEmailPage } from './pages/ConfirmEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { EmailConfirmBanner } from './components/EmailConfirmBanner';
import { AdminSupportPage } from './pages/AdminSupportPage';
import { AdminReviewsPage } from './pages/AdminReviewsPage';
import { SupportPage } from './pages/SupportPage';
import { SupportBubble } from './components/SupportChat';

export function App() {
  return (
    <AuthProvider>
      <ThemeToggle />
      <EmailConfirmBanner />
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/precos" element={<PricingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/termos" element={<TermsPage />} />
        <Route path="/atualizacoes" element={<ChangelogPage />} />
        <Route path="/confirmar-email" element={<ConfirmEmailPage />} />
        <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
        <Route path="/predictions" element={<PredictionsPage />} />
        <Route path="/predictions/:matchId" element={<MatchDetailPage />} />
        <Route path="/partida-ao-vivo/:matchId" element={<LiveMatchPage />} />
        <Route path="/comparador" element={<ComparatorPage />} />
        <Route path="/transparencia" element={<TransparencyPage />} />
        <Route path="/metodologia" element={<MethodologyPage />} />
        <Route path="/copa-2026" element={<WorldCupPage />} />
        <Route path="/copa-2026/selecao/:slug" element={<SelecaoPage />} />

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
          path="/afiliados"
          element={
            <ProtectedRoute>
              <AffiliatePage />
            </ProtectedRoute>
          }
        />
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
      <SupportBubble />
    </AuthProvider>
  );
}
