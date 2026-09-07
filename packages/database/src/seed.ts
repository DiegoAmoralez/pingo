import bcrypt from 'bcryptjs';
import { prisma } from './index.js';

async function main() {
  const demoEmail = 'demo@pingo.local';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@pingo.local';
  const demoPassword = 'Demo1234!';
  const adminPassword = 'Admin1234!';

  const demoHash = await bcrypt.hash(demoPassword, 12);
  const adminHash = await bcrypt.hash(adminPassword, 12);

  const demo = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: {
      id: 'demo-user-pingo',
      name: 'Demo User',
      email: demoEmail,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      role: 'USER',
      timezone: 'UTC',
      accounts: {
        create: {
          id: 'demo-account-pingo',
          accountId: 'demo-user-pingo',
          providerId: 'credential',
          password: demoHash,
        },
      },
      subscription: {
        create: {
          plan: 'PERSONAL',
          status: 'ACTIVE',
          provider: 'manual',
        },
      },
      preferences: { create: {} },
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'ADMIN' },
    create: {
      id: 'admin-user-pingo',
      name: 'PINGO Admin',
      email: adminEmail,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      role: 'ADMIN',
      timezone: 'UTC',
      accounts: {
        create: {
          id: 'admin-account-pingo',
          accountId: 'admin-user-pingo',
          providerId: 'credential',
          password: adminHash,
        },
      },
      subscription: {
        create: {
          plan: 'AGENCY',
          status: 'ACTIVE',
          provider: 'manual',
        },
      },
      preferences: { create: {} },
    },
  });

  await prisma.account.updateMany({
    where: { userId: demo.id, providerId: 'credential' },
    data: { accountId: demo.id, password: demoHash },
  });
  await prisma.account.updateMany({
    where: { userId: admin.id, providerId: 'credential' },
    data: { accountId: admin.id, password: adminHash },
  });

  const demoDomain = await prisma.domain.upsert({
    where: { userId_rootDomain: { userId: demo.id, rootDomain: 'example.com' } },
    update: {},
    create: {
      userId: demo.id,
      rootDomain: 'example.com',
      displayDomain: 'example.com',
      registrar: 'RESERVED',
      registeredAt: new Date('1995-08-14T00:00:00Z'),
      expiresAt: new Date(Date.now() + 214 * 24 * 60 * 60 * 1000),
      status: 'active',
      nameservers: ['a.iana-servers.net', 'b.iana-servers.net'],
      rdapSource: 'https://rdap.iana.org/domain/example.com',
      lastCheckedAt: new Date(),
      provider: 'rdap',
    },
  });

  const existing = await prisma.monitor.findFirst({
    where: { userId: demo.id, hostname: 'example.com' },
  });

  if (!existing) {
    await prisma.monitor.create({
      data: {
        userId: demo.id,
        domainId: demoDomain.id,
        name: 'example.com',
        url: 'https://example.com',
        hostname: 'example.com',
        rootDomain: 'example.com',
        displayHostname: 'example.com',
        status: 'UP',
        checkIntervalSeconds: 60,
        lastCheckedAt: new Date(),
        lastSuccessfulAt: new Date(),
        currentLatencyMs: 186,
        currentHttpStatus: 200,
        sslRecords: {
          create: {
            issuer: 'DigiCert Inc',
            validFrom: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            validUntil: new Date(Date.now() + 73 * 24 * 60 * 60 * 1000),
            daysRemaining: 73,
            fingerprint: 'demo',
          },
        },
      },
    });
  }

  console.log('Seed complete');
  console.log(`  Demo:  ${demoEmail} / ${demoPassword}`);
  console.log(`  Admin: ${admin.email} / ${adminPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
