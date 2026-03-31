import '../../styles/admin.css';
import ErrorBoundaryClient from '@/components/errors/ErrorBoundaryClient';
import AdminClientLayout from '@/components/admin/AdminClientLayout';

export const metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

/**
 * Admin segment — potpuno izolovan od javnog dela.
 * Greška ovde nikad ne može srušiti landing page ili pretragu.
 */
export default function AdminLayout({ children }) {
  return (
    <ErrorBoundaryClient segment="admin">
      <AdminClientLayout>{children}</AdminClientLayout>
    </ErrorBoundaryClient>
  );
}
