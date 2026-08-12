import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function decimal(value: string, field = 'amount') {
  try {
    return new Prisma.Decimal(value);
  } catch {
    throw new BadRequestException({
      code: 'INVALID_DECIMAL',
      message: `${field} must be a valid decimal value`,
    });
  }
}
