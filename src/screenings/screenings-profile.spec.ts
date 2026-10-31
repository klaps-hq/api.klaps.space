import { buildProgrammeProfile, type ProfileInput } from './screenings-profile';

const at = (iso: string): Date => new Date(`${iso}Z`);

const baseInput = (): ProfileInput => ({
  rows: [
    // Monday evening, Tuesday morning, Saturday afternoon (wall clock).
    {
      date: at('2026-03-02T19:00:00'),
      movieId: 1,
      cinemaId: 10,
      isDubbing: false,
    },
    {
      date: at('2026-04-07T10:30:00'),
      movieId: 2,
      cinemaId: 10,
      isDubbing: true,
    },
    {
      date: at('2026-04-11T15:00:00'),
      movieId: 1,
      cinemaId: 20,
      isDubbing: false,
    },
  ],
  movies: [
    { id: 1, slug: 'rejs-1970', title: 'Rejs', productionYear: 1970 },
    { id: 2, slug: 'shrek-2001', title: 'Shrek', productionYear: 2001 },
  ],
  genres: [
    { movieId: 1, slug: 'komedia', name: 'Komedia' },
    { movieId: 2, slug: 'komedia', name: 'Komedia' },
    { movieId: 2, slug: 'animacja', name: 'Animacja' },
  ],
  directors: [{ movieId: 1, slug: 'marek-piwowski', name: 'Marek Piwowski' }],
  cinemas: [
    {
      sourceId: 10,
      slug: 'kino-a',
      name: 'Kino A',
      citySlug: 'krakow',
      cityName: 'Kraków',
    },
    {
      sourceId: 20,
      slug: 'kino-b',
      name: 'Kino B',
      citySlug: 'lodz',
      cityName: 'Łódź',
    },
  ],
});

describe('buildProgrammeProfile', () => {
  it('returns an empty profile without rows', () => {
    const profile = buildProgrammeProfile({
      rows: [],
      movies: [],
      genres: [],
      directors: [],
      cinemas: [],
    });
    expect(profile.screenings).toBe(0);
    expect(profile.since).toBeNull();
    expect(profile.busiestMonth).toBeNull();
    expect(profile.byMonth).toEqual([]);
  });

  it('aggregates counts, dates and calendar facts', () => {
    const profile = buildProgrammeProfile(baseInput());

    expect(profile).toMatchObject({
      since: '2026-03-02',
      until: '2026-04-11',
      screenings: 3,
      movies: 2,
      cinemas: 2,
      cities: 2,
      monthsActive: 2,
      busiestMonth: { month: '2026-04', count: 2 },
      weekdays: [1, 1, 0, 0, 0, 1, 0],
      timeOfDay: { morning: 1, afternoon: 1, evening: 1 },
      dubbed: 1,
      decades: [
        { decade: 1970, count: 2 },
        { decade: 2000, count: 1 },
      ],
      medianProductionYear: 1970,
      oldestMovie: { slug: 'rejs-1970', title: 'Rejs', productionYear: 1970 },
    });
  });

  it('ranks films, genres, directors, cinemas and cities by screenings', () => {
    const profile = buildProgrammeProfile(baseInput());

    expect(profile.topMovies[0]).toEqual({
      slug: 'rejs-1970',
      title: 'Rejs',
      productionYear: 1970,
      count: 2,
    });
    expect(profile.topGenres).toEqual([
      { slug: 'komedia', name: 'Komedia', count: 3 },
      { slug: 'animacja', name: 'Animacja', count: 1 },
    ]);
    expect(profile.topDirectors).toEqual([
      { slug: 'marek-piwowski', name: 'Marek Piwowski', count: 2 },
    ]);
    expect(profile.topCinemas[0]).toMatchObject({ slug: 'kino-a', count: 2 });
    expect(profile.topCities.map((c) => c.slug)).toEqual(['krakow', 'lodz']);
  });

  it('counts a screening shared by duplicate film rows once', () => {
    const input = baseInput();
    input.movies.push({
      id: 3,
      slug: 'rejs-1970-2',
      title: 'Rejs ',
      productionYear: 1970,
    });
    input.rows.push({ ...input.rows[0], movieId: 3 });

    const profile = buildProgrammeProfile(input);

    expect(profile.screenings).toBe(3);
    expect(profile.movies).toBe(2);
    expect(profile.topMovies[0].slug).toBe('rejs-1970');
  });

  it('breaks screenings down by month, oldest first', () => {
    const profile = buildProgrammeProfile(baseInput());

    expect(profile.byMonth).toEqual([
      { month: '2026-03', screenings: 1 },
      { month: '2026-04', screenings: 2 },
    ]);
  });

  it('lists months without screenings as zero, across a year end', () => {
    const input = baseInput();
    input.rows = [
      { ...input.rows[0], date: at('2025-11-30T20:00:00') },
      { ...input.rows[1], date: at('2026-02-01T00:30:00') },
    ];

    const profile = buildProgrammeProfile(input);

    expect(profile.byMonth).toEqual([
      { month: '2025-11', screenings: 1 },
      { month: '2025-12', screenings: 0 },
      { month: '2026-01', screenings: 0 },
      { month: '2026-02', screenings: 1 },
    ]);
  });

  it('counts a late-night screening in its Polish calendar month', () => {
    const input = baseInput();
    // 23:30 on 31 March in Warsaw; the stored value already is the wall
    // clock, so it must not be shifted into April.
    input.rows = [{ ...input.rows[0], date: at('2026-03-31T23:30:00') }];

    const profile = buildProgrammeProfile(input);

    expect(profile.byMonth).toEqual([{ month: '2026-03', screenings: 1 }]);
  });

  it('keeps byMonth consistent with the deduplicated screening count', () => {
    const input = baseInput();
    input.movies.push({
      id: 3,
      slug: 'rejs-1970-2',
      title: 'Rejs',
      productionYear: 1970,
    });
    input.rows.push({ ...input.rows[0], movieId: 3 });

    const profile = buildProgrammeProfile(input);

    expect(profile.byMonth.reduce((sum, m) => sum + m.screenings, 0)).toBe(
      profile.screenings,
    );
  });

  it('lists only the top cities unless allCities is set', () => {
    const input = baseInput();
    for (let i = 0; i < 6; i += 1) {
      input.cinemas.push({
        sourceId: 100 + i,
        slug: `kino-${i}`,
        name: `Kino ${i}`,
        citySlug: `miasto-${i}`,
        cityName: `Miasto ${i}`,
      });
      input.rows.push({ ...input.rows[0], cinemaId: 100 + i });
    }

    expect(buildProgrammeProfile(input).topCities).toHaveLength(5);
    const all = buildProgrammeProfile(input, { allCities: true }).topCities;
    expect(all).toHaveLength(8);
    expect(all.reduce((sum, c) => sum + c.count, 0)).toBe(9);
  });
});
