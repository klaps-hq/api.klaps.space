import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateCinemaDto } from './update-cinema.dto';

const errorsFor = async (body: object) =>
  (
    await validate(plainToInstance(UpdateCinemaDto, body), {
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  ).map((e) => e.property);

describe('UpdateCinemaDto venue details', () => {
  it('accepts every detail field', async () => {
    expect(
      await errorsFor({
        phone: '+48 22 828 93 03',
        repertoireUrl: 'https://kino.pl/repertuar',
        bookingUrl: null,
        facebookUrl: 'https://facebook.com/kino',
        instagramUrl: null,
        operatorName: 'Max-Film',
        operatorUrl: 'https://maxfilm.pl',
        screens: 4,
        rooms: [
          { name: 'Sala A', seats: 158 },
          { name: 'Sala B', seats: null },
        ],
        accessibility: { wheelchair: true, hearingLoop: null, note: 'Winda' },
        logoUrl: null,
      }),
    ).toEqual([]);
  });

  it('allows clearing rooms and accessibility', async () => {
    expect(await errorsFor({ rooms: null, accessibility: null })).toEqual([]);
  });

  it('rejects a room without a name', async () => {
    expect(await errorsFor({ rooms: [{ name: '', seats: 10 }] })).toEqual([
      'rooms',
    ]);
  });

  it('rejects the grouped operator shape from the read model', async () => {
    expect(await errorsFor({ operator: { name: 'X', url: null } })).toEqual([
      'operator',
    ]);
  });

  it('rejects photos, which only scripts set', async () => {
    expect(await errorsFor({ photos: [] })).toEqual(['photos']);
  });
});
