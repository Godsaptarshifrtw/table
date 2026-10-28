import { Order } from "@/types";

export type KitchenFilter = "active" | "preparing" | "ready" | "all";

export function filterKitchenOrders(
  orders: Order[],
  filter: KitchenFilter
): Order[] {
  switch (filter) {
    case "active":
      return orders.filter(
        (order) =>
          !["ready", "served", "cancelled"].includes(order.status)
      );

    case "preparing":
      return orders.filter(
        (order) =>
          order.status === "preparing" ||
          order.status === "partially_ready"
      );

    case "ready":
      return orders.filter((order) => order.status === "ready");

    case "all":
    default:
      return orders.filter((order) => order.status !== "cancelled");
  }
}

export function getOrderProgress(order: Order): {
  ready: number;
  total: number;
  percentage: number;
} {
  const total = order.items.length;
  const ready = order.items.filter(
    (item) => item.preparationStatus === "ready" ||
              item.preparationStatus === "served"
  ).length;

  return {
    ready,
    total,
    percentage: total === 0 ? 0 : Math.round((ready / total) * 100),
  };
}

export function getElapsedMinutes(createdAt: string | Date): number {
  const createdTime = new Date(createdAt).getTime();

  if (Number.isNaN(createdTime)) return 0;

  return Math.max(
    0,
    Math.floor((Date.now() - createdTime) / 60_000)
  );
}