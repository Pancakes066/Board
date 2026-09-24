import { prisma } from "@/server/db/prisma";

/**
 * Creates a throwaway user + category for an integration test and returns
 * both plus a cleanup function. Tests run against the real (local dev)
 * database — there's no separate test DB in this project yet — so every
 * test that uses this MUST call cleanup() in a `finally`/afterEach, scoped
 * tightly to rows it created, never a broad delete.
 */
export async function createTestUser() {
  const user = await prisma.user.create({
    data: { email: `vitest-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`, passwordHash: "x" },
  });
  const category = await prisma.category.create({
    data: { userId: user.id, name: "TestCategory" },
  });

  async function cleanup() {
    await prisma.transaction.deleteMany({ where: { userId: user.id } });
    await prisma.recurringRule.deleteMany({ where: { userId: user.id } });
    await prisma.category.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }

  return { user, category, cleanup };
}
