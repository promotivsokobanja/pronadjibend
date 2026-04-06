import MusicianProfileEditorClient from '../MusicianProfileEditorClient';

export const metadata = {
  title: 'Podešavanja muzičarskog profila — Pronađi Bend',
  description: 'Uredite javni profil muzičara, dostupnost, biografiju i medijske materijale.',
  alternates: { canonical: '/muzicari/profil/podesavanja' },
};

export default function MusicianProfileSettingsPage() {
  return <MusicianProfileEditorClient mode="settings" />;
}
