import fs from 'fs';
import path from 'path';
import { workschdPrisma, aiprPrisma, rbacPrisma } from './prisma';
import { incheonFuneralHomes } from './incheon-funeral-homes';
import { seedConfig } from './seed-config';
import { seedAiprConfig } from './seed-aipr-config';
import * as bcrypt from 'bcrypt';

function isLocalhostDb(url?: string): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.includes('localhost') ||
    lowerUrl.includes('127.0.0.1') ||
    lowerUrl.startsWith('file:') ||
    lowerUrl.includes('sqlite')
  );
}

export function isLocalEnvironment(): boolean {
  return isLocalhostDb(process.env.DATABASE_URL) || process.env.NODE_ENV === 'development';
}

function parseSqlFile(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Strip block comments
  let cleanContent = content.replace(/\/\*[\s\S]*?\*\//g, '');
  // Split lines to remove line-by-line comments
  const lines = cleanContent.split('\n');
  const cleanLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('--')) return '';
    const commentIndex = line.indexOf('-- ');
    if (commentIndex !== -1) {
      return line.slice(0, commentIndex);
    }
    return line;
  });
  cleanContent = cleanLines.join('\n');

  // Split statements by semicolon
  return cleanContent
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);
}

export async function seedLocalAll(force = false) {
  if (!isLocalEnvironment()) {
    console.log('[seed-local] Not running in localhost DB environment. Skipping seeding.');
    return;
  }

  console.log('[seed-local] Localhost DB detected. Initializing seeding...');

  // 1. Seed workschd
  try {
    const workschdCount = await workschdPrisma.account.count();
    if (workschdCount === 0 || force) {
      console.log('[seed-local] Seeding workschd database with SQL...');
      const sqlPath = path.resolve(__dirname, '../../prisma/seed-workschd.sql');
      const statements = parseSqlFile(sqlPath);
      for (const stmt of statements) {
        await workschdPrisma.$executeRawUnsafe(stmt);
      }
      console.log('[seed-local] workschd database seeded.');
      
      // Seed system config
      console.log('[seed-local] Seeding workschd system configs...');
      await seedConfig(force);
    } else {
      console.log('[seed-local] workschd database already contains data. Skipping.');
    }
  } catch (err) {
    console.error('[seed-local] Error seeding workschd database:', err);
  }

  // 2. Seed aipr
  if (!process.env.DATABASE_URL) {
    console.log('[seed-local] DATABASE_URL environment variable is not defined. Skipping AIPR seeding.');
  } else {
    try {
      const aiprCount = await aiprPrisma.admin.count();
      if (aiprCount === 0 || force) {
        console.log('[seed-local] Seeding aipr database...');
        const passwordHash = await bcrypt.hash('admin1234!', 12);
        await aiprPrisma.admin.upsert({
          where: { email: 'admin@example.com' },
          update: {},
          create: {
            email: 'admin@example.com',
            role: 'SUPER',
            passwordHash,
          },
        });
        console.log('[seed-local] aipr database seeded.');

        console.log('[seed-local] Seeding aipr system configs...');
        await seedAiprConfig(force);
      } else {
        console.log('[seed-local] aipr database already contains data. Skipping.');
      }
    } catch (err) {
      console.error('[seed-local] Error seeding aipr database:', err);
    }
  }

  try {
    await seedPlatformTestAccounts();
    console.log('[seed-local] platform test accounts ready.');
  } catch (err) {
    console.error('[seed-local] Error seeding platform test accounts:', err);
  }

  try {
    await seedIncheonFuneralHomes();
    await seedWorkschdSample();
    console.log('[seed-local] workschd sample data and Incheon funeral homes ready.');
  } catch (err) {
    console.error('[seed-local] Error seeding workschd sample data:', err);
  }
}

const TEST_PASSWORD_HASH =
  '$2b$10$jsm2ltEER2WCncZkCpTFq.JbvSblPxkGRsLieVCdh/g7wpi3LnHRK';

