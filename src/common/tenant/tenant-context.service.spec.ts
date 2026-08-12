import { TenantContextService } from './tenant-context.service';

describe('TenantContextService', () => {
  const prisma = { branchMember: { findFirst: jest.fn() } };
  const service = new TenantContextService(prisma as any);

  it('requires business context', () => {
    expect(() => service.requireBusiness({ sub: 'u1', platformRole: 'USER' })).toThrow();
  });

  it('builds tenant filters from authenticated context', () => {
    const context = service.requireBusiness({
      sub: 'u1',
      platformRole: 'USER',
      businessMemberId: 'm1',
      businessId: 'b1',
      businessRole: 'OWNER',
    });
    expect(service.tenantWhere(context, { id: 'x' })).toEqual({ id: 'x', businessId: 'b1' });
  });

  it('blocks branch access across businesses', async () => {
    prisma.branchMember.findFirst.mockResolvedValue(null);
    await expect(
      service.assertBranchAccess(
        {
          userId: 'u1',
          platformRole: 'USER',
          businessMemberId: 'mA',
          businessId: 'businessA',
          businessRole: 'OWNER',
        },
        'branchB',
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});
