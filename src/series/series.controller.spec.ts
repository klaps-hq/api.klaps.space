import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';

describe('SeriesController', () => {
  let controller: SeriesController;
  let service: jest.Mocked<SeriesService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [SeriesController],
      providers: [
        {
          provide: SeriesService,
          useValue: {
            getSeries: jest.fn().mockResolvedValue([]),
            getSeriesBySlug: jest.fn().mockResolvedValue({ slug: 'dkf' }),
            updateSeries: jest.fn().mockResolvedValue({ slug: 'dkf' }),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-api-key') },
        },
      ],
    }).compile();

    controller = module.get(SeriesController);
    service = module.get(SeriesService);
  });

  it('lists series', async () => {
    await expect(controller.getSeries()).resolves.toEqual([]);
  });

  it('returns one series by slug', async () => {
    await expect(controller.getSeriesBySlug('dkf')).resolves.toEqual({
      slug: 'dkf',
    });
    expect(service.getSeriesBySlug).toHaveBeenCalledWith('dkf');
  });

  it('updates a series', async () => {
    await controller.updateSeries('dkf', { description: 'Opis' });
    expect(service.updateSeries).toHaveBeenCalledWith('dkf', {
      description: 'Opis',
    });
  });
});
