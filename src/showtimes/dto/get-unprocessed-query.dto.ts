import { IsNotEmpty, Matches } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DATE_FORMAT_MESSAGE = 'must be in YYYY-MM-DD format';

/**
 * Query DTO for GET /showtimes/unprocessed.
 */
export class GetUnprocessedQueryDto {
  @IsNotEmpty()
  @Matches(DATE_REGEX, { message: `from ${DATE_FORMAT_MESSAGE}` })
  from: string;

  @IsNotEmpty()
  @Matches(DATE_REGEX, { message: `to ${DATE_FORMAT_MESSAGE}` })
  to: string;
}
