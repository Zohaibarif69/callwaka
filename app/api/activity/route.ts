import { NextResponse } from "next/server";
import * as repo from "@/src/lib/repo";

export async function GET() {
  const rows = await repo.listAllEvents();
  const events = await Promise.all(
    rows.map(async (e) => {
      const caseRow = await repo.getCaseRow(e.case_id);
      return repo.serializeActivityEvent(e, caseRow?.title ?? "Unknown case");
    })
  );
  return NextResponse.json({ events });
}
