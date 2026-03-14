export type PaginationParams = {
  page?: number;
  limit?: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export function parsePagination(
  params: PaginationParams,
  defaults: { limit: number; maxLimit?: number },
): { page: number; limit: number; offset: number } {
  const page = Math.max(params.page ?? 1, 1);
  const rawLimit = params.limit ?? defaults.limit;
  const limit = defaults.maxLimit
    ? Math.min(rawLimit, defaults.maxLimit)
    : rawLimit;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
