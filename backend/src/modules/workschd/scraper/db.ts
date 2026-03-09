import crypto from 'crypto';
import { workschdPrisma as prisma } from '../../../config/prisma';
import { FuneralHomeSource, ScrapedFuneral } from './types';

export async function initDb(): Promise<void> {
  // Prisma client is initialized at application bootstrap.
}

export async function syncFuneralHomes(sources: FuneralHomeSource[]): Promise<number> {
  if (sources.length === 0) {
    return 0;
  }

  const listingUrls = sources.map((source) => source.listingUrl);

  await prisma.$transaction(async (tx) => {
    await tx.funeralHome.updateMany({
      where: {
        listingUrl: {
          notIn: listingUrls
        }
      },
      data: {
        isActive: false
      }
    });

    for (const source of sources) {
      await tx.funeralHome.upsert({
        where: {
          listingUrl: source.listingUrl
        },
        create: {
          name: source.funeralHomeName,
          homeUrl: source.funeralHomeUrl,
          listingUrl: source.listingUrl,
          region: source.region,
          isActive: true
        },
        update: {
          name: source.funeralHomeName,
          homeUrl: source.funeralHomeUrl,
          region: source.region,
          isActive: true
        }
      });
    }
  });

  return sources.length;
}

export async function clearOldFunerals(): Promise<void> {
  const threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  await prisma.funeralEvent.deleteMany({
    where: {
      scrapedAt: {
        lt: threshold
      }
    }
  });
}

export async function insertFunerals(funerals: ScrapedFuneral[]): Promise<number> {
  const validFunerals = funerals.filter(isValidScrapedFuneral);
  if (validFunerals.length === 0) {
    return 0;
  }

  const homesByKey = new Map<string, { name: string; homeUrl: string; region: 'INCHEON' | 'BUCHEON' }>();
  for (const funeral of validFunerals) {
    const key = `${funeral.funeralHomeName}|${funeral.region}`;
    homesByKey.set(key, {
      name: funeral.funeralHomeName,
      homeUrl: funeral.funeralHomeUrl,
      region: funeral.region
    });
  }

  for (const home of homesByKey.values()) {
    await prisma.funeralHome.upsert({
      where: {
        name_region: {
          name: home.name,
          region: home.region
        }
      },
      create: {
        name: home.name,
        homeUrl: home.homeUrl,
        listingUrl: home.homeUrl,
        region: home.region,
        isActive: true
      },
      update: {
        homeUrl: home.homeUrl,
        isActive: true
      }
    });
  }

  const homes = await prisma.funeralHome.findMany({
    where: {
      OR: Array.from(homesByKey.values()).map((home) => ({
        name: home.name,
        region: home.region
      }))
    },
    select: {
      id: true,
      name: true,
      region: true
    }
  });

  const homeIdByKey = new Map<string, number>();
  for (const home of homes) {
    homeIdByKey.set(`${home.name}|${home.region}`, home.id);
  }

  const events = validFunerals
    .map((funeral) => {
      const key = `${funeral.funeralHomeName}|${funeral.region}`;
      const funeralHomeId = homeIdByKey.get(key);
      if (!funeralHomeId) {
        return null;
      }

      const sourceHash = buildSourceHash(funeralHomeId, funeral);
      const parsedScrapedAt = parseDateOrNow(funeral.scrapedAt);

      return {
        funeralHomeId,
        deceasedName: funeral.deceasedName,
        roomNumber: funeral.roomNumber ?? null,
        chiefMourner: funeral.chiefMourner ?? null,
        funeralDate: funeral.funeralDate ?? null,
        burialDate: funeral.burialDate ?? null,
        burialPlace: funeral.burialPlace ?? null,
        religion: funeral.religion ?? null,
        rawData: funeral.rawData ?? null,
        scrapedAt: parsedScrapedAt,
        sourceHash
      };
    })
    .filter((event): event is NonNullable<typeof event> => event !== null);

  if (events.length === 0) {
    return 0;
  }

  const result = await prisma.funeralEvent.createMany({
    data: events,
    skipDuplicates: true
  });

  const touchedHomeIds = Array.from(new Set(events.map((event) => event.funeralHomeId)));
  const now = new Date();

  await prisma.funeralHome.updateMany({
    where: {
      id: {
        in: touchedHomeIds
      }
    },
    data: {
      lastScrapedAt: now
    }
  });

  return result.count;
}

