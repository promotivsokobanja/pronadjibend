import ResetPasswordClient from './ResetPasswordClient';

export const metadata = {
  title: 'Nova lozinka — Pronađi Bend',
  description: 'Postavite novu lozinku za vaš nalog.',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
