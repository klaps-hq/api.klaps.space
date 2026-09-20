/**
 * Backfill of the locative (miejscownik) form in `cities.nameDeclinated`.
 *
 * Filmweb's `/api/v1/cities` returns the nominative instead of the locative
 * for most smaller towns, and the scraper stores that value verbatim. The
 * frontend renders it straight after "w"/"we", so 152 of 316 published city
 * pages carried "Kina studyjne w Jarocin", "w Szydlowiec" or "w Legionowo"
 * in both the title and the H1, and cinema pages inherited the same form.
 *
 * The mapping below is written out by hand rather than derived from rules.
 * Polish place names decline too irregularly for a rule set to be safe here:
 * the same ending takes different forms (Gora -> Gorze but Gostyn ->
 * Gostyniu), adjectival names agree with the noun (Ostrow Mazowiecka ->
 * Ostrowi Mazowieckiej, Nowa Ruda -> Nowej Rudzie) and hyphenated names
 * decline on both sides (Golub-Dobrzyn -> Golubiu-Dobrzyniu). A generator
 * would be wrong quietly, on names nobody checks.
 *
 * Only rows where `name` still equals `nameDeclinated` are touched, so a
 * form that is already correct - or corrected later by hand - is never
 * overwritten, and the script is safe to re-run.
 *
 * Requires the API change that drops `nameDeclinated` from the scraper's
 * upsert conflict set; without it the next scrape undoes everything here.
 *
 * Usage:
 *   bunx ts-node -r dotenv/config src/scripts/backfill-city-declensions.ts [--dry-run]
 */
import 'dotenv/config';
import { Client } from 'pg';

