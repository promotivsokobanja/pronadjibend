const COVERS = [
  '/images/bands/electric-vibes.png',
  '/images/bands/soul-harmony.png',
  '/images/bands/kafanski-biseri.png',
  '/images/bands/midnight-acoustic.png',
  '/images/bands/urban-funk.png',
  '/images/bands/acoustic-dreams.png',
];

function pickCover(i) {
  return COVERS[i % COVERS.length];
}

const raw = [
  { slug: 'electric-vibes', name: 'Electric Vibes', genre: 'Pop/Rock', location: 'Beograd', priceRange: '500€ – 1200€', bio: 'Energičan pop-rock sastav za festivale, korporativne žurke i privatne proslave. Profesionalna zvuk i svetlo.', rating: 4.9, hasEquipment: true },
  { slug: 'soul-harmony', name: 'Soul Harmony', genre: 'Jazz / Soul', location: 'Novi Sad', priceRange: '400€ – 900€', bio: 'Sofisticirani džez i soul za koktel večeri, venčanja i boutique hotele.', rating: 4.85, hasEquipment: true },
  { slug: 'kafanski-biseri', name: 'Kafanski Biseri', genre: 'Narodna', location: 'Niš', priceRange: '600€ – 1500€', bio: 'Kafanski hitovi i izvorna muzika uz orkestar — od sitnih proslava do velikih sala.', rating: 4.9, hasEquipment: false },
  { slug: 'midnight-acoustic', name: 'Midnight Acoustic', genre: 'Acoustic / Pop', location: 'Kragujevac', priceRange: '300€ – 700€', bio: 'Akustični trio: gitara, vokal i cajon. Idealno za manje prostore i intimne proslave.', rating: 4.95, hasEquipment: false },
  { slug: 'urban-funk', name: 'Urban Funk', genre: 'Funk / Rock', location: 'Beograd', priceRange: '700€ – 2000€', bio: 'Moćan ritam, duvacki deo i scenska energija. Za klubove i velike događaje.', rating: 4.75, hasEquipment: true },
  { slug: 'acoustic-dreams', name: 'Acoustic Dreams', genre: 'Evergreen', location: 'Subotica', priceRange: '450€ – 950€', bio: 'Domaci i strani evergreen u akustičnom aranžmanu. Diskretno i elegantno.', rating: 4.88, hasEquipment: false },
  { slug: 'balkan-brass', name: 'Balkan Brass Express', genre: 'Balkan / Truba', location: 'Valjevo', priceRange: '550€ – 1300€', bio: 'Trubači i ritam sekcija za veselja, svadbe i gradske manifestacije.', rating: 4.9, hasEquipment: true },
  { slug: 'vece-violina', name: 'Veče uz Violinu', genre: 'Klasična / Crossover', location: 'Čačak', priceRange: '350€ – 650€', bio: 'Violina i klavir za svečane večere, hotele i galerije.', rating: 4.8, hasEquipment: false },
  { slug: 'ritam-grupa', name: 'Ritam Grupa 45', genre: 'Zabavna', location: 'Zrenjanin', priceRange: '400€ – 900€', bio: 'Zabavna muzika za sve generacije — od rođendana do jubileja.', rating: 4.7, hasEquipment: false },
  { slug: 'nova-scena', name: 'Nova Scena BG', genre: 'Indie / Alternativna', location: 'Beograd', priceRange: '500€ – 1100€', bio: 'Indie i alternativni setovi za klubove, otvorene bine i kulturne programe.', rating: 4.82, hasEquipment: true },
  { slug: 'etno-fusion', name: 'Etno Fusion', genre: 'Etno / World', location: 'Kragujevac', priceRange: '450€ – 950€', bio: 'Spoj tradicionalnih instrumenata i savremenog ritma. Unikatna atmosfera.', rating: 4.9, hasEquipment: true },
  { slug: 'cover-band', name: 'Cover Band Deluxe', genre: 'Pop / Rock', location: 'Novi Sad', priceRange: '600€ – 1400€', bio: 'Isključivo veliki hitovi — od 80-ih do današnjih lista. Garantovan plesni podijum.', rating: 4.9, hasEquipment: true },
];

export function getDemoBands() {
  return raw.map((b, i) => ({
    id: `demo-${b.slug}`,
    name: b.name,
    genre: b.genre,
    location: b.location,
    priceRange: b.priceRange,
    bio: b.bio,
    rating: b.rating,
    img: pickCover(i),
    videoUrl: null,
    audioUrl: null,
    hasEquipment: b.hasEquipment,
    rider: null,
    qrToken: null,
    bandId: null,
    demo: true,
  }));
}

export function getDemoBandById(id) {
  if (!id || !id.startsWith('demo-')) return null;
  const slug = id.replace(/^demo-/, '');
  const found = raw.find((b) => b.slug === slug);
  if (!found) return null;
  const i = raw.indexOf(found);
  return {
    id,
    name: found.name,
    genre: found.genre,
    location: found.location,
    priceRange: found.priceRange,
    bio: found.bio,
    rating: found.rating,
    img: pickCover(i),
    videoUrl: null,
    audioUrl: null,
    hasEquipment: found.hasEquipment,
    rider: null,
    qrToken: null,
    reviews: [],
    busyDates: [],
    demo: true,
  };
}

export function isDemoBandId(id) {
  return typeof id === 'string' && id.startsWith('demo-');
}
