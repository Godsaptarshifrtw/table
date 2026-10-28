"use client";

import { CheckCircle2, RefreshCw } from "lucide-react";
import type { Order, ItemPreparationStatus } from "@/types";
import type { KitchenFilter } from "../utils/kitchenUtils";
import { filterKitchenOrders } from "../utils/kitchenUtils";
import OrderTicket from "./OrderTicket";

interface KitchenBoardProps {
  orders: Order[];
  loading: boolean;
  error: string | null;
  filter: KitchenFilter;
  updatingItems: string[];
  onRefresh: () => void;
  onUpdateItemStatus: (
    orderId: string,
    itemId: string,
    status: ItemPreparationStatus
  ) => Promise<boolean>;
}

export default function KitchenBoard({
  orders,
  loading,
  error,
  filter,
  updatingItems,
  onRefresh,
  onUpdateItemStatus,
}: KitchenBoardProps) {
  const visibleOrders = filterKitchenOrders(orders, filter);

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-gray-500">
        <RefreshCw size={18} className="animate-spin" />
        Loading kitchen orders...
      </div>
    );
  }

  return (
    <main className="flex-1 p-4 md:p-6">
      {error && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-red-200 px-3 py-2 font-semibold hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {visibleOrders.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center text-center">
          <CheckCircle2 size={40} className="mb-3 text-emerald-600" />
          <h2 className="text-lg font-bold text-gray-900">
            All clear, Chef!
          </h2>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            No orders match this filter. New orders will appear automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleOrders.map((order) => (
            <OrderTicket
              key={order.id}
              order={order}
              updatingItems={updatingItems}
              onUpdateItemStatus={onUpdateItemStatus}
            />
          ))}
        </div>
      )}
    </main>
  );
}