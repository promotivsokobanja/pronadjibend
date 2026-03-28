import LoginClient from './LoginClient';

export const metadata = {
  title: 'Prijava & Registracija — Pronađi Bend',
  description:
    'Prijavite se ili registrujte nalog na platformi Pronađi Bend. Pristupite bazi bendova, rezervišite muzičare za svadbe i proslave ili registrujte svoj bend.',
  alternates: { canonical: '/login' },
  openGraph: {
    title: 'Prijava na Pronađi Bend',
    description: 'Prijavite se i rezervišite bend za vaš event ili registrujte svoj bend na platformi.',
    url: 'https://pronadjibend.rs/login',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function LoginPage() {
  return <LoginClient />;
}
