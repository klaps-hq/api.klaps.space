import { checkLink } from './link-check';

const respond = (status: number) =>
  jest.fn().mockResolvedValue({ status, body: null });

const fail = (code: string) =>
  jest
    .fn()
    .mockRejectedValue(
      Object.assign(new TypeError('fetch failed'), { cause: { code } }),
    );

describe('checkLink', () => {
  it.each([200, 301, 401, 403, 429, 500, 503])(
    'treats HTTP %i as alive',
    async (status) => {
      await expect(checkLink('https://kino.pl', respond(status))).resolves.toBe(
        'alive',
      );
    },
  );

  it.each([404, 410])('treats HTTP %i as dead', async (status) => {
    await expect(checkLink('https://kino.pl', respond(status))).resolves.toBe(
      'dead',
    );
  });

  it.each(['ENOTFOUND', 'ECONNREFUSED'])('treats %s as dead', async (code) => {
    await expect(checkLink('https://kino.pl', fail(code))).resolves.toBe(
      'dead',
    );
  });

  it('treats timeouts and unknown failures as alive', async () => {
    const timeout = jest
      .fn()
      .mockRejectedValue(new DOMException('timed out', 'TimeoutError'));
    await expect(checkLink('https://kino.pl', timeout)).resolves.toBe('alive');
    await expect(
      checkLink('https://kino.pl', fail('ECONNRESET')),
    ).resolves.toBe('alive');
  });
});
