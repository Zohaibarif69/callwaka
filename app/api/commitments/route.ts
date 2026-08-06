import { NextResponse } from "next/server";
import * as repo from "@/src/lib/repo";

export async function GET() {
  const cases = await repo.listCaseRows();
  const commitmentsByCase = await Promise.all(
    cases.map(async (caseRow) => {
      const rows = await repo.listCommitmentsForCase(caseRow.id);
      return rows.map((c) => repo.serializeCommitmentWithCase(c, caseRow));
    })
  );
  return NextResponse.json({ commitments: commitmentsByCase.flat() });
}
