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
    const call = await sm.escalateCase(id);
    if (!call) {
      return NextResponse.json(
        { error: "Escalation limit reached, this case was cancelled, or there's no commitment to escalate — this case now needs a human" },
        { status: 409 }
      );
    }
    return NextResponse.json({
      call: repo.serializeCall(call, caseRow.title, { name: caseRow.counterparty_name, phone: caseRow.counterparty_phone }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
