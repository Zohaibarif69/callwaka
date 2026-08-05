import { NextRequest, NextResponse } from "next/server";
import * as repo from "@/src/lib/repo";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caseRow = await repo.getCaseRow(id);
  if (!caseRow) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const callRows = await repo.listCallsForCase(id);
  const calls = callRows.map((c) =>
    repo.serializeCall(c, caseRow.title, { name: caseRow.counterparty_name, phone: caseRow.counterparty_phone })
  );

  const commitmentRows = await repo.listCommitmentsForCase(id);
  const commitments = commitmentRows.map((c) => repo.serializeCommitmentWithCase(c, caseRow));

  return NextResponse.json({
    case: await repo.serializeCase(caseRow),
    calls,
    commitments,
  });
}
