import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

const SECRET_KEYS = new Set([
  'password',
  'passwordHash',
  'token',
  'tokenHash',
  'accessToken',
  'refreshToken',
  'cardNumber',
  'cvv',
  'pin',
]);

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Omit<Prisma.AuditLogUncheckedCreateInput, 'previousValues' | 'newValues'> & {
      previousValues?: unknown;
      newValues?: unknown;
    },
    tx?: Prisma.TransactionClient | PrismaClient,
  ) {
    const client = tx ?? this.prisma;
    return client.auditLog.create({
      data: {
        ...data,
        previousValues: this.scrub(data.previousValues),
        newValues: this.scrub(data.newValues),
      },
    });
  }

  private scrub(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) {
      return value.map((item) => this.scrub(item) ?? null);
    }
    if (typeof value === 'object') {
      if ('toString' in value && value.constructor?.name === 'Decimal') {
        return (value as { toString: () => string }).toString();
      }
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => !SECRET_KEYS.has(key))
          .map(([key, item]) => [key, this.scrub(item) ?? null]),
      );
    }
    return undefined;
  }
}
