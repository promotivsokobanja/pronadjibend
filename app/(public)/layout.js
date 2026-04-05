import ErrorBoundaryClient from '@/components/errors/ErrorBoundaryClient';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ClientSearchProvider } from '@/components/clients/ClientSearchContext';
import { getMaintenanceMode } from '@/lib/siteConfig';
import { getAuthUserFromCookies } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

/**
 * Javni deo sajta — potpuno izolovan od admin segmenta.
 * ErrorBoundaryClient hvata sve client-side greške pre nego dođu do root-a.
 *
 * <main> nema overflow-x: hidden — sa overflow-y: visible to pravi drugi skrol (pored <html>).
 * Horizontalno seče `html { overflow-x: clip }` u globals.css.
 */
export default async function PublicLayout({ children }) {
  const isMaintenance = await getMaintenanceMode();

  if (isMaintenance) {
    const headersList = headers();
    const pathname = headersList.get('x-invoke-path') || '';
    
    // Dozvoli pristup login stranici i under-construction (ako bi bila u ovoj grupi)
    if (!pathname.startsWith('/login')) {
      const user = await getAuthUserFromCookies();
      if (user?.role !== 'ADMIN') {
        redirect('/under-construction');
      }
    }
  }

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
