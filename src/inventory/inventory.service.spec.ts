import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  it('calculates stock-on-hand within active business and branch context', async () => {
    const prisma = {
      product: { findFirst: jest.fn().mockResolvedValue({ id: 'product-1' }) },
      stockMovement: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { quantity: { toString: () => '12.500' } } }),
      },
    };
    const service = new InventoryService(
      prisma as any,
      {
        requireBranch: () => ({
          userId: 'user-1',
          platformRole: 'USER',
          businessMemberId: 'member-1',
          businessId: 'business-1',
          branchId: 'branch-1',
          businessRole: 'OWNER',
        }),
      } as any,
      {} as any,
    );

    await expect(
      service.stockOnHand({ sub: 'user-1', platformRole: 'USER' }, 'product-1'),
    ).resolves.toEqual({
      productId: 'product-1',
      branchId: 'branch-1',
      quantityOnHand: '12.500',
    });
    expect(prisma.stockMovement.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId: 'business-1', branchId: 'branch-1', productId: 'product-1' },
      }),
    );
  });
});
