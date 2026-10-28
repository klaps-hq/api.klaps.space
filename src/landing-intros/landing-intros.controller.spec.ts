import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LandingIntrosController } from './landing-intros.controller';
import { LandingIntrosService } from './landing-intros.service';

const mockIntro = {
  key: 'open-air:lodz',
  content: 'Plenerowe seanse w Łodzi.',
  updatedAt: '2026-10-28T10:00:00.000Z',
};

describe('LandingIntrosController', () => {
  let controller: LandingIntrosController;
  let service: jest.Mocked<LandingIntrosService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [LandingIntrosController],
      providers: [
        {
          provide: LandingIntrosService,
          useValue: {
            getLandingIntros: jest.fn(),
            getLandingIntro: jest.fn(),
            upsertLandingIntro: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-api-key') },
        },
      ],
    }).compile();

    controller = module.get(LandingIntrosController);
    service = module.get(LandingIntrosService);
  });

  it('should return an intro by key', async () => {
    service.getLandingIntro.mockResolvedValue(mockIntro);

    await expect(controller.getLandingIntro('open-air:lodz')).resolves.toBe(
      mockIntro,
    );
  });

  it('should throw NotFoundException for a missing intro', async () => {
    service.getLandingIntro.mockResolvedValue(null);

    await expect(controller.getLandingIntro('classic:2026-11')).rejects.toThrow(
      NotFoundException,
    );
  });

  it.each(['Open-Air', 'open air', 'classic:', ':lodz', 'a/b'])(
    'should reject the malformed key "%s"',
    async (key) => {
      await expect(controller.getLandingIntro(key)).rejects.toThrow(
        BadRequestException,
      );
      expect(() =>
        controller.upsertLandingIntro(key, { content: 'x' }),
      ).toThrow(BadRequestException);
      expect(service.upsertLandingIntro).not.toHaveBeenCalled();
    },
  );

  it('should upsert an intro', async () => {
    service.upsertLandingIntro.mockResolvedValue(mockIntro);

    const result = await controller.upsertLandingIntro('open-air:lodz', {
      content: mockIntro.content,
    });

    expect(service.upsertLandingIntro).toHaveBeenCalledWith(
      'open-air:lodz',
      mockIntro.content,
    );
    expect(result).toBe(mockIntro);
  });
});
