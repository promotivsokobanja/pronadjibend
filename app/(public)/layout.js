import ErrorBoundaryClient from '@/components/errors/ErrorBoundaryClient';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ClientSearchProvider } from '@/components/clients/ClientSearchContext';

/**
 * Javni deo sajta — potpuno izolovan od admin segmenta.
 * ErrorBoundaryClient hvata sve client-side greške pre nego dođu do root-a.
 */
export default function PublicLayout({ children }) {
  return (
    <ErrorBoundaryClient segment="public">
      <ClientSearchProvider>
        <Navbar />
        <main id="public-main" className="block w-full min-w-0 max-w-full">
          {children}
        </main>
        <Footer />
      </ClientSearchProvider>
    </ErrorBoundaryClient>
  );
}
