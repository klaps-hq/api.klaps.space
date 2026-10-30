import { CinemaLinkCheckService } from './cinema-link-check.service';
import type { CinemasRepository } from './cinemas.repository';
import { checkLink } from './link-check';

jest.mock('./link-check', () => ({ checkLink: jest.fn() }));

const mockedCheckLink = checkLink as jest.MockedFunction<typeof checkLink>;

describe('CinemaLinkCheckService', () => {
  let repo: jest.Mocked<
    Pick<CinemasRepository, 'findCinemaLinks' | 'clearCinemaLink'>
  >;
  let service: CinemaLinkCheckService;

  beforeEach(() => {
    jest.useFakeTimers();
    repo = {
      findCinemaLinks: jest.fn().mockResolvedValue([
        {
          id: 1,
          slug: 'muranow',
          website: 'https://kinomuranow.pl',
          repertoireUrl: 'https://kinomuranow.pl/repertuar',
          bookingUrl: null,
          operatorUrl: null,
        },
      ]),
      clearCinemaLink: jest.fn().mockResolvedValue(undefined),
    };
    service = new CinemaLinkCheckService(repo as unknown as CinemasRepository);
  });

  afterEach(() => {
    jest.useRealTimers();
    mockedCheckLink.mockReset();
  });

  const runToEnd = async () => {
    const done = service.run();
    await jest.runAllTimersAsync();
    await done;
  };

  it('clears a link that is dead on both checks', async () => {
    mockedCheckLink.mockImplementation((url) =>
      Promise.resolve(url.endsWith('/repertuar') ? 'dead' : 'alive'),
    );

    await runToEnd();

    expect(repo.clearCinemaLink).toHaveBeenCalledTimes(1);
    expect(repo.clearCinemaLink).toHaveBeenCalledWith(
      1,
      'repertoireUrl',
      'https://kinomuranow.pl/repertuar',
    );
  });

  it('keeps a link that recovers on the recheck', async () => {
    mockedCheckLink
      .mockResolvedValueOnce('alive')
      .mockResolvedValueOnce('dead')
      .mockResolvedValue('alive');

    await runToEnd();

    expect(repo.clearCinemaLink).not.toHaveBeenCalled();
  });

  it('does not fail the job when the database is unavailable', async () => {
    repo.findCinemaLinks.mockRejectedValue(new Error('db down'));

    await expect(runToEnd()).resolves.toBeUndefined();
    expect(repo.clearCinemaLink).not.toHaveBeenCalled();
  });
});
