import ProfilClient from './ProfilClient';

export const metadata = {
  title: 'Moj profil — Pronađi Bend',
  description: 'Upravljajte podešavanjima vašeg naloga.',
  robots: { index: false, follow: false },
};

export default function ProfilPage() {
  return <ProfilClient />;
}
