const DEFAULT_CHUNK_SIZE = 500;

export const sortAndChunk = <T>(
  items: T[],
  sortKey: (item: T) => string | number,
  chunkSize = DEFAULT_CHUNK_SIZE,
): T[][] => {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => {
    const ka = sortKey(a);
    const kb = sortKey(b);
    if (ka < kb) return -1;
    if (ka > kb) return 1;
    return 0;
  });

  const chunks: T[][] = [];
  for (let i = 0; i < sorted.length; i += chunkSize) {
    chunks.push(sorted.slice(i, i + chunkSize));
  }
  return chunks;
};
