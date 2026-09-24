import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { hashPassword } from "../src/server/auth/password";
import { generateOccurrencesForPeriod } from "../src/server/services/recurrence/generate-month";
import { previousPeriod, type Period } from "../src/lib/utils/date";

// Reuses the spec's own worked examples end to end, so `npm run seed:demo`
// gives a fresh clone a realistic account to click through immediately:
// Salaire 1700, Loyer, Netflix/Spotify/Téléphone (44,61€/mois), a "PC"
// savings goal at 450/1200, a Nourriture budget at 200 — plus a few months
// of history so Statistics has something to chart.

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_EMAIL = "demo@board.app";
const DEMO_PASSWORD = "demodemo123";

const MONTHS_OF_HISTORY = 3;

function periodOf(date: Date): Period {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

async function categoryId(name: string): Promise<string> {
  const category = await prisma.category.findFirstOrThrow({ where: { userId: null, name } });
  return category.id;
}

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    console.log(`Demo user ${DEMO_EMAIL} already exists (id ${existing.id}) — nothing to do.`);
    console.log("Delete it first (via /settings/security or psql) to reseed from scratch.");
    return;
  }

  const now = new Date();
  const startingBalanceDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - MONTHS_OF_HISTORY, 1),
  );

  const [logement, abonnements, autre, nourriture, transport, loisirs] = await Promise.all([
    categoryId("Logement"),
    categoryId("Abonnements"),
    categoryId("Autre"),
    categoryId("Nourriture"),
    categoryId("Transport"),
    categoryId("Loisirs"),
  ]);

  const user = await prisma.user.create({
    data: {
      name: "Démo Board",
      email: DEMO_EMAIL,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      startingBalanceCents: 150_000,
      startingBalanceDate,
    },
  });

  const savingsGoal = await prisma.savingsGoal.create({
    data: {
      userId: user.id,
      name: "PC",
      emoji: "💻",
      targetAmountCents: 120_000,
      initialAmountCents: 45_000,
      targetDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 6, 1)),
    },
  });

  await prisma.budget.create({
    data: { userId: user.id, categoryId: nourriture, amountCents: 20_000 },
  });

  const ruleData = [
    { type: "INCOME" as const, name: "Salaire", amountCents: 170_000, categoryId: autre, dayOfMonth: 1 },
    { type: "INCOME" as const, name: "Aide", amountCents: 10_000, categoryId: autre, dayOfMonth: 5 },
    { type: "EXPENSE" as const, name: "Loyer", amountCents: 75_000, categoryId: logement, dayOfMonth: 1 },
    {
      type: "EXPENSE" as const,
      name: "Netflix",
      amountCents: 1_349,
      categoryId: abonnements,
      dayOfMonth: 15,
      isSubscription: true,
    },
    {
      type: "EXPENSE" as const,
      name: "Spotify",
      amountCents: 1_112,
      categoryId: abonnements,
      dayOfMonth: 20,
      isSubscription: true,
    },
    {
      type: "EXPENSE" as const,
      name: "Téléphone",
      amountCents: 2_000,
      categoryId: abonnements,
      dayOfMonth: 10,
      isSubscription: true,
    },
    {
      type: "SAVINGS" as const,
      name: "Épargne PC",
      amountCents: 10_000,
      categoryId: autre,
      dayOfMonth: 1,
      savingsGoalId: savingsGoal.id,
    },
  ];

  for (const rule of ruleData) {
    await prisma.recurringRule.create({
      data: {
        userId: user.id,
        type: rule.type,
        name: rule.name,
        amountCents: rule.amountCents,
        frequency: "MONTHLY",
        dayOfMonth: rule.dayOfMonth,
        startDate: startingBalanceDate,
        categoryId: rule.categoryId,
        isSubscription: "isSubscription" in rule ? rule.isSubscription : false,
        savingsGoalId: "savingsGoalId" in rule ? rule.savingsGoalId : null,
      },
    });
  }

  // Generate occurrences for the history window + current + next month, then
  // mark everything strictly before the current month as COMPLETED (a real
  // user would have confirmed past occurrences by now) so Statistics and
  // the forecast reconciliation have real "actual" data to show.
  let period = periodOf(startingBalanceDate);
  const periods: Period[] = [period];
  for (let i = 0; i < MONTHS_OF_HISTORY + 1; i++) {
    period = { year: period.year, month: period.month + 1 > 12 ? 1 : period.month + 1 };
    if (period.month === 1 && periods[periods.length - 1]!.month === 12) period.year += 1;
    periods.push(period);
  }
  for (const p of periods) {
    await generateOccurrencesForPeriod(user.id, p);
  }

  const currentPeriod = periodOf(now);
  await prisma.transaction.updateMany({
    where: {
      userId: user.id,
      OR: [
        { periodYear: { lt: currentPeriod.year } },
        { periodYear: currentPeriod.year, periodMonth: { lt: currentPeriod.month } },
      ],
    },
    data: { status: "COMPLETED" },
  });

  // A handful of manual, completed variable-spend transactions across the
  // history window — without these, "Fixe vs variable" and the projected
  // variable spend fallback have nothing to average.
  const variableSpend = [
    { categoryId: nourriture, amountCents: 4_500, dayOffset: 3 },
    { categoryId: nourriture, amountCents: 3_200, dayOffset: 12 },
    { categoryId: transport, amountCents: 6_000, dayOffset: 7 },
    { categoryId: loisirs, amountCents: 2_800, dayOffset: 20 },
  ];
  for (const p of periods.slice(0, MONTHS_OF_HISTORY + 1)) {
    if (p.year === currentPeriod.year && p.month === currentPeriod.month) continue;
    for (const spend of variableSpend) {
      const date = new Date(Date.UTC(p.year, p.month - 1, spend.dayOffset));
      await prisma.transaction.create({
        data: {
          userId: user.id,
          type: "EXPENSE",
          status: "COMPLETED",
          amountCents: spend.amountCents,
          categoryId: spend.categoryId,
          sourceDate: date,
          date,
          periodYear: p.year,
          periodMonth: p.month,
        },
      });
    }
  }

  const prev = previousPeriod(currentPeriod);
  console.log(`Demo account ready: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(
    `Seeded ${MONTHS_OF_HISTORY} months of history (through ${prev.year}-${String(prev.month).padStart(2, "0")}) plus the current and next month.`,
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
