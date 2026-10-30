"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Order, ItemPreparationStatus } from "@/types";
import { useAuth } from "@/context/AuthContext";

export function useKitchenOrders(soundEnabled: boolean) {
  const { staff } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingItems, setUpdatingItems] = useState<string[]>([]);

  const previousOrderIds = useRef<Set<string> | null>(null);
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch("/api/orders", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load orders");
      }

      const fetchedOrders: Order[] = data.orders;

      if (previousOrderIds.current && soundEnabledRef.current) {
        const hasNewOrder = fetchedOrders.some(
          (order) =>
            !previousOrderIds.current!.has(order.id) &&
            order.status !== "cancelled"
        );

        if (hasNewOrder) {
          window.dispatchEvent(new CustomEvent("kitchen:new-order"));
        }
      }

      previousOrderIds.current = new Set(
        fetchedOrders.map((order) => order.id)
      );

      setOrders(fetchedOrders);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();

    const interval = window.setInterval(() => {
      void fetchOrders();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [fetchOrders]);

  const updateItemStatus = useCallback(
    async (
      orderId: string,
      itemId: string,
      newStatus: ItemPreparationStatus
    ): Promise<boolean> => {
      if (!staff?.id) {
        setError("Please log in before updating order status.");
        return false;
      }

      const updateKey = `${orderId}:${itemId}`;

      setUpdatingItems((current) =>
        current.includes(updateKey) ? current : [...current, updateKey]
      );

      try {
        const response = await fetch("/api/orders/status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            itemId,
            newStatus,
            staffId: staff.id,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to update item status");
        }

        await fetchOrders();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update item status"
        );
        return false;
      } finally {
        setUpdatingItems((current) =>
          current.filter((key) => key !== updateKey)
        );
      }
    },
    [staff, fetchOrders]
  );

  return {
    orders,
    loading,
    error,
    updatingItems,
    fetchOrders,
    updateItemStatus,
  };
}