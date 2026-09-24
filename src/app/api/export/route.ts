import { NextResponse } from "next/server";

import { requireUser } from "@/server/auth/session";
import { getFullUserExport, transactionsToCsv } from "@/server/services/export/export-data";

export async function GET(request: Request) {
  const user = await requireUser();
  const format = new URL(request.url).searchParams.get("format") === "csv" ? "csv" : "json";
  const data = await getFullUserExport(user.id);

  if (format === "csv") {
    return new NextResponse(transactionsToCsv(data.transactions), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="board-transactions.csv"`,
      },
    });
  }

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="board-export.json"`,
    },
  });
}
