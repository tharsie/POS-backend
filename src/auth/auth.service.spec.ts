import { AuthService } from './auth.service';

describe('AuthService', () => {
  const config = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        'jwt.accessSecret': 'a'.repeat(32),
        'jwt.accessExpiresIn': '15m',
        'jwt.refreshExpiresIn': '30d',
      };
      return values[key];
    }),
  };
  const jwt = { sign: jest.fn().mockReturnValue('access') };
  const users = {
    normalizeEmail: (email: string) => email.toLowerCase(),
    toSafeUser: (user: any) => {
      const { passwordHash: _hash, ...safe } = user;
      return safe;
    },
    findByEmail: jest.fn(),
  };
  const prisma = {
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: { update: jest.fn() },
  };
  const service = new AuthService(
    prisma as any,
    jwt as any,
    config as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    users as any,
  );

  it('rotates refresh tokens and revokes the used token', async () => {
    prisma.refreshToken.findFirst.mockResolvedValue({
      id: 'old',
      userId: 'u1',
      familyId: 'family',
      expiresAt: new Date(Date.now() + 10000),
      revokedAt: null,
      user: { id: 'u1', platformRole: 'USER' },
    });
    prisma.refreshToken.create.mockResolvedValue({ id: 'new' });
    await expect(service.refresh('raw', {})).resolves.toHaveProperty('refreshToken');
    expect(prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'old' },
        data: expect.objectContaining({ replacedByTokenId: 'new' }),
      }),
    );
  });

  it('revokes a token family when a revoked token is reused', async () => {
    prisma.refreshToken.findFirst.mockResolvedValue({
      id: 'old',
      userId: 'u1',
      familyId: 'family',
      expiresAt: new Date(Date.now() + 10000),
      revokedAt: new Date(),
      user: { id: 'u1', platformRole: 'USER' },
    });
    await expect(service.refresh('raw', {})).rejects.toMatchObject({ status: 401 });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { familyId: 'family', revokedAt: null } }),
    );
  });
});
