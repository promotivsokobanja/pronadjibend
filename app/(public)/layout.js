import ErrorBoundaryClient from '@/components/errors/ErrorBoundaryClient';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ClientSearchProvider } from '@/components/clients/ClientSearchContext';

/**
 * Javni deo sajta — potpuno izolovan od admin segmenta.
 * ErrorBoundaryClient hvata sve client-side greške pre nego dođu do root-a.
 *
 * <main> nema overflow-x: hidden — sa overflow-y: visible to pravi drugi skrol (pored <html>).
 * Horizontalno seče `html { overflow-x: clip }` u globals.css.
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
