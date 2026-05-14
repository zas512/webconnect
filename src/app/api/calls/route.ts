import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Call from "@/models/Call";
import type {
  CallApiRow,
  CallDashboardResponse,
  CallDirection,
  CallRecordStatus,
} from "@/types/call";

type CreateCallBody = {
  sessionId: string;
  phoneNumber: string;
  direction: CallDirection;
  outcome: CallRecordStatus;
  cause?: string;
  hangupBy?: string;
  extensionId: string;
  userName?: string;
  wasHold?: boolean;
  wasMuted?: boolean;
  durationSeconds: number;
  dialedAt: string;
  connectedAt?: string | null;
  endedAt: string;
};

function isRecordStatus(s: string): s is CallRecordStatus {
  return ["ended", "failed", "cancelled", "no_answer"].includes(s);
}

function isDirection(s: string): s is CallDirection {
  return s === "incoming" || s === "outgoing";
}

function serializeCall(doc: {
  _id: unknown;
  sessionId: string;
  phoneNumber: string;
  direction: CallDirection;
  outcome: CallRecordStatus;
  cause: string;
  hangupBy: string;
  extensionId: string;
  userName: string;
  wasHold: boolean;
  wasMuted: boolean;
  durationSeconds: number;
  dialedAt: Date;
  connectedAt?: Date | null;
  endedAt: Date;
  createdAt: Date;
}): CallApiRow {
  return {
    id: String(doc._id),
    sessionId: doc.sessionId,
    phoneNumber: doc.phoneNumber,
    direction: doc.direction,
    outcome: doc.outcome,
    cause: doc.cause,
    hangupBy: doc.hangupBy,
    extensionId: doc.extensionId,
    userName: doc.userName,
    wasHold: doc.wasHold,
    wasMuted: doc.wasMuted,
    durationSeconds: doc.durationSeconds,
    dialedAt: doc.dialedAt.toISOString(),
    connectedAt: doc.connectedAt ? doc.connectedAt.toISOString() : null,
    endedAt: doc.endedAt.toISOString(),
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const docs = await Call.find({ user: session.user.id })
      .sort({ dialedAt: -1 })
      .lean();

    const total = docs.length;
    const incoming = docs.filter((d) => d.direction === "incoming").length;
    const outgoing = docs.filter((d) => d.direction === "outgoing").length;
    const uniqueClients = new Set(docs.map((d) => d.phoneNumber)).size;

    const calls: CallApiRow[] = docs.map((d) =>
      serializeCall({
        _id: d._id,
        sessionId: d.sessionId,
        phoneNumber: d.phoneNumber,
        direction: d.direction,
        outcome: d.outcome,
        cause: d.cause,
        hangupBy: d.hangupBy,
        extensionId: d.extensionId,
        userName: d.userName,
        wasHold: d.wasHold,
        wasMuted: d.wasMuted,
        durationSeconds: d.durationSeconds,
        dialedAt: d.dialedAt,
        connectedAt: d.connectedAt,
        endedAt: d.endedAt,
        createdAt: d.createdAt,
      }),
    );

    const payload: CallDashboardResponse = {
      stats: { total, incoming, outgoing, uniqueClients },
      calls,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("List calls error:", error);
    return NextResponse.json(
      { error: "Failed to load calls" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as CreateCallBody;

    if (
      typeof body.sessionId !== "string" ||
      typeof body.phoneNumber !== "string" ||
      typeof body.extensionId !== "string" ||
      typeof body.durationSeconds !== "number" ||
      typeof body.dialedAt !== "string" ||
      typeof body.endedAt !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    if (!isDirection(body.direction)) {
      return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
    }

    if (!isRecordStatus(body.outcome)) {
      return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
    }

    const dialedAt = new Date(body.dialedAt);
    const endedAt = new Date(body.endedAt);
    const connectedAt = body.connectedAt
      ? new Date(body.connectedAt)
      : undefined;

    if (Number.isNaN(dialedAt.getTime()) || Number.isNaN(endedAt.getTime())) {
      return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
    }

    if (connectedAt && Number.isNaN(connectedAt.getTime())) {
      return NextResponse.json(
        { error: "Invalid connectedAt" },
        { status: 400 },
      );
    }

    await connectDB();

    const doc = await Call.create({
      user: session.user.id,
      sessionId: body.sessionId,
      phoneNumber: body.phoneNumber,
      direction: body.direction,
      outcome: body.outcome,
      cause: body.cause ?? "",
      hangupBy: body.hangupBy ?? "",
      extensionId: body.extensionId,
      userName: body.userName ?? "",
      wasHold: Boolean(body.wasHold),
      wasMuted: Boolean(body.wasMuted),
      durationSeconds: Math.max(0, Math.floor(body.durationSeconds)),
      dialedAt,
      connectedAt,
      endedAt,
    });

    return NextResponse.json(
      { id: doc._id.toString(), message: "Call saved" },
      { status: 201 },
    );
  } catch (error) {
    console.error("Save call error:", error);
    return NextResponse.json({ error: "Failed to save call" }, { status: 500 });
  }
}
