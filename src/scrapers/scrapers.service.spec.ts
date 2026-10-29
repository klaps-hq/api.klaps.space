import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ScrapersService } from './scrapers.service';
import { ScrapersRepository } from './scrapers.repository';
import type { Scraper } from '../database/schemas/scrapers.schema';
import type { ScraperRunRow } from '../database/schemas/scraper_runs.schema';

const makeScraper = (overrides: Partial<Scraper> = {}): Scraper => ({
  id: 'filmweb',
  name: 'Filmweb',
  kind: 'source',
  description: 'Pipeline',
  enabled: true,
  schedule: '0 */12 * * *',
  nextRunAt: null,
  runRequestedAt: null,
  lastHeartbeatAt: new Date(),
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

const makeRun = (overrides: Partial<ScraperRunRow> = {}): ScraperRunRow => ({
  id: '00000000-0000-4000-8000-000000000001',
  scraperId: 'filmweb',
  status: 'running',
  trigger: 'cron',
  startedAt: new Date(Date.now() - 60_000),
  finishedAt: null,
  durationMs: null,
  stats: { fetched: 0, saved: 0, updated: 0, skipped: 0, failed: 0 },
  stages: [],
  progress: null,
  error: null,
  stopRequested: false,
  ...overrides,
});

describe('ScrapersService', () => {
  let service: ScrapersService;
  let repo: jest.Mocked<ScrapersRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ScrapersService,
        {
          provide: ScrapersRepository,
          useValue: {
            findAllScrapers: jest.fn(),
            findScraperById: jest.fn(),
            findRuns: jest.fn(),
            findRunById: jest.fn(),
            findRunningRun: jest.fn(),
            findLastFinishedRun: jest.fn(),
            findLogs: jest.fn(),
            upsertScraper: jest.fn(),
            updateScraper: jest.fn(),
            insertRun: jest.fn(),
            updateRun: jest.fn(),
            insertLogs: jest.fn(),
            pruneOldRuns: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ScrapersService);
    repo = module.get(ScrapersRepository);
  });

  describe('getScrapers', () => {
    it('derives status from enabled flag, runs and pending request', async () => {
      repo.findAllScrapers.mockResolvedValue([
        makeScraper({ id: 'a', enabled: false }),
        makeScraper({ id: 'b' }),
        makeScraper({ id: 'c', runRequestedAt: new Date() }),
        makeScraper({ id: 'd' }),
        makeScraper({ id: 'e' }),
      ]);
      repo.findRunningRun.mockImplementation((id) =>
        Promise.resolve(id === 'b' ? makeRun({ scraperId: 'b' }) : undefined),
      );
      repo.findLastFinishedRun.mockImplementation((id) =>
        Promise.resolve(
          id === 'd'
            ? makeRun({ scraperId: 'd', status: 'failed' })
            : undefined,
        ),
      );

      const result = await service.getScrapers();

      expect(result.map((s) => s.status)).toEqual([
        'disabled',
        'running',
        'queued',
        'failed',
        'idle',
      ]);
      expect(result[1].currentRun?.status).toBe('running');
    });

    it('closes a running run whose scraper stopped sending heartbeats', async () => {
      repo.findAllScrapers.mockResolvedValue([
        makeScraper({ lastHeartbeatAt: new Date(Date.now() - 60 * 60_000) }),
      ]);
      repo.findRunningRun.mockResolvedValue(makeRun());
      repo.findLastFinishedRun.mockResolvedValue(undefined);

      const [summary] = await service.getScrapers();

      expect(repo.updateRun).toHaveBeenCalledWith(
        makeRun().id,
        expect.objectContaining({ status: 'failed' }),
      );
      expect(summary.currentRun).toBeNull();
    });
  });

  describe('requestRun', () => {
    it('queues a run for an enabled, idle scraper', async () => {
      repo.findScraperById.mockResolvedValue(makeScraper());
      repo.findRunningRun.mockResolvedValue(undefined);

      await expect(service.requestRun('filmweb')).resolves.toEqual({
        queued: true,
      });
      expect(repo.updateScraper).toHaveBeenCalledWith('filmweb', {
        runRequestedAt: expect.any(Date),
      });
    });

    it('rejects a disabled scraper', async () => {
      repo.findScraperById.mockResolvedValue(makeScraper({ enabled: false }));
      await expect(service.requestRun('filmweb')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rejects when a run is already in progress', async () => {
      repo.findScraperById.mockResolvedValue(makeScraper());
      repo.findRunningRun.mockResolvedValue(makeRun());
      await expect(service.requestRun('filmweb')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('throws NotFound for an unknown scraper', async () => {
      repo.findScraperById.mockResolvedValue(undefined);
      await expect(service.requestRun('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('requestStop', () => {
    it('flags the running run', async () => {
      repo.findScraperById.mockResolvedValue(makeScraper());
      repo.findRunningRun.mockResolvedValue(makeRun());
      await service.requestStop('filmweb');
      expect(repo.updateRun).toHaveBeenCalledWith(makeRun().id, {
        stopRequested: true,
      });
    });

    it('rejects when nothing is running', async () => {
      repo.findScraperById.mockResolvedValue(makeScraper());
      repo.findRunningRun.mockResolvedValue(undefined);
      await expect(service.requestStop('filmweb')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('heartbeat', () => {
    it('hands out a pending run request', async () => {
      repo.findScraperById.mockResolvedValue(makeScraper());
      repo.updateScraper.mockResolvedValue(
        makeScraper({ runRequestedAt: new Date() }),
      );
      repo.findRunningRun.mockResolvedValue(undefined);

      await expect(service.heartbeat('filmweb', {})).resolves.toEqual({
        enabled: true,
        runRequested: true,
        stopRequested: false,
      });
    });

    it('passes the stop flag of the running run', async () => {
      repo.findScraperById.mockResolvedValue(makeScraper());
      repo.updateScraper.mockResolvedValue(makeScraper());
      repo.findRunningRun.mockResolvedValue(makeRun({ stopRequested: true }));

      const res = await service.heartbeat('filmweb', {});
      expect(res.stopRequested).toBe(true);
      expect(res.runRequested).toBe(false);
    });
  });

  describe('startRun', () => {
    it('closes an orphaned run, inserts a new one and clears the request', async () => {
      repo.findScraperById.mockResolvedValue(makeScraper());
      repo.findRunningRun.mockResolvedValue(makeRun({ id: 'old' }));
      repo.insertRun.mockResolvedValue(makeRun({ trigger: 'manual' }));

      const run = await service.startRun('filmweb', { trigger: 'manual' });

      expect(repo.pruneOldRuns).toHaveBeenCalled();
      expect(repo.updateRun).toHaveBeenCalledWith(
        'old',
        expect.objectContaining({ status: 'failed' }),
      );
      expect(repo.updateScraper).toHaveBeenCalledWith(
        'filmweb',
        expect.objectContaining({ runRequestedAt: null }),
      );
      expect(run.trigger).toBe('manual');
    });
  });

  describe('updateRun', () => {
    it('sets finishedAt and duration when the run ends', async () => {
      const startedAt = new Date(Date.now() - 5 * 60_000);
      repo.findRunById.mockResolvedValue(makeRun({ startedAt }));
      repo.updateRun.mockImplementation((_id, set) =>
        Promise.resolve(makeRun({ startedAt, ...set })),
      );

      const run = await service.updateRun(makeRun().id, { status: 'success' });

      expect(run.status).toBe('success');
      expect(run.finishedAt).not.toBeNull();
      expect(run.durationMs).toBeGreaterThanOrEqual(5 * 60_000);
    });

    it('keeps the run open on progress updates', async () => {
      repo.findRunById.mockResolvedValue(makeRun());
      repo.updateRun.mockResolvedValue(makeRun());

      await service.updateRun(makeRun().id, {
        progress: { stage: 'Seanse', done: 1, total: 10 },
      });

      expect(repo.updateRun).toHaveBeenCalledWith(makeRun().id, {
        progress: { stage: 'Seanse', done: 1, total: 10 },
      });
    });
  });

  describe('appendLogs', () => {
    it('stores lines for an existing run', async () => {
      repo.findRunById.mockResolvedValue(makeRun());
      await service.appendLogs(makeRun().id, {
        lines: [
          {
            ts: '2026-10-29T10:00:00.000Z',
            level: 'warn',
            stage: 'Miasta',
            message: 'x',
          },
        ],
      });
      expect(repo.insertLogs).toHaveBeenCalledWith([
        expect.objectContaining({
          level: 'warn',
          stage: 'Miasta',
          message: 'x',
        }),
      ]);
    });

    it('throws NotFound for an unknown run', async () => {
      repo.findRunById.mockResolvedValue(undefined);
      await expect(
        service.appendLogs(makeRun().id, { lines: [] }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
