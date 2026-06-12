/**
 * Canonical list of Polish voivodeships (lowercase, with diacritics) -
 * the exact values stored in `cities.voivodeship` and accepted by
 * the `?voivodeship=` query param.
 */
export const VOIVODESHIPS = [
  'dolnośląskie',
  'kujawsko-pomorskie',
  'lubelskie',
  'lubuskie',
  'łódzkie',
  'małopolskie',
  'mazowieckie',
  'opolskie',
  'podkarpackie',
  'podlaskie',
  'pomorskie',
  'śląskie',
  'świętokrzyskie',
  'warmińsko-mazurskie',
  'wielkopolskie',
  'zachodniopomorskie',
] as const;

export type Voivodeship = (typeof VOIVODESHIPS)[number];

/**
 * Polish telephone numbering zones (strefy numeracyjne) mapped to the
 * voivodeship of the zone's seat. Zones follow the pre-1999 voivodeship
 * borders, so a handful of border towns belong to a different voivodeship
 * than their zone seat (e.g. Janów Lubelski has areacode 15 but lies in
 * lubelskie) - use this map only as a fallback, never as ground truth.
 */
export const AREACODE_TO_VOIVODESHIP: Record<number, Voivodeship> = {
  12: 'małopolskie', // Kraków
  13: 'podkarpackie', // Krosno
  14: 'małopolskie', // Tarnów
  15: 'podkarpackie', // Tarnobrzeg
  16: 'podkarpackie', // Przemyśl
  17: 'podkarpackie', // Rzeszów
  18: 'małopolskie', // Nowy Sącz
  22: 'mazowieckie', // Warszawa
  23: 'mazowieckie', // Ciechanów
  24: 'mazowieckie', // Płock
  25: 'mazowieckie', // Siedlce
  29: 'mazowieckie', // Ostrołęka
  32: 'śląskie', // Katowice
  33: 'śląskie', // Bielsko-Biała
  34: 'śląskie', // Częstochowa
  41: 'świętokrzyskie', // Kielce
  42: 'łódzkie', // Łódź
  43: 'łódzkie', // Sieradz
  44: 'łódzkie', // Piotrków Trybunalski
  46: 'łódzkie', // Skierniewice
  48: 'mazowieckie', // Radom
  52: 'kujawsko-pomorskie', // Bydgoszcz
  54: 'kujawsko-pomorskie', // Włocławek
  55: 'warmińsko-mazurskie', // Elbląg
  56: 'kujawsko-pomorskie', // Toruń
  58: 'pomorskie', // Gdańsk
  59: 'pomorskie', // Słupsk
  61: 'wielkopolskie', // Poznań
  62: 'wielkopolskie', // Kalisz
  63: 'wielkopolskie', // Konin
  65: 'wielkopolskie', // Leszno
  67: 'wielkopolskie', // Piła
  68: 'lubuskie', // Zielona Góra
  71: 'dolnośląskie', // Wrocław
  74: 'dolnośląskie', // Wałbrzych
  75: 'dolnośląskie', // Jelenia Góra
  76: 'dolnośląskie', // Legnica
  77: 'opolskie', // Opole
  81: 'lubelskie', // Lublin
  82: 'lubelskie', // Chełm
  83: 'lubelskie', // Biała Podlaska
  84: 'lubelskie', // Zamość
  85: 'podlaskie', // Białystok
  86: 'podlaskie', // Łomża
  87: 'podlaskie', // Suwałki
  89: 'warmińsko-mazurskie', // Olsztyn
  91: 'zachodniopomorskie', // Szczecin
  94: 'zachodniopomorskie', // Koszalin
  95: 'lubuskie', // Gorzów Wielkopolski
};
