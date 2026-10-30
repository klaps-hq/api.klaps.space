import { CINEMA_CHAIN_SQL_PATTERN, isChainCinemaName } from './cinema-chains';

describe('isChainCinemaName', () => {
  it.each([
    'Cinema City',
    'Cinema City Arkadia',
    'CinemaCity Kinepolis',
    'Helios',
    'Helios Metropolia',
    'Multikino',
    'Multikino Złote Tarasy',
    'Cinepolis',
    'Cinema 3D',
    'IMAX',
    'Planet Cinema',
    'GO KINO',
    'Go Kino Oława',
  ])('recognises the chain venue "%s"', (name) => {
    expect(isChainCinemaName(name)).toBe(true);
  });

  it.each([
    'Kino Muranów',
    'Kino Planeta',
    'Planetarium Centrum Nauki Kopernik',
    'Kinomax',
    'Max Kino',
    'Centrum 3D',
    'Kino 3D',
    'Cinema Lumiere',
    'Cinema1',
    'Heliosfera',
    'Kino Pod Baranami',
  ])('leaves the independent venue "%s" alone', (name) => {
    expect(isChainCinemaName(name)).toBe(false);
  });
});

describe('CINEMA_CHAIN_SQL_PATTERN', () => {
  it('uses PostgreSQL word boundaries around the alternatives', () => {
    expect(CINEMA_CHAIN_SQL_PATTERN).toMatch(/^\\m\(.+\)\\M$/);
    expect(CINEMA_CHAIN_SQL_PATTERN).toContain('planet\\s?cinema');
    expect(CINEMA_CHAIN_SQL_PATTERN).toContain('go\\s?kino');
  });
});
