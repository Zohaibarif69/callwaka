import { NextResponse } from "next/server";
import * as repo from "@/src/lib/repo";

export async function GET() {
  const rows = await repo.listAllCalls();
  const calls = await Promise.all(
    rows.map(async (c) => {
      const caseRow = await repo.getCaseRow(c.case_id);
      return repo.serializeCall(c, caseRow?.title ?? "Unknown case", {
        name: caseRow?.counterparty_name ?? "Unknown",
        phone: caseRow?.counterparty_phone ?? "",
      });
    })
  );
  return NextResponse.json({ calls });
}
