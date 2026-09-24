// Prisma 7 config: the Prisma CLI (migrate, studio, generate) reads the
// connection info from here rather than from `datasource.url` in
// schema.prisma. The runtime PrismaClient gets its connection separately,
// via a driver adapter — see src/server/db/prisma.ts.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
