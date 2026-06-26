import { AppBar } from '../components/AppBar';
import { Seo } from '../components/Seo';
import { ReviewsSection } from '../components/ReviewsSection';

// Avaliações ficam dentro da área logada (não na landing pública).
export function ReviewsPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <AppBar />
      <Seo title="Avaliações" description="Avaliações dos assinantes do Jonas Goat" path="/avaliacoes" noindex />
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px 80px' }}>
        <ReviewsSection />
      </div>
    </div>
  );
}
