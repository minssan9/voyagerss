import { BadRequestException } from '@nestjs/common';
import { TeamService } from './TeamService';

jest.mock('../../../config/prisma', () => ({
  workschdPrisma: {
    team: { findFirst: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    teamMember: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    teamJoinRequest: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('TeamService', () => {
  const service = new TeamService();
  const prisma = jest.requireMock('../../../config/prisma').workschdPrisma;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('joinByInviteHash returns pending for new request', async () => {
    prisma.team.findFirst.mockResolvedValue({
      id: 1,
      name: 'Team A',
      invitationExpireAt: new Date(Date.now() + 86400000),
    });
    prisma.teamMember.findFirst.mockResolvedValue(null);
    prisma.teamJoinRequest.findUnique.mockResolvedValue(null);
    prisma.teamJoinRequest.create.mockResolvedValue({ id: 10, teamId: 1, accountId: 2, status: 'PENDING' });

    const result = await service.joinByInviteHash('abc', 2);

    expect(result.result).toBe('SUCCESS');
    expect(result.data?.status).toBe('pending');
    expect(prisma.teamMember.create).not.toHaveBeenCalled();
  });

  it('joinByInviteHash throws 400 for expired invitation', async () => {
    prisma.team.findFirst.mockResolvedValue({
      id: 1,
      name: 'Team A',
      invitationExpireAt: new Date(Date.now() - 1000),
    });

    await expect(service.joinByInviteHash('abc', 2)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.teamJoinRequest.create).not.toHaveBeenCalled();
  });

  it('joinByInviteHash returns already-member without creating request', async () => {
    prisma.team.findFirst.mockResolvedValue({
      id: 1,
      name: 'Team A',
      invitationExpireAt: new Date(Date.now() + 86400000),
    });
    prisma.teamMember.findFirst.mockResolvedValue({ id: 5, teamId: 1, accountId: 2 });

    const result = await service.joinByInviteHash('abc', 2);

    expect(result.data?.status).toBe('already-member');
    expect(prisma.teamJoinRequest.create).not.toHaveBeenCalled();
  });
});