/** Nominative (as stored in `cities.name`) -> locative, used after "w"/"we". */
const LOCATIVE_BY_NAME: Record<string, string> = {
  'Aleksandrów Kujawski': 'Aleksandrowie Kujawskim',
  'Aleksandrów Łódzki': 'Aleksandrowie Łódzkim',
  Andrychów: 'Andrychowie',
  Annopol: 'Annopolu',
  Babimost: 'Babimoście',
  Barcin: 'Barcinie',
  Białogard: 'Białogardzie',
  Biecz: 'Bieczu',
  Bieżuń: 'Bieżuniu',
  Biskupiec: 'Biskupcu',
  Bisztynek: 'Bisztynku',
  Bogatynia: 'Bogatyni',
  Bogoria: 'Bogorii',
  Bojadła: 'Bojadłach',
  Bolków: 'Bolkowie',
  'Borne Sulinowo': 'Bornem Sulinowie',
  Braniewo: 'Braniewie',
  Brodnica: 'Brodnicy',
  Brzeg: 'Brzegu',
  'Brzeg Dolny': 'Brzegu Dolnym',
  Brzesko: 'Brzesku',
  Brzeszcze: 'Brzeszczach',
  Brzeziny: 'Brzezinach',
  Brzozów: 'Brzozowie',
  Buk: 'Buku',
  'Bukowina Tatrzańska': 'Bukowinie Tatrzańskiej',
  'Busko-Zdrój': 'Busku-Zdroju',
  Bytów: 'Bytowie',
  Chałupy: 'Chałupach',
  Chełmek: 'Chełmku',
  Chełmża: 'Chełmży',
  Chłapowo: 'Chłapowie',
  Chodzież: 'Chodzieży',
  Chojna: 'Chojnie',
  Chojnice: 'Chojnicach',
  Chrzanów: 'Chrzanowie',
  Cieplewo: 'Cieplewie',
  Czarnków: 'Czarnkowie',
  Czeladź: 'Czeladzi',
  Człuchów: 'Człuchowie',
  'Dąbrowa Białostocka': 'Dąbrowie Białostockiej',
  'Dąbrowa Tarnowska': 'Dąbrowie Tarnowskiej',
  Dobczyce: 'Dobczycach',
  'Dobre Miasto': 'Dobrym Mieście',
  Drohiczyn: 'Drohiczynie',
  Dynów: 'Dynowie',
  'Dziadowa Kłoda': 'Dziadowej Kłodzie',
  Działdowo: 'Działdowie',
  Dzierżoniów: 'Dzierżoniowie',
  Dziwnów: 'Dziwnowie',
  Garwolin: 'Garwolinie',
  Gąski: 'Gąskach',
  Glinojeck: 'Glinojecku',
  'Głogów Małopolski': 'Głogowie Małopolskim',
  Głuchołazy: 'Głuchołazach',
  Gniew: 'Gniewie',
  Gołdap: 'Gołdapi',
  'Golub-Dobrzyń': 'Golubiu-Dobrzyniu',
  Góra: 'Górze',
  'Góra Kalwaria': 'Górze Kalwarii',
  'Górowo Iławeckie': 'Górowie Iławeckim',
  Górzno: 'Górznie',
  Gostycyn: 'Gostycynie',
  Gostyń: 'Gostyniu',
  Grajewo: 'Grajewie',
  'Grodzisk Wielkopolski': 'Grodzisku Wielkopolskim',
  Grójec: 'Grójcu',
  Gryfice: 'Gryficach',
  'Gryfów Śląski': 'Gryfowie Śląskim',
  Iława: 'Iławie',
  Iłowa: 'Iłowej',
  Jabłoń: 'Jabłoni',
  'Jabłonowo Pomorskie': 'Jabłonowie Pomorskim',
  Jarocin: 'Jarocinie',
  Jarosławiec: 'Jarosławcu',
  Jasień: 'Jasieniu',
  Jasło: 'Jaśle',
  'Jastrzębia Góra': 'Jastrzębiej Górze',
  Jawor: 'Jaworze',
  Jędrzejów: 'Jędrzejowie',
  Jedwabno: 'Jedwabnie',
  Kalety: 'Kaletach',
  'Kazimierza Wielka': 'Kazimierzy Wielkiej',
  Kępno: 'Kępnie',
  Kleczew: 'Kleczewie',
  Kłodawa: 'Kłodawie',
  Kluczbork: 'Kluczborku',
  Kochanowice: 'Kochanowicach',
  Kock: 'Kocku',
  Kolbuszowa: 'Kolbuszowej',
  Kolno: 'Kolnie',
  Koluszki: 'Koluszkach',
  Kościan: 'Kościanie',
  Kościerzyna: 'Kościerzynie',
  'Kowale Oleckie': 'Kowalach Oleckich',
  'Kowalewo Pomorskie': 'Kowalewie Pomorskim',
  Kozienice: 'Kozienicach',
  'Koźmin Wielkopolski': 'Koźminie Wielkopolskim',
  Krajenka: 'Krajence',
  Krapkowice: 'Krapkowicach',
  Krasnobród: 'Krasnobrodzie',
  Krobia: 'Krobi',
  Krośniewice: 'Krośniewicach',
  'Krosno Odrzańskie': 'Krośnie Odrzańskim',
  'Krynica Morska': 'Krynicy Morskiej',
  Łask: 'Łasku',
  Lębork: 'Lęborku',
  Łęczna: 'Łęcznej',
  Łęczyca: 'Łęczycy',
  Legionowo: 'Legionowie',
  Lelów: 'Lelowie',
  Leżajsk: 'Leżajsku',
  Libiąż: 'Libiążu',
  Lidzbark: 'Lidzbarku',
  'Lidzbark Warmiński': 'Lidzbarku Warmińskim',
  Lipsko: 'Lipsku',
  Łobez: 'Łobzie',
  Łobżenica: 'Łobżenicy',
  Łochów: 'Łochowie',
  Łosice: 'Łosicach',
  Łowicz: 'Łowiczu',
  Lubaczów: 'Lubaczowie',
  Lubań: 'Lubaniu',
  Lubartów: 'Lubartowie',
  Lubawa: 'Lubawie',
  Lubiewo: 'Lubiewie',
  Lubliniec: 'Lublińcu',
  Lubniewice: 'Lubniewicach',
  Lubsko: 'Lubsku',
  Łuków: 'Łukowie',
  'Maków Mazowiecki': 'Makowie Mazowieckim',
  Małogoszcz: 'Małogoszczu',
  'Miasteczko Śląskie': 'Miasteczku Śląskim',
  Miechów: 'Miechowie',
  Międzyrzecz: 'Międzyrzeczu',
  Mikołajki: 'Mikołajkach',
  Milicz: 'Miliczu',
  Mława: 'Mławie',
  Morąg: 'Morągu',
  Mrozy: 'Mrozach',
  Mrzeżyno: 'Mrzeżynie',
  Mszczonów: 'Mszczonowie',
  Myślenice: 'Myślenicach',
  Myszków: 'Myszkowie',
  Myszyniec: 'Myszyńcu',
  Namysłów: 'Namysłowie',
  Nasielsk: 'Nasielsku',
  Nidzica: 'Nidzicy',
  Niechorze: 'Niechorzu',
  Niepołomice: 'Niepołomicach',
  Nisko: 'Nisku',
  'Nowa Dęba': 'Nowej Dębie',
  'Nowa Ruda': 'Nowej Rudzie',
  Nowogard: 'Nowogardzie',
  Nowogrodziec: 'Nowogrodźcu',
  'Nowy Dwór Mazowiecki': 'Nowym Dworze Mazowieckim',
  'Nowy Tomyśl': 'Nowym Tomyślu',
  Nysa: 'Nysie',
  Oborniki: 'Obornikach',
  'Oborniki Śląskie': 'Obornikach Śląskich',
  Odolanów: 'Odolanowie',
  Oława: 'Oławie',
  Olecko: 'Olecku',
  Oleśnica: 'Oleśnicy',
  Olkusz: 'Olkuszu',
  'Opole Lubelskie': 'Opolu Lubelskim',
  Orneta: 'Ornecie',
  'Ostrów Mazowiecka': 'Ostrowi Mazowieckiej',
  Ostrowo: 'Ostrowie',
  Ostrzeszów: 'Ostrzeszowie',
  Otwock: 'Otwocku',
  Pasłęk: 'Pasłęku',
  Pelplin: 'Pelplinie',
  Piastów: 'Piastowie',
  'Piekary Śląskie': 'Piekarach Śląskich',
  Pilawa: 'Pilawie',
  Pińczów: 'Pińczowie',
  Pionki: 'Pionkach',
  Poddębice: 'Poddębicach',
  'Podkowa Leśna': 'Podkowie Leśnej',
  Pogorzela: 'Pogorzeli',
  Połczyn: 'Połczynie',
  Prabuty: 'Prabutach',
  Prudnik: 'Prudniku',
  Pruszków: 'Pruszkowie',
  Przasnysz: 'Przasnyszu',
  Przeworsk: 'Przeworsku',
  Przytoczna: 'Przytocznej',
  Pszczyna: 'Pszczynie',
  Pszów: 'Pszowie',
  Pyrzyce: 'Pyrzycach',
  Pyskowice: 'Pyskowicach',
  'Rabka Zdrój': 'Rabce Zdroju',
  Raciąż: 'Raciążu',
  Radłów: 'Radłowie',
  Radomsko: 'Radomsku',
  Rakoniewice: 'Rakoniewicach',
  Rakszawa: 'Rakszawie',
  Rawicz: 'Rawiczu',
  Resko: 'Resku',
  Rewal: 'Rewalu',
  Rogoźno: 'Rogoźnie',
  Ropczyce: 'Ropczycach',
  Różan: 'Różanie',
  'Rudnik nad Sanem': 'Rudniku nad Sanem',
  Rumia: 'Rumi',
  Rydułtowy: 'Rydułtowach',
  Ryki: 'Rykach',
  Sanok: 'Sanoku',
  Sarbinowo: 'Sarbinowie',
  Sędziszów: 'Sędziszowie',
  'Sędziszów Małopolski': 'Sędziszowie Małopolskim',
  Sejny: 'Sejnach',
  'Sępólno Krajeńskie': 'Sępólnie Krajeńskim',
  Sępopol: 'Sępopolu',
  Sianów: 'Sianowie',
  Sieradz: 'Sieradzu',
  Sierpc: 'Sierpcu',
  Siewierz: 'Siewierzu',
  'Skarżysko-Kamienna': 'Skarżysku-Kamiennej',
  Skawina: 'Skawinie',
  Słubice: 'Słubicach',
  Sobótka: 'Sobótce',
  Sokółka: 'Sokółce',
  'Sokołów Podlaski': 'Sokołowie Podlaskim',
  'Solec-Zdrój': 'Solcu-Zdroju',
  'Środa Śląska': 'Środzie Śląskiej',
  'Środa Wlkp.': 'Środzie Wlkp.',
  Starachowice: 'Starachowicach',
  'Stare Miasto': 'Starym Mieście',
  Stargard: 'Stargardzie',
  'Starogard Gdański': 'Starogardzie Gdańskim',
  Staszów: 'Staszowie',
  'Stoczek Łukowski': 'Stoczku Łukowskim',
  Strzelin: 'Strzelinie',
  'Sucha Beskidzka': 'Suchej Beskidzkiej',
  Suchedniów: 'Suchedniowie',
  Sulęcin: 'Sulęcinie',
  Sulejówek: 'Sulejówku',
  Sułkowice: 'Sułkowicach',
  Świdwin: 'Świdwinie',
  Świebodzice: 'Świebodzicach',
  Świebodzin: 'Świebodzinie',
  Świecie: 'Świeciu',
  Syców: 'Sycowie',
  Szamotuły: 'Szamotułach',
  Szczekociny: 'Szczekocinach',
  Szczytno: 'Szczytnie',
  Sztum: 'Sztumie',
  Szubin: 'Szubinie',
  Szydłowiec: 'Szydłowcu',
  'Tarnów Opolski': 'Tarnowie Opolskim',
  Teresin: 'Teresinie',
  Terespol: 'Terespolu',
  'Tomaszów Mazowiecki': 'Tomaszowie Mazowieckim',
  Trzcianka: 'Trzciance',
  Trzebiatów: 'Trzebiatowie',
  Trzebiechów: 'Trzebiechowie',
  Trzebiel: 'Trzebielu',
  Trzebinia: 'Trzebini',
  Trzebnica: 'Trzebnicy',
  Tuchola: 'Tucholi',
  Tuchów: 'Tuchowie',
  Twardogóra: 'Twardogórze',
  Tychowo: 'Tychowie',
  Unisław: 'Unisławiu',
  'Ustronie Morskie': 'Ustroniu Morskim',
  Wąbrzeźno: 'Wąbrzeźnie',
  Wągrowiec: 'Wągrowcu',
  Warka: 'Warce',
  Węgorzewo: 'Węgorzewie',
  Węgrów: 'Węgrowie',
  Wejherowo: 'Wejherowie',
  Więcbork: 'Więcborku',
  Wieliczka: 'Wieliczce',
  Wieliszew: 'Wieliszewie',
  Wieluń: 'Wieluniu',
  Wieruszów: 'Wieruszowie',
  Wisznice: 'Wisznicach',
  Witnica: 'Witnicy',
  Władysławowo: 'Władysławowie',
  Włodawa: 'Włodawie',
  Włoszczowa: 'Włoszczowie',
  Wolbrom: 'Wolbromiu',
  Wołomin: 'Wołominie',
  Wołów: 'Wołowie',
  Wolsztyn: 'Wolsztynie',
  Wronki: 'Wronkach',
  Września: 'Wrześni',
  Wschowa: 'Wschowie',
  // The source stores a malformed name here; the town is Wysokie
  // Mazowieckie. Only the locative is corrected - `name` belongs to the
  // scraper and fixing it here would be undone on the next run.
  'Wysokie Mazowiecki': 'Wysokiem Mazowieckiem',
  Wyszków: 'Wyszkowie',
  Żagań: 'Żaganiu',
  Zagórów: 'Zagórowie',
  Zambrów: 'Zambrowie',
  Żarki: 'Żarkach',
  Zawiercie: 'Zawierciu',
  Zbąszynek: 'Zbąszynku',
  'Zduńska Wola': 'Zduńskiej Woli',
  Zdzieszowice: 'Zdzieszowicach',
  Żelechów: 'Żelechowie',
  Zgierz: 'Zgierzu',
  Zgorzelec: 'Zgorzelcu',
  Złotów: 'Złotowie',
  Żmigród: 'Żmigrodzie',
  Żnin: 'Żninie',
  Żuromin: 'Żurominie',
  Zwierzyniec: 'Zwierzyńcu',
  Zwoleń: 'Zwoleniu',
  Żyrardów: 'Żyrardowie',
};

