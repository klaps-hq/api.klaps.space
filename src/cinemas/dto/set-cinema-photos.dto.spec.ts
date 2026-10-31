import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SetCinemaPhotosDto } from './set-cinema-photos.dto';

const errorsFor = async (body: object) =>
  (
    await validate(plainToInstance(SetCinemaPhotosDto, body), {
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  ).map((e) => e.property);

const websitePhoto = {
  url: 'https://media.klaps.space/klaps-cms-media/cinemas/kino/photo-1.jpg',
  sourceUrl: 'https://kino.pl/o-kinie',
  author: 'Jan Kowalski',
  source: 'website',
  license: null,
  licenseUrl: null,
};

describe('SetCinemaPhotosDto', () => {
  it('accepts website and Commons photos', async () => {
    expect(
      await errorsFor({
        photos: [
          websitePhoto,
          {
            ...websitePhoto,
            sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kino.jpg',
            source: 'commons',
            license: 'CC BY-SA 4.0',
            licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
          },
        ],
      }),
    ).toEqual([]);
  });

  it('accepts an empty gallery (takedown)', async () => {
    expect(await errorsFor({ photos: [] })).toEqual([]);
  });

  it('rejects a photo without an author', async () => {
    expect(
      await errorsFor({ photos: [{ ...websitePhoto, author: '' }] }),
    ).toEqual(['photos']);
  });

  it('rejects an unknown source', async () => {
    expect(
      await errorsFor({ photos: [{ ...websitePhoto, source: 'google' }] }),
    ).toEqual(['photos']);
  });

  it('rejects more than six photos', async () => {
    expect(
      await errorsFor({
        photos: Array.from({ length: 7 }, () => websitePhoto),
      }),
    ).toEqual(['photos']);
  });
});
