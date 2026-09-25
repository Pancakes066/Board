import { prisma } from "@/server/db/prisma";
import type { AccountTransferInput } from "@/lib/validation/financial-account";

async function assertOwnedAccount(userId: string, accountId: string) {
  const account = await prisma.financialAccount.findUnique({ where: { id: accountId } });
  if (!account || account.userId !== userId) {
    throw new Error("Compte invalide.");
  }
  return account;
}

/** A single write into AccountTransfer — never a Transaction, so it can
 * never be picked up as income/expense by any statistics/forecast query.
 * Both accounts' balances update automatically next time getCurrentBalance
 * runs for them, since nothing is stored in duplicate. */
export async function createTransfer(userId: string, input: AccountTransferInput) {
  const [fromAccount, toAccount] = await Promise.all([
    assertOwnedAccount(userId, input.fromAccountId),
    assertOwnedAccount(userId, input.toAccountId),
  ]);

  if (fromAccount.currency !== toAccount.currency) {
    throw new Error(
      "Transfert entre devises différentes non pris en charge pour l'instant — les deux comptes doivent utiliser la même devise.",
    );
  }

  return prisma.accountTransfer.create({
    data: {
      userId,
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      amountCents: input.amountCents,
      date: input.date,
      note: input.note,
    },
  });
}

export function listTransfers(userId: string) {
  return prisma.accountTransfer.findMany({
    where: { userId },
    include: {
      fromAccount: { select: { id: true, name: true, currency: true } },
      toAccount: { select: { id: true, name: true, currency: true } },
    },
    orderBy: { date: "desc" },
  });
}

export async function deleteTransfer(userId: string, transferId: string) {
  const transfer = await prisma.accountTransfer.findUnique({ where: { id: transferId } });
  if (!transfer || transfer.userId !== userId) {
    throw new Error("Transfert introuvable.");
  }
  await prisma.accountTransfer.delete({ where: { id: transferId } });
}
