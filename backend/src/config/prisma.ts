import { PrismaClient as WorkschdClient } from '@prisma/client-workschd';
import { PrismaClient as InvestandClient } from '@prisma/client-investand';
import { PrismaClient as AviationClient } from '@prisma/client-aviation';
import { PrismaClient as AiprClient } from '@prisma/client-aipr';

export const workschdPrisma = new WorkschdClient();
export const investandPrisma = new InvestandClient();
export const aviationPrisma = new AviationClient();
export const aiprPrisma = new AiprClient();
