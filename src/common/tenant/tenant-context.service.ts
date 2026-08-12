import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AccessTokenPayload } from '../types/authenticated-request';

export interface TenantContext {
  userId: string;
  platformRole: string;
  businessMemberId: string;
  businessId: string;
  branchId?: string;
  businessRole: string;
}

@Injectable()
export class TenantContextService {
  constructor(private readonly prisma: PrismaService) {}

  requireBusiness(user?: AccessTokenPayload): TenantContext {
    if (!user?.sub)
      throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Login required' });
    if (!user.businessId || !user.businessMemberId || !user.businessRole) {
      throw new ForbiddenException({
        code: 'TENANT_CONTEXT_REQUIRED',
        message: 'Select an active business first',
      });
    }
    return {
      userId: user.sub,
      platformRole: user.platformRole,
      businessMemberId: user.businessMemberId,
      businessId: user.businessId,
      branchId: user.branchId,
      businessRole: user.businessRole,
    };
  }

  requireBranch(user?: AccessTokenPayload): TenantContext {
    const context = this.requireBusiness(user);
    if (!context.branchId) {
      throw new ForbiddenException({
        code: 'BRANCH_CONTEXT_REQUIRED',
        message: 'Select an active branch first',
      });
    }
    return context;
  }

  tenantWhere<T extends object>(context: TenantContext, where?: T): T & { businessId: string } {
    return { ...(where ?? ({} as T)), businessId: context.businessId };
  }

  branchWhere<T extends object>(
    context: TenantContext,
    where?: T,
  ): T & { businessId: string; branchId: string } {
    if (!context.branchId) {
      throw new ForbiddenException({
        code: 'BRANCH_CONTEXT_REQUIRED',
        message: 'Select an active branch first',
      });
    }
    return { ...(where ?? ({} as T)), businessId: context.businessId, branchId: context.branchId };
  }

  async assertBranchAccess(context: TenantContext, branchId: string) {
    const branchMember = await this.prisma.branchMember.findFirst({
      where: {
        branchId,
        businessMemberId: context.businessMemberId,
        branch: { businessId: context.businessId, isActive: true },
      },
    });
    if (!branchMember) {
      throw new ForbiddenException({
        code: 'BRANCH_FORBIDDEN',
        message: 'Branch is not available to this member',
      });
    }
  }
}
