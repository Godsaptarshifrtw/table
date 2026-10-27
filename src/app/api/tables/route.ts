import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/serverStore";
import { TableManagementSchema } from "@/lib/validation";
import { Table } from "@/types";

export async function GET() {
  try {
    const store = getStore();

    // Enrich table info with current active session totals & item count
    const enrichedTables = store.tables.map((table) => {
      const activeSession = table.activeSessionId
        ? store.sessions.find((s) => s.id === table.activeSessionId)
        : null;

      const activeOrders = activeSession
        ? store.orders.filter((o) => o.sessionId === activeSession.id && o.status !== "cancelled")
        : [];

      return {
        ...table,
        activeSession: activeSession || null,
        activeOrdersCount: activeOrders.length,
        currentSessionTotal: activeSession ? activeSession.total : 0,
        sessionStartTime: activeSession ? activeSession.openedAt : null,
      };
    });

    return NextResponse.json({
      success: true,
      tables: enrichedTables,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = TableManagementSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const store = getStore();
    const { tableNumber, displayName, capacity, assignedWaiterId, assignedWaiterName } = parsed.data;

    // Check duplicate table number
    const existing = store.tables.find((t) => t.tableNumber === tableNumber && t.isActive);
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Table number ${tableNumber} already exists.` },
        { status: 400 }
      );
    }

    const publicId = `tbl_pub_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const newTable: Table = {
      id: `tbl_${Date.now()}`,
      restaurantId: store.restaurant.id,
      tableNumber,
      displayName,
      capacity,
      publicId,
      status: "available",
      assignedWaiterId: assignedWaiterId || null,
      assignedWaiterName: assignedWaiterName || null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.tables.push(newTable);

    store.auditLogs.push({
      id: `log_${Date.now()}`,
      restaurantId: store.restaurant.id,
      actorId: "admin",
      action: "table_created",
      resourceType: "table",
      resourceId: newTable.id,
      metadata: { tableNumber, displayName },
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Table created successfully",
      table: newTable,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { tableId, status, assignedWaiterId, assignedWaiterName, capacity, displayName } = body;

    if (!tableId) {
      return NextResponse.json({ success: false, error: "tableId is required" }, { status: 400 });
    }

    const store = getStore();
    const table = store.tables.find((t) => t.id === tableId);
    if (!table) {
      return NextResponse.json({ success: false, error: "Table not found" }, { status: 404 });
    }

    if (status) table.status = status;
    if (assignedWaiterId !== undefined) table.assignedWaiterId = assignedWaiterId;
    if (assignedWaiterName !== undefined) table.assignedWaiterName = assignedWaiterName;
    if (capacity) table.capacity = capacity;
    if (displayName) table.displayName = displayName;
    table.updatedAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      message: "Table updated successfully",
      table,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
