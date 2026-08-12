import { PrismaClient, BusinessRole, PlatformRole } from '@prisma/client';
import argon2 from 'argon2';
import { BUSINESS_PERMISSIONS, ROLE_PERMISSION_MAP } from '../src/common/constants/permissions';

const prisma = new PrismaClient();

async function main() {
  await prisma.countryConfig.upsert({
    where: { countryCode: 'LK' },
    update: {},
    create: {
      countryCode: 'LK',
      countryName: 'Sri Lanka',
      currencyCode: 'LKR',
      currencySymbol: 'Rs',
      timezone: 'Asia/Colombo',
      dateFormat: 'yyyy-MM-dd',
      numberFormat: 'en-LK',
      taxInclusivePricingDefault: true,
    },
  });
  await prisma.countryConfig.upsert({
    where: { countryCode: 'GB' },
    update: {},
    create: {
      countryCode: 'GB',
      countryName: 'United Kingdom',
      currencyCode: 'GBP',
      currencySymbol: 'GBP',
      timezone: 'Europe/London',
      dateFormat: 'dd/MM/yyyy',
      numberFormat: 'en-GB',
      taxInclusivePricingDefault: false,
    },
  });

  for (const currencyCode of ['LKR', 'GBP']) {
    await prisma.subscriptionPlan.upsert({
      where: { code: `STARTER_${currencyCode}` },
      update: {},
      create: {
        name: `Starter ${currencyCode}`,
        code: `STARTER_${currencyCode}`,
        monthlyPrice: currencyCode === 'LKR' ? '5000.00' : '29.00',
        yearlyPrice: currencyCode === 'LKR' ? '54000.00' : '299.00',
        currencyCode,
        maximumBranches: 1,
        maximumUsers: 5,
        maximumRegisters: 2,
        retailEnabled: true,
        restaurantEnabled: true,
        kotEnabled: true,
      },
    });
  }

  for (const code of BUSINESS_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, description: code },
    });
  }
  for (const [role, permissions] of Object.entries(ROLE_PERMISSION_MAP)) {
    for (const permissionCode of permissions) {
      await prisma.rolePermission.upsert({
        where: { role_permissionCode: { role: role as BusinessRole, permissionCode } },
        update: {},
        create: { role: role as BusinessRole, permissionCode },
      });
    }
  }

  const email = process.env.DEV_SUPER_ADMIN_EMAIL;
  const password = process.env.DEV_SUPER_ADMIN_PASSWORD;
  if (email && password) {
    await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: {},
      create: {
        fullName: 'Development Super Admin',
        email: email.toLowerCase(),
        passwordHash: await argon2.hash(password),
        platformRole: PlatformRole.SUPER_ADMIN,
      },
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
