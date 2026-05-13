import ForgotPasswordClient from './ForgotPasswordClient';

export const metadata = {
  title: 'Zaboravljena lozinka — Pronađi Bend',
  description: 'Zatražite link za reset lozinke.',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
