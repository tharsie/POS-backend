import { Request } from 'express';

export interface AccessTokenPayload {
  sub: string;
  platformRole: string;
  businessMemberId?: string;
  businessId?: string;
  branchId?: string;
  businessRole?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AccessTokenPayload;
}
