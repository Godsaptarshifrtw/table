"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import type { Order, ItemPreparationStatus } from "@/types";
import { getElapsedMinutes, getOrderProgress } from "../utils/kitchenUtils";

interface OrderTicketProps {
  order: Order;
  updatingItems: string[];
  onUpdateItemStatus: (
    orderId: string,
    itemId: string,
    status: ItemPreparationStatus
  ) => Promise<boolean>;
}

export default function OrderTicket({
  order,
  updatingItems,
  onUpdateItemStatus,
}: OrderTicketProps) {
  const [completingAll, setCompletingAll] = useState(false);

  const elapsedMinutes = getElapsedMinutes(order.createdAt);
  const isDelayed = elapsedMinutes >= 15;
  const progress = getOrderProgress(order);

  const handleMarkAllReady = async () => {
    setCompletingAll(true);

    try {
      for (const item of order.items) {
        if (
          item.preparationStatus === "pending" ||
          item.preparationStatus === "preparing"
        ) {
          const success = await onUpdateItemStatus(
            order.id,
            item.id,
            "ready"
          );

          if (!success) break;
        }
      }
    } finally {
      setCompletingAll(false);
    }
  };

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm ${
        order.status === "ready"
          ? "border-emerald-300"
          : isDelayed
            ? "border-red-300"
            : "border-gray-200"
      }`}
    >
      <header
        className={`flex items-center justify-between gap-3 border-b p-4 ${
          order.status === "ready"
            ? "bg-emerald-50"
            : isDelayed
              ? "bg-red-50"
              : "bg-gray-50"
        }`}
      >
        <div>
          <h3 className="font-bold text-gray-900">
            Table {order.tableNumberSnapshot}
          </h3>
          <p className="mt-1 text-xs font-semibold text-blue-700">
            {order.orderNumber} · {order.source.toUpperCase()}
          </p>
        </div>

        <div
          className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
            isDelayed
              ? "bg-red-600 text-white"
              : "bg-white text-gray-700"
          }`}
        >
          <Clock size={13} />
          {elapsedMinutes}m
        </div>
      </header>

      {order.specialInstructions && (
        <div className="flex gap-2 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{order.specialInstructions}</span>
        </div>
      )}

      <div className="flex-1 space-y-3 p-4">
        <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
          <span>Preparation progress</span>
          <span>
            {progress.ready}/{progress.total} items ready
          </span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        {order.items.map((item) => {
          const updateKey = `${order.id}:${item.id}`;
          const isUpdating = updatingItems.includes(updateKey);

          return (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3"
            >
              <div className="flex min-w-0 gap-2">
                <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-blue-100 px-1 text-xs font-bold text-blue-800">
                  {item.quantity}×
                </span>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {item.nameSnapshot}
                  </p>

                  {item.specialInstructions && (
                    <p className="mt-1 text-xs text-amber-700">
                      Note: {item.specialInstructions}
                    </p>
                  )}

                  <p className="mt-1 text-xs capitalize text-gray-500">
                    {item.preparationStatus.replace("_", " ")}
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                {isUpdating ? (
                  <Loader2
                    size={18}
                    className="animate-spin text-blue-600"
                  />
                ) : item.preparationStatus === "pending" ? (
                  <button
                    type="button"
                    onClick={() =>
                      void onUpdateItemStatus(order.id, item.id, "preparing")
                    }
                    className="rounded-lg border px-3 py-2 text-xs font-bold hover:bg-blue-50"
                  >
                    Start
                  </button>
                ) : item.preparationStatus === "preparing" ? (
                  <button
                    type="button"
                    onClick={() =>
                      void onUpdateItemStatus(order.id, item.id, "ready")
                    }
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    Ready
                  </button>
                ) : item.preparationStatus === "ready" ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                    <CheckCircle2 size={15} />
                    Ready
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-gray-500">
                    {item.preparationStatus === "served"
                      ? "Served"
                      : "Cancelled"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 p-3">
        <span className="text-xs capitalize text-gray-600">
          {order.status.replace("_", " ")}
        </span>

        {order.items.some(
          (item) =>
            item.preparationStatus === "pending" ||
            item.preparationStatus === "preparing"
        ) && (
          <button
            type="button"
            disabled={completingAll}
            onClick={() => void handleMarkAllReady()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {completingAll && <Loader2 size={14} className="animate-spin" />}
            All Ready
          </button>
        )}
      </footer>
    </article>
  );
}