async function seedPlatformTestAccounts() {
  await workschdPrisma.$executeRawUnsafe(
    `UPDATE account_role SET role_type = 'TEAM_LEADER' WHERE account_id = 1 AND role_type = 'LEADER'`,
  );
  await workschdPrisma.$executeRawUnsafe(
    `UPDATE account SET password = '${TEST_PASSWORD_HASH}' WHERE email IN ('leader@example.com','member@example.com','admin@workschd.test')`,
  );

  let admin = await workschdPrisma.account.findFirst({ where: { email: 'admin@workschd.test' } });
  if (!admin) {
    admin = await workschdPrisma.account.create({
      data: {
        username: 'admin',
        email: 'admin@workschd.test',
        phone: '010-0000-0003',
        password: TEST_PASSWORD_HASH,
        status: 'ACTIVE',
      },
    });
  }
  const adminRole = await workschdPrisma.accountRole.findFirst({
    where: { accountId: admin.accountId, roleType: 'ADMIN' },
  });
  if (!adminRole) {
    await workschdPrisma.accountRole.create({
      data: { accountId: admin.accountId, roleType: 'ADMIN' },
    });
  }

  const users = [
    { id: 'clseedleader0000000000001', email: 'leader@example.com', name: 'leader', subject: '1', role: 'TEAM_LEADER' },
    { id: 'clseedmember0000000000001', email: 'member@example.com', name: 'member', subject: '2', role: 'VIEWER' },
    { id: 'clseedadmin00000000000001', email: 'admin@workschd.test', name: 'admin', subject: String(admin.accountId), role: 'ADMIN' },
  ];

  for (const user of users) {
    await workschdPrisma.$executeRawUnsafe(
      `INSERT INTO identity_user (id, email, display_name, status, password_hash, created_at, updated_at)
       VALUES ('${user.id}', '${user.email}', '${user.name}', 'ACTIVE', '${TEST_PASSWORD_HASH}', NOW(3), NOW(3))
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), status = 'ACTIVE', updated_at = NOW(3)`,
    );
    await workschdPrisma.$executeRawUnsafe(
      `INSERT INTO identity_module_link (user_id, module, subject_id, created_at)
       VALUES ('${user.id}', 'workschd', '${user.subject}', NOW(3))
       ON DUPLICATE KEY UPDATE subject_id = VALUES(subject_id)`,
    );
  }

  for (const code of ['VIEWER', 'TEAM_LEADER', 'ADMIN', 'SUPER_ADMIN']) {
    await rbacPrisma.role.upsert({
      where: { code },
      update: {},
      create: { code, name: code, isSystem: true },
    });
  }

  const home = await rbacPrisma.permission.upsert({
    where: { code: 'workschd:page:home' },
    update: { resource: '/workschd', type: 'PAGE', module: 'workschd' },
    create: {
      code: 'workschd:page:home',
      name: '워크스케줄 홈',
      type: 'PAGE',
      module: 'workschd',
      resource: '/workschd',
    },
  });

  for (const code of ['VIEWER', 'TEAM_LEADER', 'ADMIN']) {
    const role = await rbacPrisma.role.findUnique({ where: { code } });
    if (!role) continue;
    const linked = await rbacPrisma.rolePermission.findFirst({
      where: { roleId: role.id, permissionId: home.id },
    });
    if (!linked) {
      await rbacPrisma.rolePermission.create({
        data: { roleId: role.id, permissionId: home.id },
      });
    }
  }

  for (const user of users) {
    const role = await rbacPrisma.role.findUnique({ where: { code: user.role } });
    if (!role) continue;
    const existing = await rbacPrisma.subjectRole.findFirst({
      where: { module: 'workschd', subjectId: user.id, roleId: role.id },
    });
    if (!existing) {
      await rbacPrisma.subjectRole.create({
        data: { module: 'workschd', subjectId: user.id, roleId: role.id },
      });
    }
  }
}

async function seedIncheonFuneralHomes() {
  for (const home of incheonFuneralHomes) {
    const data = {
      name: home.name,
      district: home.district,
      address: home.address,
      phone: null,
      roomCount: home.roomCount,
      homeUrl: home.homeUrl,
      listingUrl: home.listingUrl,
      region: 'INCHEON',
      hasScraper: home.hasScraper,
      isActive: true,
    };
    const byName = await workschdPrisma.funeralHome.findUnique({
      where: { name_region: { name: home.name, region: 'INCHEON' } },
    });
    if (byName) {
      await workschdPrisma.funeralHome.update({ where: { id: byName.id }, data });
      continue;
    }
    const byUrl = await workschdPrisma.funeralHome.findUnique({
      where: { listingUrl: home.listingUrl },
    });
    if (byUrl) {
      await workschdPrisma.funeralHome.update({ where: { id: byUrl.id }, data });
      continue;
    }
    await workschdPrisma.funeralHome.create({ data });
  }
}

