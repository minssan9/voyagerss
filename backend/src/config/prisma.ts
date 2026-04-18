import { PrismaClient as WorkschdClient } from '@prisma/client-workschd';
import { PrismaClient as InvestandClient } from '@prisma/client-investand';
import { PrismaClient as AviationClient } from '@prisma/client-aviation';
import { PrismaClient as AutodevClient } from '@prisma/client-autodev';

export const workschdPrisma = new WorkschdClient();
export const investandPrisma = new InvestandClient();
export const aviationPrisma = new AviationClient();
export const autodevPrisma = new AutodevClient();
