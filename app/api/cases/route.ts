import { NextRequest, NextResponse } from "next/server";
import * as repo from "@/src/lib/repo";
import * as sm from "@/src/lib/state-machine";
import { toE164 } from "@/src/lib/utils";

export async function GET() {
  const rows = await repo.listCaseRows();
  const cases = await Promise.all(rows.map(repo.serializeCase));
  return NextResponse.json({ cases });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  // Matches the existing NewCaseModal fields exactly: description, phone,
  // reference, commitment, deadline — no UI change required.
  if (!body?.description || !body?.phone) {
    return NextResponse.json({ error: "description and phone are required" }, { status: 400 });
  }

  // Normalize to E.164 here too, not just in the UI — this is the route that
  // actually talks to CALL-E, so it's the one place this absolutely has to
  // be correct, regardless of how the request got here.
  const counterpartyPhone = toE164(body.phone);
  if (!counterpartyPhone) {
    return NextResponse.json({ error: "phone is not a valid phone number" }, { status: 400 });
  }
  let userPhone: string | undefined;
  if (body.userPhone) {
    userPhone = toE164(body.userPhone) ?? undefined;
    if (!userPhone) {
      return NextResponse.json({ error: "userPhone is not a valid phone number" }, { status: 400 });
    }
  }

  const title = deriveTitle(body.description);
  const counterpartyName = body.counterpartyName || "Contact";

  try {
    // If the user already knows what was promised, skip the initial call —
    // register the commitment directly and let Callwaka take over from there.
    if (body.commitment && body.deadline) {
      const caseRow = await sm.startCaseWithKnownCommitment({
        title,
        description: body.description,
        counterpartyName,
        counterpartyPhone,
        userPhone,
        referenceNumber: body.reference,
        commitmentDescription: body.commitment,
        dueAt: new Date(body.deadline).toISOString(),
      });
      return NextResponse.json({ case: await repo.serializeCase(caseRow) }, { status: 201 });
    }

    // Otherwise place a real CALL-E call to go secure a commitment.
    const { case: caseRow } = await sm.startCase({
      title,
      description: body.description,
      counterpartyName,
      counterpartyPhone,
      userPhone,
    });

    return NextResponse.json({ case: await repo.serializeCase(caseRow) }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function deriveTitle(description: string): string {
  const words = description.trim().split(/\s+/).slice(0, 6).join(" ");
  return words.length < description.trim().length ? `${words}…` : words || "New Case";
}
