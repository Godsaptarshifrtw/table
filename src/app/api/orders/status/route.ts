import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/serverStore";
import { UpdateItemStatusSchema, UpdateOrderStatusSchema } from "@/lib/validation";
import { OrderOverallStatus } from "@/types";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const store = getStore();

    // 1. Update individual item preparation status (e.g. from Kitchen or Waiter)
    if ("itemId" in body) {
      const parsed = UpdateItemStatusSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: "Invalid item status update", details: parsed.error.format() },
          { status: 400 }
        );
      }

      const { orderId, itemId, newStatus, staffId } = parsed.data;
      const order = store.orders.find((o) => o.id === orderId);
      if (!order) {
        return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
      }

      const item = order.items.find((i) => i.id === itemId);
      if (!item) {
        return NextResponse.json({ success: false, error: "Item not found in order" }, { status: 404 });
      }

      item.preparationStatus = newStatus;
      if (newStatus === "ready") {
        item.preparedAt = new Date().toISOString();
      } else if (newStatus === "served") {
        item.servedAt = new Date().toISOString();
      }

      // Re-evaluate overall order status based on all item statuses
      const statuses = order.items.map((i) => i.preparationStatus);
      const allServed = statuses.every((s) => s === "served" || s === "cancelled");
      const allReadyOrServed = statuses.every((s) => s === "ready" || s === "served" || s === "cancelled");
      const someReady = statuses.some((s) => s === "ready");
      const somePreparing = statuses.some((s) => s === "preparing");

      let derivedOverallStatus: OrderOverallStatus = order.status;
      if (allServed) {
        derivedOverallStatus = "served";
        order.servedAt = new Date().toISOString();
      } else if (allReadyOrServed) {
        derivedOverallStatus = "ready";
        order.readyAt = new Date().toISOString();
      } else if (someReady) {
        derivedOverallStatus = "partially_ready";
      } else if (somePreparing) {
        derivedOverallStatus = "preparing";
        if (!order.preparingAt) order.preparingAt = new Date().toISOString();
      }

      order.status = derivedOverallStatus;
      order.updatedAt = new Date().toISOString();

      store.auditLogs.push({
        id: `log_${Date.now()}`,
        restaurantId: store.restaurant.id,
        actorId: staffId || "kitchen_or_waiter",
        action: "item_status_updated",
        resourceType: "order",
        resourceId: order.id,
        metadata: { itemId, newStatus, derivedOverallStatus },
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: "Item status updated",
        order,
      });
    }

    // 2. Direct overall order status update (e.g. acknowledge or cancel)
    const parsedOrder = UpdateOrderStatusSchema.safeParse(body);
    if (!parsedOrder.success) {
      return NextResponse.json(
        { success: false, error: "Invalid order status update", details: parsedOrder.error.format() },
        { status: 400 }
      );
    }

    const { orderId, status } = parsedOrder.data;
    const order = store.orders.find((o) => o.id === orderId);
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    order.status = status;
    const nowIso = new Date().toISOString();
    if (status === "acknowledged") order.acceptedAt = nowIso;
    if (status === "preparing") order.preparingAt = nowIso;
    if (status === "ready") order.readyAt = nowIso;
    if (status === "served") order.servedAt = nowIso;
    if (status === "cancelled") order.cancelledAt = nowIso;
    order.updatedAt = nowIso;

    return NextResponse.json({
      success: true,
      message: "Order status updated",
      order,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
