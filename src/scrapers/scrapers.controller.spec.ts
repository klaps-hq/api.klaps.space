import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ScrapersController } from './scrapers.controller';
import { ScrapersService } from './scrapers.service';

describe('ScrapersController', () => {
  let controller: ScrapersController;
  let service: jest.Mocked<ScrapersService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ScrapersController],
      providers: [
        {
          provide: ScrapersService,
          useValue: {
            getScrapers: jest.fn(),
            getRuns: jest.fn(),
            getRun: jest.fn(),
            getLogs: jest.fn(),
            register: jest.fn(),
            setEnabled: jest.fn(),
            heartbeat: jest.fn(),
            startRun: jest.fn(),
            updateRun: jest.fn(),
            appendLogs: jest.fn(),
            requestRun: jest.fn(),
            requestStop: jest.fn(),
          },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    controller = module.get(ScrapersController);
    service = module.get(ScrapersService);
  });

  it('delegates run listing with the query', async () => {
    service.getRuns.mockResolvedValue([]);
    await controller.getRuns({ scraperId: 'filmweb', limit: 10 });
    expect(service.getRuns).toHaveBeenCalledWith({
      scraperId: 'filmweb',
      limit: 10,
    });
  });

  it('passes the log level filter', async () => {
    service.getLogs.mockResolvedValue([]);
    await controller.getLogs('00000000-0000-4000-8000-000000000001', {
      level: 'error',
    });
    expect(service.getLogs).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000001',
      'error',
    );
  });

  it('toggles a scraper', async () => {
    await controller.update('filmweb', { enabled: false });
    expect(service.setEnabled).toHaveBeenCalledWith('filmweb', false);
  });

  it('queues a run', async () => {
    service.requestRun.mockResolvedValue({ queued: true });
    await expect(controller.requestRun('filmweb')).resolves.toEqual({
      queued: true,
    });
  });

  it('rejects malformed scraper ids', () => {
    expect(() => controller.requestRun('Bad Id!')).toThrow(BadRequestException);
    expect(service.requestRun).not.toHaveBeenCalled();
  });
});