const SAMPLE_SHOPS = [
  '인천적십자병원 장례식장',
  '길병원 장례식장',
  '인하대병원 장례식장',
  '인천성모장례식장',
];

async function seedWorkschdSample() {
  const leader = await workschdPrisma.account.findFirst({ where: { email: 'leader@example.com' } });
  const member = await workschdPrisma.account.findFirst({ where: { email: 'member@example.com' } });
  if (!leader || !member) {
    console.log('[seed-local] sample team skipped: test accounts missing');
    return;
  }

  let team = await workschdPrisma.team.findFirst({ where: { name: '인천 지원 1팀' } });
  if (!team) {
    team = await workschdPrisma.team.create({
      data: { name: '인천 지원 1팀', region: 'INCHEON', scheduleType: 'THREE_SHIFT' },
    });
  }

  for (const entry of [
    { account: leader, role: 'LEADER' },
    { account: member, role: 'MEMBER' },
  ]) {
    const existing = await workschdPrisma.teamMember.findFirst({
      where: { teamId: team.id, accountId: entry.account.accountId },
    });
    if (!existing) {
      await workschdPrisma.teamMember.create({
        data: { teamId: team.id, accountId: entry.account.accountId, role: entry.role },
      });
    }
  }

  const shops = new Map<string, { id: number }>();
  for (const name of SAMPLE_SHOPS) {
    const home = incheonFuneralHomes.find((item) => item.name === name);
    if (!home) continue;
    const data = {
      teamId: team.id,
      name: home.name,
      district: home.district,
      address: home.address,
      phone: null,
      capacity: home.roomCount,
      status: 'ACTIVE',
    };
    const existing = await workschdPrisma.shop.findFirst({ where: { teamId: team.id, name } });
    const shop = existing
      ? await workschdPrisma.shop.update({ where: { id: existing.id }, data })
      : await workschdPrisma.shop.create({ data });
    shops.set(name, shop);
  }

  const atHour = (dayOffset: number, hour: number) => {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    date.setHours(hour, 0, 0, 0);
    return date;
  };

  const tasks = [
    {
      title: '연수 적십자 조문 안내',
      shop: '인천적십자병원 장례식장',
      status: 'OPEN',
      startDay: 1,
      endDay: 2,
      workers: 2,
      assignMember: false,
    },
    {
      title: '남동 길병원 발인 지원',
      shop: '길병원 장례식장',
      status: 'OPEN',
      startDay: 3,
      endDay: 4,
      workers: 3,
      assignMember: false,
    },
    {
      title: '중구 인하대 서빙 지원',
      shop: '인하대병원 장례식장',
      status: 'CLOSED',
      startDay: -1,
      endDay: 0,
      workers: 2,
      assignMember: true,
    },
  ];

  for (const task of tasks) {
    const shop = shops.get(task.shop);
    if (!shop) continue;
    const existing = await workschdPrisma.task.findFirst({
      where: { teamId: team.id, title: task.title },
    });
    if (existing) continue;
    const created = await workschdPrisma.task.create({
      data: {
        title: task.title,
        description: '테스트 계정 샘플 근무입니다.',
        workerCount: task.workers,
        currentWorkerCount: task.assignMember ? 1 : 0,
        startDateTime: atHour(task.startDay, 9),
        endDateTime: atHour(task.endDay, 18),
        status: task.status,
        teamId: team.id,
        shopId: shop.id,
        createdBy: leader.accountId,
      },
    });
    if (task.assignMember) {
      await workschdPrisma.taskEmployee.create({
        data: {
          taskId: created.id,
          accountId: member.accountId,
          status: 'APPROVED',
          approvedAt: new Date(),
        },
      });
    }
  }
}

if (require.main === module) {
  const force = process.argv.includes('--force');
  seedLocalAll(force)
    .then(() => {
      console.log('[seed-local] Seeding execution finished.');
      process.exit(0);
    })
    .catch(err => {
      console.error('[seed-local] Seeding execution failed:', err);
      process.exit(1);
    });
}