/**
 * Forms Filmweb did decline, but incorrectly.
 *
 * Keyed by name, with the exact wrong value as the guard: the row is only
 * touched when it still holds that value, so a later correction by hand is
 * never clobbered and re-running changes nothing. Kept separate from the
 * map above, which covers rows still holding the plain nominative.
 */
const CORRECTIONS: Record<string, { from: string; to: string }> = {
  // "Złotoryji" doubles the j; the locative of Złotoryja is Złotoryi.
  Złotoryja: { from: 'Złotoryji', to: 'Złotoryi' },
};

interface CityRow {
  id: number;
  slug: string;
  name: string;
  nameDeclinated: string;
}

const main = async (): Promise<void> => {
  const dryRun = process.argv.includes('--dry-run');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query('BEGIN');

    // Only rows still carrying the nominative; an already-correct form is
    // left alone, which is what makes the script idempotent.
    const { rows } = await client.query<CityRow>(
      `SELECT id, slug, name, "nameDeclinated"
       FROM cities
       WHERE name = "nameDeclinated"
       ORDER BY name`,
    );

    const missing: string[] = [];
    let updated = 0;

    for (const row of rows) {
      const locative = LOCATIVE_BY_NAME[row.name];
      if (!locative) {
        missing.push(row.name);
        continue;
      }

      console.log(`  w ${row.name}  ->  w ${locative}`);
      await client.query(
        'UPDATE cities SET "nameDeclinated" = $1 WHERE id = $2',
        [locative, row.id],
      );
      updated += 1;
    }

    let corrected = 0;
    for (const [name, { from, to }] of Object.entries(CORRECTIONS)) {
      const { rowCount } = await client.query(
        `UPDATE cities SET "nameDeclinated" = $1
         WHERE name = $2 AND "nameDeclinated" = $3`,
        [to, name, from],
      );
      if (rowCount && rowCount > 0) {
        console.log(`  w ${from}  ->  w ${to}  (correction)`);
        corrected += rowCount;
      }
    }

    console.log(
      `\nUndeclined rows: ${rows.length} | filled: ${updated} | corrected: ${corrected} | unmapped: ${missing.length}`,
    );
    if (missing.length > 0) {
      console.log(`Unmapped names: ${missing.join(', ')}`);
    }

    const unused = Object.keys(LOCATIVE_BY_NAME).filter(
      (name) => !rows.some((row) => row.name === name),
    );
    if (unused.length > 0) {
      console.log(
        `Mapping entries not needed (already correct or absent): ${unused.length}`,
      );
    }

    if (dryRun) {
      await client.query('ROLLBACK');
      console.log('\nDRY RUN - rolled back, nothing written.');
    } else {
      await client.query('COMMIT');
      console.log('\nCOMMITTED.');
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
};

main().catch((error: unknown) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
