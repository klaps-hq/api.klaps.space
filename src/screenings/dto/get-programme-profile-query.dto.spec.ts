import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GetProgrammeProfileQueryDto } from './get-programme-profile-query.dto';

const errorsFor = async (query: object) =>
  (
    await validate(plainToInstance(GetProgrammeProfileQueryDto, query), {
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  ).map((e) => e.property);

describe('GetProgrammeProfileQueryDto date range and city list', () => {
  it('accepts a date range and allCities', async () => {
    expect(
      await errorsFor({
        directorSlug: 'andrzej-wajda',
        from: '2026-03-01',
        to: '2026-12-31',
        allCities: 'true',
      }),
    ).toEqual([]);
  });

  it('parses allCities as a query flag', () => {
    const dto = plainToInstance(GetProgrammeProfileQueryDto, {
      allCities: 'false',
    });
    expect(dto.allCities).toBe(false);
  });

  it.each(['2026-3-1', '2026-13-01', '01.03.2026', '2026-03-01T00:00:00Z'])(
    'rejects %s as a date',
    async (value) => {
      expect(await errorsFor({ from: value, to: value })).toEqual([
        'from',
        'to',
      ]);
    },
  );
});
