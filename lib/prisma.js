import { PrismaClient } from '@prisma/client';

function buildDatasourceUrl() {
  const url = process.env.DATABASE_URL || '';
  if (!url) return url;
  const sep = url.includes('?') ? '&' : '?';
  const extras = [];
  if (!url.includes('pgbouncer')) extras.push('pgbouncer=true');
  if (!url.includes('connection_limit')) extras.push('connection_limit=1');
  if (!url.includes('pool_timeout')) extras.push('pool_timeout=10');
  return extras.length ? `${url}${sep}${extras.join('&')}` : url;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: { db: { url: buildDatasourceUrl() } },
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  });
};

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
