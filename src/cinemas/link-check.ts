/**
 * Liveness check for the outbound links on cinema pages (website,
 * repertoire, booking, operator). Only answers that clearly mean "this page
 * is gone" count as dead: a missing page (404/410) or a host that no longer
 * resolves or accepts connections. Blocks, rate limits and server errors
 * (401/403/429/5xx, timeouts) say nothing about the link itself, so they
 * count as alive and the link stays.
 */
export type LinkStatus = 'alive' | 'dead';

const DEAD_HTTP = new Set([404, 410]);
const DEAD_NETWORK = new Set([
  'ENOTFOUND',
  'EAI_AGAIN',
  'ECONNREFUSED',
  'ERR_INVALID_URL',
]);

const USER_AGENT = 'klaps.space link check (https://klaps.space)';

/** The network error code buried in a fetch failure, if any. */
const errorCode = (error: unknown): string | undefined => {
  const err = error as { code?: string; cause?: { code?: string } };
  return err?.cause?.code ?? err?.code;
};

export const checkLink = async (
  url: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 15_000,
): Promise<LinkStatus> => {
  try {
    const res = await fetchImpl(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(timeoutMs),
    });
    await res.body?.cancel();
    return DEAD_HTTP.has(res.status) ? 'dead' : 'alive';
  } catch (error) {
    if (error instanceof TypeError && /invalid url/i.test(error.message)) {
      return 'dead';
    }
    return DEAD_NETWORK.has(errorCode(error) ?? '') ? 'dead' : 'alive';
  }
};
