import { PaymentsService } from './payments.service';
import { Prisma } from '@prisma/client';

describe('PaymentsService', () => {
  it('rejects overpayments', async () => {
    const prisma = {
      order: {
        findFirst: jest.fn(),
      },
    };
    prisma.order.findFirst.mockResolvedValueOnce({
      id: 'order-1',
      businessId: 'business-1',
      branchId: 'branch-1',
      currencyCode: 'LKR',
      grandTotal: new Prisma.Decimal('100.00'),
      status: 'OPEN',
      payments: [],
    });
    const service = new PaymentsService(
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
      service.receive(
        { sub: 'user-1', platformRole: 'USER' },
        { orderId: 'order-1', method: 'CASH', amount: '101.00' },
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
});
