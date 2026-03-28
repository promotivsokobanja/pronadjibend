import ErrorBoundaryClient from '@/components/errors/ErrorBoundaryClient';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

/**
 * Javni deo sajta — potpuno izolovan od admin segmenta.
 * ErrorBoundaryClient hvata sve client-side greške pre nego dođu do root-a.
 */
export default function PublicLayout({ children }) {
  return (
    <ErrorBoundaryClient segment="public">
      <Navbar />
      {children}
      <Footer />
    </ErrorBoundaryClient>
  );
}