export interface FuneralQueryParams {
  region?: 'INCHEON' | 'BUCHEON';
  funeralHomeName?: string;
  page?: number;
  size?: number;
}

export async function queryFunerals(params: FuneralQueryParams = {}): Promise<{
  content: any[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}> {
  const page = params.page ?? 0;
  const size = params.size ?? 20;

  const where = {
    scrapedAt: {
      gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    },
    funeralHome: {
      ...(params.region ? { region: params.region } : {}),
      ...(params.funeralHomeName
        ? {
            name: {
              contains: params.funeralHomeName
            }
          }
        : {})
    }
  };

  const [totalElements, rows] = await Promise.all([
    prisma.funeralEvent.count({ where }),
    prisma.funeralEvent.findMany({
      where,
      include: {
        funeralHome: true
      },
      orderBy: [
        {
          scrapedAt: 'desc'
        },
        {
          id: 'desc'
        }
      ],
      skip: page * size,
      take: size
    })
  ]);

  return {
    content: rows.map(mapRow),
    totalElements,
    totalPages: Math.ceil(totalElements / size),
    page,
    size
  };
}

export async function queryFuneralHomes(params: {
  region?: 'INCHEON' | 'BUCHEON';
  isActive?: boolean;
  page?: number;
  size?: number;
} = {}): Promise<{
  content: any[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}> {
  const page = params.page ?? 0;
  const size = params.size ?? 50;

  const where = {
    ...(params.region ? { region: params.region } : {}),
    ...(params.isActive === undefined ? {} : { isActive: params.isActive })
  };

  const [totalElements, rows] = await Promise.all([
    prisma.funeralHome.count({ where }),
    prisma.funeralHome.findMany({
      where,
      orderBy: [
        {
          region: 'asc'
        },
        {
          name: 'asc'
        }
      ],
      skip: page * size,
      take: size
    })
  ]);

  return {
    content: rows,
    totalElements,
    totalPages: Math.ceil(totalElements / size),
    page,
    size
  };
}

export async function linkFuneralToTask(funeralId: number, taskId: number): Promise<void> {
  await prisma.funeralEvent.update({
    where: {
      id: funeralId
    },
    data: {
      taskId
    }
  });
}

function mapRow(row: any) {
  return {
    id: row.id,
    funeralHomeName: row.funeralHome?.name,
    funeralHomeUrl: row.funeralHome?.homeUrl,
    region: row.funeralHome?.region,
    deceasedName: row.deceasedName,
    roomNumber: row.roomNumber,
    chiefMourner: row.chiefMourner,
    funeralDate: row.funeralDate,
    burialDate: row.burialDate,
    burialPlace: row.burialPlace,
    religion: row.religion,
    rawData: row.rawData,
    scrapedAt: row.scrapedAt,
    taskId: row.taskId,
    createdAt: row.createdAt
  };
}

function parseDateOrNow(value: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

function buildSourceHash(funeralHomeId: number, funeral: ScrapedFuneral): string {
  const normalized = [
    funeralHomeId,
    normalize(funeral.deceasedName),
    normalize(funeral.roomNumber),
    normalize(funeral.chiefMourner),
    normalize(funeral.funeralDate),
    normalize(funeral.burialDate),
    normalize(funeral.burialPlace),
    normalize(funeral.religion)
  ].join('|');

  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function normalize(value?: string): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function isValidScrapedFuneral(funeral: ScrapedFuneral): boolean {
  const name = (funeral.deceasedName ?? '').trim();
  if (!name) {
    return false;
  }

  const blockedKeywords = [
    '고인명',
    '이름',
    '명함',
    '앞면',
    '뒷면',
    '이미지',
    '빈소',
    '상주'
  ];

  const normalizedName = normalize(name);
  if (blockedKeywords.some((keyword) => normalizedName.includes(keyword))) {
    return false;
  }

  if (/^\d+호$/.test(name) || /^\d+$/.test(name)) {
    return false;
  }

  // Typical Korean names: 2~4 Hangul characters.
  if (!/^[가-힣]{2,4}$/.test(name)) {
    return false;
  }

  return true;
}
