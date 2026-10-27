import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/serverStore";
import { BillRequestSchema, CloseSessionSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const tableId = searchParams.get("tableId");

    const store = getStore();

    if (sessionId) {
      const session = store.sessions.find((s) => s.id === sessionId);
      if (!session) {
        return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
      }
      const sessionOrders = store.orders.filter((o) => o.sessionId === sessionId);
      return NextResponse.json({ success: true, session, orders: sessionOrders });
    }

    if (tableId) {
      const table = store.tables.find((t) => t.id === tableId);
      const activeSession = table?.activeSessionId
        ? store.sessions.find((s) => s.id === table.activeSessionId)
        : null;
      const orders = activeSession
        ? store.orders.filter((o) => o.sessionId === activeSession.id)
        : [];
      return NextResponse.json({ success: true, table, session: activeSession, orders });
    }

    return NextResponse.json({ success: true, sessions: store.sessions });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// Customer or Waiter requests bill
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = BillRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { sessionId, paymentMethod } = parsed.data;
    const store = getStore();
    const session = store.sessions.find((s) => s.id === sessionId);
    if (!session) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
    }

    session.status = "bill_requested";
    session.paymentMethod = paymentMethod;
    session.updatedAt = new Date().toISOString();

    const table = store.tables.find((t) => t.id === session.tableId);
    if (table) {
      table.status = "awaiting_bill";
      table.updatedAt = new Date().toISOString();
    }

    return NextResponse.json({
      success: true,
      message: "Bill requested successfully. Staff notified.",
      session,
      table,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// Authorized closing of table session and settling the bill
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CloseSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { sessionId, tableId, closedByStaffId, paymentMethod, paymentStatus, discount } = parsed.data;
    const store = getStore();

    const session = store.sessions.find((s) => s.id === sessionId);
    if (!session) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
    }

    const table = store.tables.find((t) => t.id === tableId);
    if (!table) {
      return NextResponse.json({ success: false, error: "Table not found" }, { status: 404 });
    }

    // Business rule: Check if there are active unserved orders still in prep
    const sessionOrders = store.orders.filter((o) => o.sessionId === sessionId);
    const hasUnresolvedOrders = sessionOrders.some(
      (o) => o.status === "submitted" || o.status === "preparing" || o.status === "partially_ready"
    );

    if (hasUnresolvedOrders) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot close table session: There are still items being prepared by the kitchen.",
        },
        { status: 400 }
      );
    }

    // Close session atomically
    session.discount = discount || 0;
    session.total = Math.max(0, Number((session.subtotal + session.tax - session.discount).toFixed(2)));
    session.status = "closed";
    session.paymentStatus = paymentStatus;
    session.paymentMethod = paymentMethod;
    session.closedAt = new Date().toISOString();
    session.closedBy = closedByStaffId;
    session.updatedAt = new Date().toISOString();

    // Mark table available and clear activeSessionId
    table.status = "available";
    table.activeSessionId = null;
    table.updatedAt = new Date().toISOString();

    // Record audit log
    store.auditLogs.push({
      id: `log_${Date.now()}`,
      restaurantId: store.restaurant.id,
      actorId: closedByStaffId,
      action: "session_closed_and_settled",
      resourceType: "session",
      resourceId: session.id,
      metadata: {
        tableNumber: session.tableNumberSnapshot,
        finalTotal: session.total,
        paymentMethod,
        paymentStatus,
      },
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Session closed and settled successfully. Table is now available.",
      session,
      table,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
