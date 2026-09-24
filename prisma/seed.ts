import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Default, global categories (userId: null). Users can add their own
// alongside these but cannot edit/delete the defaults.
const DEFAULT_CATEGORIES = [
  { name: "Nourriture", emoji: "🍔", color: "#f0883e" },
  { name: "Logement", emoji: "🏠", color: "#d4af37" },
  { name: "Transport", emoji: "🚗", color: "#6ea8fe" },
  { name: "Loisirs", emoji: "🎉", color: "#a78bfa" },
  { name: "Shopping", emoji: "🛍️", color: "#f472b6" },
  { name: "Abonnements", emoji: "🔁", color: "#4ade80" },
  { name: "Santé", emoji: "⚕️", color: "#f87171" },
  { name: "Éducation", emoji: "📚", color: "#60a5fa" },
  { name: "Voyages", emoji: "✈️", color: "#2dd4bf" },
  { name: "Autre", emoji: "📦", color: "#a39c8c" },
] as const;

async function main() {
  // Prisma's compound-unique `where` (userId_name) rejects `null` for a
  // nullable column, so an upsert keyed on it doesn't work here — find the
  // existing global (userId: null) categories by name instead, and only
  // create what's missing. Existing rows are left untouched (no update
  // branch): re-running the seed must never clobber a name/emoji/color a
  // user could plausibly have tweaked by then.
  const existing = await prisma.category.findMany({
    where: { userId: null },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((c) => c.name));
  const toCreate = DEFAULT_CATEGORIES.filter((c) => !existingNames.has(c.name));

  if (toCreate.length > 0) {
    await prisma.category.createMany({
      data: toCreate.map((c) => ({ ...c, userId: null, isDefault: true })),
    });
  }

  console.log(
    `Default categories: ${toCreate.length} created, ${existingNames.size} already present.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
