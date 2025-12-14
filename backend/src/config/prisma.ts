import { PrismaClient as WorkschdClient } from '@prisma/client-workschd';
import { PrismaClient as InvestandClient } from '@prisma/client-investand';
import { PrismaClient as AviationClient } from '@prisma/client-aviation';

export const workschdPrisma = new WorkschdClient();
export const investandPrisma = new InvestandClient();
export const aviationPrisma = new AviationClient();
