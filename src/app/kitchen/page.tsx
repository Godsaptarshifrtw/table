"use client";

import { useEffect, useState, useRef } from "react";
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  Maximize2,
  RefreshCw,
  Sparkles,
  Flame,
} from "lucide-react";
import { Order } from "@/types";
import { formatRelativeTime } from "@/lib/utils";
import { StaffNavbar } from "@/components/StaffNavbar";

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filter, setFilter] = useState<"active" | "preparing" | "ready" | "all">("active");
  const previousOrderCount = useRef<number>(0);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (res.ok && data.success) {
        const fetchedOrders: Order[] = data.orders;

        if (
          previousOrderCount.current > 0 &&
          fetchedOrders.length > previousOrderCount.current &&
          soundEnabled
        ) {
          playOrderNotification();
        }
        previousOrderCount.current = fetchedOrders.length;
        setOrders(fetchedOrders);
      }
    } catch (err) {
      console.error("Failed to fetch KDS orders", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, [soundEnabled]);

  const playOrderNotification = () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      // AudioContext policy
    }
  };

  const updateItemStatus = async (
    orderId: string,
    itemId: string,
    newStatus: "pending" | "preparing" | "ready" | "served"
  ) => {
    try {
      const res = await fetch("/api/orders/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          itemId,
          newStatus,
          staffId: "kitchen_staff_01",
        }),
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const activeOrders = orders.filter((o) => {
    if (filter === "active") {
      return o.status === "submitted" || o.status === "acknowledged" || o.status === "preparing" || o.status === "partially_ready";
    }
    if (filter === "ready") return o.status === "ready";
    if (filter === "preparing") return o.status === "preparing" || o.status === "partially_ready";
    return true;
  });

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <StaffNavbar />

      {/* KDS Action Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-slate-900 flex items-center gap-2">
              Kitchen Display Station (KDS)
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
            </h1>
            <p className="text-[11px] text-slate-500">
              Live line tickets • Real-time 3s auto-sync
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Status Filters */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setFilter("active")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === "active" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Active Tickets ({orders.filter((o) => o.status !== "served" && o.status !== "cancelled").length})
            </button>
            <button
              onClick={() => setFilter("ready")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === "ready" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Ready ({orders.filter((o) => o.status === "ready").length})
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === "all" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Orders
            </button>
          </div>

          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              soundEnabled
                ? "bg-blue-50 text-blue-600 border-blue-200 shadow-2xs"
                : "bg-white text-slate-400 border-slate-200"
            }`}
            title="Toggle ticket arrival sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullScreen}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition shadow-2xs"
            title="Full screen kitchen monitor"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Ticket Grid */}
      <main className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-600" /> Connecting to Kitchen stream...
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 text-center">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-3 shadow-xs">
              <CheckCircle2 className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800">All Clear, Chef!</h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              There are no pending tickets currently. Incoming orders will instantly appear and chime here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeOrders.map((order) => {
              const elapsedMins = Math.floor(
                (new Date().getTime() - new Date(order.createdAt).getTime()) / 60000
              );
              const isDelayed = elapsedMins >= 15;

              return (
                <div
                  key={order.id}
                  className={`flex flex-col rounded-3xl border bg-white overflow-hidden transition-all shadow-xs hover:shadow-md ${
                    order.status === "ready"
                      ? "border-emerald-300 ring-2 ring-emerald-500/20"
                      : isDelayed
                      ? "border-red-300 ring-2 ring-red-500/30"
                      : "border-slate-200 hover:border-blue-300"
                  }`}
                >
                  {/* Ticket Header */}
                  <div
                    className={`p-4 flex items-center justify-between border-b ${
                      order.status === "ready"
                        ? "bg-emerald-50/70 border-emerald-100"
                        : isDelayed
                        ? "bg-red-50/80 border-red-100"
                        : "bg-slate-50/80 border-slate-100"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-slate-900">
                          Table {order.tableNumberSnapshot}
                        </span>
                        <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          {order.orderNumber}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                        Source: {order.source.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex flex-col items-end">
                      <div
                        className={`flex items-center space-x-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          isDelayed
                            ? "bg-red-600 text-white animate-pulse"
                            : "bg-white text-slate-700 border border-slate-200"
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>{elapsedMins}m</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        {formatRelativeTime(order.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Special instructions banner */}
                  {order.specialInstructions && (
                    <div className="bg-amber-50 border-b border-amber-200/80 px-3.5 py-2 text-[11px] text-amber-900 flex items-center gap-1.5 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Note: {order.specialInstructions}</span>
                    </div>
                  )}

                  {/* Items List */}
                  <div className="flex-1 p-4 space-y-2.5">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200/80"
                      >
                        <div className="flex-1 pr-2">
                          <div className="flex items-baseline space-x-2">
                            <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-extrabold text-xs flex items-center justify-center shrink-0">
                              {item.quantity}x
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {item.nameSnapshot}
                            </span>
                          </div>

                          {item.specialInstructions && (
                            <p className="text-[10px] text-amber-700 font-semibold mt-1 pl-8">
                              ↳ {item.specialInstructions}
                            </p>
                          )}
                        </div>

                        {/* Status Action Buttons */}
                        <div className="shrink-0 flex items-center">
                          {item.preparationStatus === "pending" && (
                            <button
                              onClick={() => updateItemStatus(order.id, item.id, "preparing")}
                              className="px-2.5 py-1 bg-white hover:bg-blue-600 hover:text-white text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold uppercase transition shadow-2xs"
                            >
                              Prep
                            </button>
                          )}

                          {item.preparationStatus === "preparing" && (
                            <button
                              onClick={() => updateItemStatus(order.id, item.id, "ready")}
                              className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-emerald-600 hover:text-white border border-blue-200 rounded-lg text-[10px] font-bold uppercase transition shadow-2xs"
                            >
                              Ready
                            </button>
                          )}

                          {item.preparationStatus === "ready" && (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 shadow-2xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Ready
                            </span>
                          )}

                          {item.preparationStatus === "served" && (
                            <span className="text-[10px] font-semibold text-slate-400">
                              Served
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-500 capitalize">
                      Ticket: <strong className="text-slate-900 font-bold">{order.status.replace("_", " ")}</strong>
                    </span>

                    {order.status !== "ready" && order.status !== "served" && (
                      <button
                        onClick={async () => {
                          for (const it of order.items) {
                            if (it.preparationStatus !== "ready" && it.preparationStatus !== "served") {
                              await updateItemStatus(order.id, it.id, "ready");
                            }
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm shadow-blue-500/20"
                      >
                        All Ready
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
