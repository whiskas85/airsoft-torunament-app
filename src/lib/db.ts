import { PrismaClient } from '@prisma/client';

// un solo client anche con il ricaricamento a caldo di `next dev`
const globale = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globale.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globale.prisma = prisma;
