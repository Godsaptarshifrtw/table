import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/serverStore";
import { CreateOrderRequestSchema } from "@/lib/validation";
import { Order, OrderItem, TableSession } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = CreateOrderRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { tablePublicId, items, source, specialInstructions, idempotencyKey } = parseResult.data;
    const store = getStore();

    // 1. Idempotency check: prevent duplicate submissions
    if (idempotencyKey) {
      const existing = store.orders.find((o) => o.idempotencyKey === idempotencyKey);
      if (existing) {
        return NextResponse.json({
          success: true,
          message: "Order already placed (idempotent reply)",
          order: existing,
        });
      }
    }

    // 2. Validate table
    const table = store.tables.find((t) => t.publicId === tablePublicId && t.isActive);
    if (!table) {
      return NextResponse.json(
        { success: false, error: "Invalid table or table is not active" },
        { status: 404 }
      );
    }

    // 3. Find or establish authorized table session
    let session = table.activeSessionId
      ? store.sessions.find((s) => s.id === table.activeSessionId && s.status !== "closed")
      : null;

    if (!session) {
      // Create new session
      const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      session = {
        id: newSessionId,
        restaurantId: table.restaurantId,
        tableId: table.id,
        tableNumberSnapshot: table.tableNumber,
        status: "open",
        assignedWaiterId: table.assignedWaiterId || null,
        openedAt: new Date().toISOString(),
        subtotal: 0,
        discount: 0,
        tax: 0,
        total: 0,
        paymentStatus: "pending",
        createdBy: source === "qr" ? "qr_customer" : "waiter",
        orderCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.sessions.push(session);
      table.activeSessionId = newSessionId;
      table.status = "occupied";
      table.updatedAt = new Date().toISOString();
    }

    // 4. Validate requested items against trusted backend menu data & snapshot prices
    const validatedItems: OrderItem[] = [];
    let calculatedSubtotal = 0;

    for (const reqItem of items) {
      const menuItem = store.menuItems.find((m) => m.id === reqItem.menuItemId);
      if (!menuItem) {
        return NextResponse.json(
          { success: false, error: `Menu item with id ${reqItem.menuItemId} does not exist.` },
          { status: 400 }
        );
      }
      if (!menuItem.isAvailable) {
        return NextResponse.json(
          { success: false, error: `Item "${menuItem.name}" is currently sold out / unavailable.` },
          { status: 400 }
        );
      }

      const lineTotal = Number((menuItem.price * reqItem.quantity).toFixed(2));
      calculatedSubtotal += lineTotal;

      validatedItems.push({
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        menuItemId: menuItem.id,
        nameSnapshot: menuItem.name,
        priceSnapshot: menuItem.price, // Immutable price snapshot
        quantity: reqItem.quantity,
        lineTotal,
        specialInstructions: reqItem.specialInstructions?.trim() || undefined,
        preparationStatus: "pending",
      });
    }

    // 5. Calculate tax & totals based on restaurant tax rate
    const taxRate = store.restaurant.taxRate || 0.08;
    const taxAmount = Number((calculatedSubtotal * taxRate).toFixed(2));
    const totalAmount = Number((calculatedSubtotal + taxAmount).toFixed(2));

    const orderNumber = `#${store.orders.length + 101}`;
    const newOrder: Order = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      restaurantId: store.restaurant.id,
      tableId: table.id,
      tableNumberSnapshot: table.tableNumber,
      sessionId: session.id,
      orderNumber,
      source,
      status: "submitted",
      items: validatedItems,
      subtotal: calculatedSubtotal,
      discount: 0,
      tax: taxAmount,
      total: totalAmount,
      specialInstructions: specialInstructions?.trim() || undefined,
      createdBy: source === "qr" ? "customer" : "waiter",
      idempotencyKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.orders.push(newOrder);

    // Update session aggregates atomically
    session.subtotal = Number((session.subtotal + calculatedSubtotal).toFixed(2));
    session.tax = Number((session.tax + taxAmount).toFixed(2));
    session.total = Number((session.total + totalAmount).toFixed(2));
    session.orderCount = (session.orderCount || 0) + 1;
    session.updatedAt = new Date().toISOString();

    // Audit log
    store.auditLogs.push({
      id: `log_${Date.now()}`,
      restaurantId: store.restaurant.id,
      actorId: source === "qr" ? "customer" : "waiter",
      action: "order_created",
      resourceType: "order",
      resourceId: newOrder.id,
      metadata: {
        orderNumber,
        tableNumber: table.tableNumber,
        total: totalAmount,
        itemCount: validatedItems.length,
      },
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Order placed successfully!",
      order: newOrder,
      session,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tableId = searchParams.get("tableId");
    const sessionId = searchParams.get("sessionId");
    const status = searchParams.get("status");

    const store = getStore();
    let result = [...store.orders];

    if (tableId) {
      result = result.filter((o) => o.tableId === tableId);
    }
    if (sessionId) {
      result = result.filter((o) => o.sessionId === sessionId);
    }
    if (status) {
      result = result.filter((o) => o.status === status);
    }

    // Sort newest first
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      orders: result,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
