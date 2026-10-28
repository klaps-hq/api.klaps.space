import { isOpenAirCinemaName } from './open-air';

describe('isOpenAirCinemaName', () => {
  it.each([
    'TME Polówka: Park Julianowski',
    'Filmowa Stolica Lata: Ogród Saski',
    'Kino Letnie',
    'Kino Letnie w Orłowie',
    'Dobre kino na sadach by Filmweb and Salto Bar',
    'Kino pod chmurką',
  ])('recognises "%s"', (name) => {
    expect(isOpenAirCinemaName(name)).toBe(true);
  });

  it.each(['Kino Muranów', 'Helios Metropolia', 'Kino Letnisko', 'Lato'])(
    'leaves "%s" alone',
    (name) => {
      expect(isOpenAirCinemaName(name)).toBe(false);
    },
  );
});
