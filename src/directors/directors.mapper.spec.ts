import { mapDirector } from './directors.mapper';

describe('mapDirector', () => {
  const base = {
    id: 12,
    slug: 'pawel-pawlikowski',
    name: 'Paweł Pawlikowski',
    sourceId: 555,
    role: 'director',
    bio: 'Polski reżyser',
    photoUrl: 'https://img/pp.jpg',
  };

  it('maps a director with stats and updatedAt', () => {
    const result = mapDirector(
      base,
      { moviesCount: 4, upcomingScreeningsCount: 7 },
      new Date('2026-06-01T12:00:00.000Z'),
    );

    expect(result).toEqual({
      id: 12,
      slug: 'pawel-pawlikowski',
      name: 'Paweł Pawlikowski',
      sourceId: 555,
      role: 'director',
      bio: 'Polski reżyser',
      photoUrl: 'https://img/pp.jpg',
      moviesCount: 4,
      upcomingScreeningsCount: 7,
      updatedAt: '2026-06-01T12:00:00.000Z',
    });
  });

  it('returns null bio/photoUrl/updatedAt and empty slug fallback', () => {
    const result = mapDirector(
      { ...base, slug: null, bio: null, photoUrl: null },
      { moviesCount: 0, upcomingScreeningsCount: 0 },
      null,
    );

    expect(result.bio).toBeNull();
    expect(result.photoUrl).toBeNull();
    expect(result.updatedAt).toBeNull();
    expect(result.slug).toBe('');
    expect(result.upcomingScreeningsCount).toBe(0);
  });
});
