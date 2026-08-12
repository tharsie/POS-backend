import { InvitationsService } from './invitations.service';

describe('InvitationsService', () => {
  it('rejects branch IDs outside the active business', async () => {
    const prisma = { branch: { count: jest.fn().mockResolvedValue(1) } };
    const service = new InvitationsService(
      prisma as any,
      {
        requireBusiness: () => ({
          businessId: 'b1',
          businessMemberId: 'm1',
          userId: 'u1',
          platformRole: 'USER',
          businessRole: 'OWNER',
        }),
      } as any,
      { assertUserLimit: jest.fn() } as any,
      {} as any,
      {} as any,
      { normalizeEmail: (email: string) => email.toLowerCase() } as any,
    );
    await expect(
      service.inviteStaff(
        {
          sub: 'u1',
          platformRole: 'USER',
          businessId: 'b1',
          businessMemberId: 'm1',
          businessRole: 'OWNER',
        },
        { email: 'A@EXAMPLE.COM', role: 'CASHIER', branchIds: ['branch-a', 'branch-b'] } as any,
        {},
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});
