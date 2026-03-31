import MusicianProfileEditorClient from './MusicianProfileEditorClient';

export const metadata = {
  title: 'Moj Profil Muzičara — Pronađi Bend',
  description: 'Uredite svoj muzičarski profil, dostupnost i pregledajte pristigle pozive bendova.',
  alternates: { canonical: '/muzicari/profil' },
};

export default function MusicianProfileEditorPage() {
  return <MusicianProfileEditorClient />;
}
