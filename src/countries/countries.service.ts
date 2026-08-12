import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CountriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveCountryOrThrow(countryCode: string) {
    const config = await this.prisma.countryConfig.findUnique({
      where: { countryCode: countryCode.trim().toUpperCase() },
    });
    if (!config?.isActive) {
      throw new BadRequestException({
        code: 'COUNTRY_UNSUPPORTED',
        message: 'Unsupported country',
      });
    }
    return config;
  }
}
