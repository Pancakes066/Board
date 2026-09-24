import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "@/lib/env";

// Prisma 7 requires an explicit driver adapter at runtime (the schema's
// datasource block no longer carries a `url`; that's only used by the CLI
// via prisma7.config.ts). Standard singleton pattern to avoid exhausting
// Postgres connections from hot-reloaded dev server modules.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
