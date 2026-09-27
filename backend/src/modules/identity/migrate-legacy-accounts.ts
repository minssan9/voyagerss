/**
 * Idempotent migration of legacy workschd accounts, AccountOAuth rows, and aipr admins
 * into the shared identity tables.
 *
 * Run (do not execute automatically against production without review):
 *   cd backend
 *   npx ts-node -r tsconfig-paths/register src/modules/identity/migrate-legacy-accounts.ts
 */

import { PrismaClient as IdentityClient } from '@prisma/client-identity';
import { PrismaClient as WorkschdClient } from '@prisma/client-workschd';
import { PrismaClient as AiprClient } from '@prisma/client-aipr';

const identityPrisma = new IdentityClient();
const workschdPrisma = new WorkschdClient();
const aiprPrisma = new AiprClient();

export async function migrateLegacyAccounts(): Promise<void> {
  const accounts = await workschdPrisma.account.findMany({
    include: { oauthAccounts: true },
  });

  for (const account of accounts) {
    let user = account.email
      ? await identityPrisma.user.findFirst({ where: { email: account.email } })
      : null;

    if (!user) {
      user = await identityPrisma.user.create({
        data: {
          email: account.email,
          displayName: account.username,
          passwordHash: account.password,
          status: account.status,
        },
      });
    }

    await identityPrisma.moduleLink.upsert({
      where: { userId_module: { userId: user.id, module: 'workschd' } },
      create: {
        userId: user.id,
        module: 'workschd',
        subjectId: String(account.accountId),
      },
      update: { subjectId: String(account.accountId) },
    });

    for (const oauth of account.oauthAccounts) {
      const existing = await identityPrisma.oauthAccount.findUnique({
        where: {
          provider_providerId: { provider: oauth.provider, providerId: oauth.providerId },
        },
      });

      if (!existing) {
        await identityPrisma.oauthAccount.create({
          data: {
            userId: user.id,
            provider: oauth.provider,
            providerId: oauth.providerId,
          },
        });
      }
    }
  }

  try {
    const admins = await aiprPrisma.admin.findMany();
    for (const admin of admins) {
      let user = await identityPrisma.user.findFirst({ where: { email: admin.email } });

      if (!user) {
        user = await identityPrisma.user.create({
          data: {
            email: admin.email,
            displayName: admin.email,
            passwordHash: admin.passwordHash,
            status: 'ACTIVE',
          },
        });
      }

      await identityPrisma.moduleLink.upsert({
        where: { userId_module: { userId: user.id, module: 'aipr' } },
        create: {
          userId: user.id,
          module: 'aipr',
          subjectId: admin.id,
        },
        update: { subjectId: admin.id },
      });
    }
  } catch (err) {
    console.warn('[migrate-legacy-accounts] aipr migration skipped:', (err as Error).message);
  }
}

if (require.main === module) {
  migrateLegacyAccounts()
    .then(() => {
      console.log('[migrate-legacy-accounts] complete');
    })
    .catch((err) => {
      console.error('[migrate-legacy-accounts] failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await identityPrisma.$disconnect();
      await workschdPrisma.$disconnect();
      await aiprPrisma.$disconnect();
    });
}
