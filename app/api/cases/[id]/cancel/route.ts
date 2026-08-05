import { NextRequest, NextResponse } from "next/server";
import * as repo from "@/src/lib/repo";
import * as sm from "@/src/lib/state-machine";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caseRow = await repo.getCaseRow(id);
  if (!caseRow) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  try {
    await sm.cancelCase(id);
    return NextResponse.json({ case: await repo.serializeCase(await repo.getCaseRow(id) as repo.CaseRow) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
