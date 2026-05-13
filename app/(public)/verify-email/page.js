import VerifyEmailClient from './VerifyEmailClient';

export const metadata = {
  title: 'Potvrda emaila — Pronađi Bend',
  description: 'Potvrdite vašu email adresu.',
  robots: { index: false, follow: false },
};

export default function VerifyEmailPage() {
  return <VerifyEmailClient />;
}
