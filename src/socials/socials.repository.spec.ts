import { Test } from '@nestjs/testing';
import { SocialsRepository } from './socials.repository';
import { DRIZZLE } from '../database/constants';

const mockPost = {
  id: 1,
  postDate: '2024-03-10',
  platform: 'instagram',
  score: 15,
  screeningId: 100,
  movieId: 50,
  contentType: 'reel',
  published: false,
  reason: 'HIGH_SCORE',
};

const mockPostPublished = {
  id: 2,
  postDate: '2024-03-10',
  platform: 'instagram',
  score: 10,
  screeningId: 101,
  movieId: 51,
  contentType: 'story',
  published: true,
  reason: 'PUBLISHED',
};

const mockScreening = {
  id: 100,
  date: new Date('2024-03-10T18:00:00'),
  movie: {
    id: 50,
    title: 'Test Movie',
    movies_genres: [{ genreId: 1 }],
  },
  cinema: {
    id: 10,
    name: 'Cinema City',
    city: { id: 1, name: 'Warszawa' },
  },
};

const mockScreeningB = {
  id: 101,
  date: new Date('2024-03-10T20:00:00'),
  movie: {
    id: 51,
    title: 'Another Movie',
    movies_genres: [],
  },
  cinema: {
    id: 11,
    name: 'Kino Muranów',
    city: { id: 2, name: 'Kraków' },
  },
};

const mockDb = {
  query: {
    socials_posts: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    screenings: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  },
  insert: jest.fn(),
  update: jest.fn(),
};

const mockValues = jest.fn();
const mockOnDuplicateKeyUpdate = jest.fn();
const mockSet = jest.fn();
const mockWhere = jest.fn();

describe('SocialsRepository', () => {
  let repository: SocialsRepository;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockDb.insert.mockReturnValue({ values: mockValues });
    mockValues.mockReturnValue({
      onConflictDoUpdate: mockOnDuplicateKeyUpdate,
    });
    mockOnDuplicateKeyUpdate.mockResolvedValue(undefined);

    mockDb.update.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue(undefined);

    const module = await Test.createTestingModule({
      providers: [SocialsRepository, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    repository = module.get(SocialsRepository);
  });

  // === READ ===

  describe('findPostsByDateAndPlatform', () => {
    it('should return posts matching date range and platform', async () => {
      mockDb.query.socials_posts.findMany.mockResolvedValue([
        mockPost,
        mockPostPublished,
      ]);

      const result = await repository.findPostsByDateAndPlatform(
        '2024-03-10',
        '2024-03-11',
        'instagram',
      );

      expect(result).toEqual([mockPost, mockPostPublished]);
      expect(mockDb.query.socials_posts.findMany).toHaveBeenCalledWith({
        where: expect.anything(),
      });
    });

    it('should return empty array when no posts match', async () => {
      mockDb.query.socials_posts.findMany.mockResolvedValue([]);

      const result = await repository.findPostsByDateAndPlatform(
        '2024-01-01',
        '2024-01-02',
        'twitter',
      );

      expect(result).toEqual([]);
    });
  });

  describe('findScreeningsInRange', () => {
    it('should return screenings with movie and cinema relations', async () => {
      mockDb.query.screenings.findMany.mockResolvedValue([
        mockScreening,
        mockScreeningB,
      ]);

      const result = await repository.findScreeningsInRange(
        '2024-03-10',
        '2024-03-11',
      );

      expect(result).toEqual([mockScreening, mockScreeningB]);
      expect(mockDb.query.screenings.findMany).toHaveBeenCalledWith({
        where: expect.anything(),
        orderBy: expect.anything(),
        with: {
          movie: {
            with: {
              movies_genres: true,
            },
          },
          cinema: {
            with: {
              city: true,
            },
          },
        },
      });
    });

    it('should return empty array when no screenings in range', async () => {
      mockDb.query.screenings.findMany.mockResolvedValue([]);

      const result = await repository.findScreeningsInRange(
        '2025-01-01',
        '2025-01-02',
      );

      expect(result).toEqual([]);
    });
  });

  describe('findScreeningsByIds', () => {
    it('should return screenings matching given ids with relations', async () => {
      mockDb.query.screenings.findMany.mockResolvedValue([
        mockScreening,
        mockScreeningB,
      ]);

      const result = await repository.findScreeningsByIds([100, 101]);

      expect(result).toEqual([mockScreening, mockScreeningB]);
      expect(mockDb.query.screenings.findMany).toHaveBeenCalledWith({
        where: expect.anything(),
        with: {
          movie: {
            with: {
              movies_genres: true,
            },
          },
          cinema: {
            with: {
              city: true,
            },
          },
        },
      });
    });

    it('should return empty array for empty ids', async () => {
      mockDb.query.screenings.findMany.mockResolvedValue([]);

      const result = await repository.findScreeningsByIds([]);

      expect(result).toEqual([]);
    });
  });

  describe('findScreeningById', () => {
    it('should return a single screening by id', async () => {
      mockDb.query.screenings.findFirst.mockResolvedValue(mockScreening);

      const result = await repository.findScreeningById(100);

      expect(result).toEqual(mockScreening);
      expect(mockDb.query.screenings.findFirst).toHaveBeenCalledWith({
        where: expect.anything(),
      });
    });

    it('should return undefined when screening not found', async () => {
      mockDb.query.screenings.findFirst.mockResolvedValue(undefined);

      const result = await repository.findScreeningById(999);

      expect(result).toBeUndefined();
    });
  });

  describe('findPostByPlatformAndScreening', () => {
    it('should return post matching platform and screening id', async () => {
      mockDb.query.socials_posts.findFirst.mockResolvedValue(mockPost);

      const result = await repository.findPostByPlatformAndScreening(
        'instagram',
        100,
      );

      expect(result).toEqual(mockPost);
      expect(mockDb.query.socials_posts.findFirst).toHaveBeenCalledWith({
        where: expect.anything(),
      });
    });

    it('should return undefined when no post matches', async () => {
      mockDb.query.socials_posts.findFirst.mockResolvedValue(undefined);

      const result = await repository.findPostByPlatformAndScreening(
        'twitter',
        999,
      );

      expect(result).toBeUndefined();
    });
  });

  // === WRITE ===

  describe('upsertPost', () => {
    const postValues = {
      postDate: '2024-03-10',
      platform: 'instagram',
      score: 15,
      screeningId: 100,
      movieId: 50,
      contentType: 'reel',
      published: false,
      reason: 'HIGH_SCORE',
    };

    it('should insert a post with onConflictDoUpdate', async () => {
      await repository.upsertPost(postValues);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith(postValues);
      expect(mockOnDuplicateKeyUpdate).toHaveBeenCalledWith({
        target: expect.anything(),
        set: {
          published: postValues.published,
          reason: postValues.reason,
          postDate: postValues.postDate,
          score: postValues.score,
          screeningId: postValues.screeningId,
          platform: postValues.platform,
          movieId: postValues.movieId,
          contentType: postValues.contentType,
        },
      });
    });

    it('should resolve without returning a value', async () => {
      const result = await repository.upsertPost(postValues);

      expect(result).toBeUndefined();
    });
  });

  describe('markPostPublished', () => {
    it('should update post to published with reason and date', async () => {
      await repository.markPostPublished(1, '2024-03-10');

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith({
        published: true,
        reason: 'PUBLISHED',
        postDate: '2024-03-10',
      });
      expect(mockWhere).toHaveBeenCalled();
    });

    it('should resolve without returning a value', async () => {
      const result = await repository.markPostPublished(1, '2024-03-10');

      expect(result).toBeUndefined();
    });
  });
});
