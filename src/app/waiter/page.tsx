"use client";

import { useEffect, useState } from "react";
import {
  ConciergeBell,
  Utensils,
  Plus,
  Minus,
  CheckCircle2,
  Receipt,
  Search,
  Clock,
  Send,
  CreditCard,
  DollarSign,
  Coffee,
} from "lucide-react";
import { StaffNavbar } from "@/components/StaffNavbar";
import { Table, MenuItem, MenuCategory, Order, TableSession } from "@/types";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

export default function WaiterDashboardPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [activeSession, setActiveSession] = useState<TableSession | null>(null);
  const [sessionOrders, setSessionOrders] = useState<Order[]>([]);

  // Manual ordering drawer
  const [isOrdering, setIsOrdering] = useState(false);
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number; notes?: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Settlement modal
  const [isSettling, setIsSettling] = useState(false);
  const [settleMethod, setSettleMethod] = useState<"cash" | "card">("cash");

  const loadData = async () => {
    try {
      const [tRes, mRes, oRes] = await Promise.all([
        fetch("/api/tables"),
        fetch("/api/menu"),
        fetch("/api/orders"),
      ]);

      const tData = await tRes.json();
      const mData = await mRes.json();
      const oData = await oRes.json();

      if (tData.success) setTables(tData.tables);
      if (mData.success) {
        setMenuItems(mData.menuItems);
        setCategories(mData.categories);
      }
      if (oData.success) setOrders(oData.orders);
    } catch (e) {
      console.error("Waiter POS sync error", e);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectTable = async (table: Table) => {
    setSelectedTable(table);
    if (table.activeSessionId) {
      try {
        const res = await fetch(`/api/sessions?sessionId=${table.activeSessionId}`);
        const data = await res.json();
        if (data.success) {
          setActiveSession(data.session);
          setSessionOrders(data.orders);
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      setActiveSession(null);
      setSessionOrders([]);
    }
  };

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const exist = prev.find((c) => c.item.id === item.id);
      if (exist) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateCartQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.item.id === itemId) {
            const q = c.quantity + delta;
            return q > 0 ? { ...c, quantity: q } : null;
          }
          return c;
        })
        .filter(Boolean) as { item: MenuItem; quantity: number; notes?: string }[]
    );
  };

  const handleWaiterSubmitOrder = async () => {
    if (!selectedTable || cart.length === 0) return;
    try {
      setSubmittingOrder(true);
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: selectedTable.restaurantId,
          tablePublicId: selectedTable.publicId,
          source: "waiter",
          items: cart.map((c) => ({
            menuItemId: c.item.id,
            quantity: c.quantity,
            specialInstructions: c.notes,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCart([]);
        setIsOrdering(false);
        loadData();
        handleSelectTable(selectedTable);
      } else {
        alert(data.error || "Failed to submit waiter order");
      }
    } catch (e) {
      alert("Network error");
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleMarkServed = async (orderId: string, itemId: string) => {
    try {
      await fetch("/api/orders/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          itemId,
          newStatus: "served",
          staffId: "waiter_01",
        }),
      });
      loadData();
      if (selectedTable) handleSelectTable(selectedTable);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSettleAndClose = async () => {
    if (!activeSession || !selectedTable) return;
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          tableId: selectedTable.id,
          closedByStaffId: "waiter_01",
          paymentMethod: settleMethod,
          paymentStatus: "paid",
          discount: 0,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Bill settled and table marked Available!");
        setIsSettling(false);
        setSelectedTable(null);
        setActiveSession(null);
        setSessionOrders([]);
        loadData();
      } else {
        alert(data.error || "Could not close session");
      }
    } catch (e) {
      alert("Settlement error");
    }
  };

  const filteredMenuItems = menuItems.filter((i) => {
    const matchCat = selectedCategory === "all" || i.categoryId === selectedCategory;
    const matchSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch && i.isAvailable;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <StaffNavbar />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Tables Floor Grid */}
        <div className="lg:w-1/2 p-6 overflow-y-auto border-r border-slate-200">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <ConciergeBell className="w-5 h-5 text-blue-600" />
                Dining Floor & Table Status
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select a table to take new orders or inspect session totals
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
              {tables.length} Tables
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {tables.map((table) => {
              const isSelected = selectedTable?.id === table.id;
              return (
                <button
                  key={table.id}
                  onClick={() => handleSelectTable(table)}
                  className={`p-4 rounded-3xl border text-left flex flex-col justify-between transition-all duration-200 ${
                    isSelected
                      ? "ring-2 ring-blue-600 bg-blue-50/50 border-blue-300 shadow-md"
                      : "bg-white border-slate-200/90 hover:border-blue-300 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-extrabold text-lg text-slate-900 block leading-tight">
                        Table {table.tableNumber}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                        {table.displayName}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        table.status === "available"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : table.status === "occupied"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : table.status === "awaiting_bill"
                          ? "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {table.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">
                      Cap: {table.capacity}
                    </span>
                    {table.activeSessionId ? (
                      <span className="text-blue-600 font-bold">
                        Occupied
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-semibold">Available</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Table Order Details */}
        <div className="lg:w-1/2 p-6 flex flex-col bg-white overflow-y-auto">
          {selectedTable ? (
            <div className="space-y-6">
              {/* Table Status Bar */}
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 flex items-center justify-between shadow-2xs">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-lg text-slate-900">
                      Table {selectedTable.tableNumber}
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">
                      • {selectedTable.displayName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeSession
                      ? `Active dining session • started ${formatRelativeTime(activeSession.openedAt)}`
                      : "No active session currently."}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsOrdering(true)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Punch Order</span>
                  </button>

                  {activeSession && (
                    <button
                      onClick={() => setIsSettling(true)}
                      className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition shadow-2xs"
                    >
                      <Receipt className="w-4 h-4 text-emerald-600" />
                      <span>Settle Bill</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Ready to Serve Alert Banner */}
              {sessionOrders.some((o) => o.items.some((i) => i.preparationStatus === "ready")) && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-emerald-900 shadow-xs">
                  <div className="flex items-center space-x-2 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Kitchen has dishes ready for Table {selectedTable.tableNumber}!</span>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase bg-emerald-600 text-white px-2.5 py-1 rounded-lg">
                    Ready to Serve
                  </span>
                </div>
              )}

              {/* Orders in this Session */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Current Table Tickets ({sessionOrders.length})
                </h4>

                {sessionOrders.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-3xl border border-slate-200 text-xs text-slate-400">
                    No tickets punched for Table {selectedTable.tableNumber} yet.
                    Tap &quot;Punch Order&quot; above to take manual order.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessionOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900">
                              {ord.orderNumber}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {ord.source}
                            </span>
                          </div>
                          <span className="text-slate-400">
                            {formatRelativeTime(ord.createdAt)}
                          </span>
                        </div>

                        <div className="py-3 space-y-2.5">
                          {ord.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                  {item.quantity}x
                                </span>
                                <span className="text-slate-800 font-semibold">
                                  {item.nameSnapshot}
                                </span>
                                {item.specialInstructions && (
                                  <span className="text-[10px] text-amber-700 italic">
                                    ({item.specialInstructions})
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                    item.preparationStatus === "ready"
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                      : item.preparationStatus === "served"
                                      ? "text-slate-400 font-medium"
                                      : "bg-white text-slate-600 border border-slate-200"
                                  }`}
                                >
                                  {item.preparationStatus}
                                </span>

                                {item.preparationStatus === "ready" && (
                                  <button
                                    onClick={() => handleMarkServed(ord.id, item.id)}
                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase rounded-lg transition shadow-2xs"
                                  >
                                    Mark Served
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-slate-200/80 flex justify-between text-xs font-semibold">
                          <span className="text-slate-500">Subtotal</span>
                          <span className="text-slate-900 font-bold">
                            {formatCurrency(ord.total)}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Session Grand Total */}
                    {activeSession && (
                      <div className="bg-blue-50/80 border border-blue-200 rounded-3xl p-5 flex items-center justify-between shadow-2xs">
                        <div>
                          <span className="text-slate-600 text-xs font-semibold block">Session Grand Total</span>
                          <span className="text-xs text-slate-400">
                            Includes calculated tax & all placed orders
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-extrabold text-blue-700 block">
                            {formatCurrency(activeSession.total)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-20 text-slate-400">
              <Utensils className="w-12 h-12 stroke-[1.5] mb-3 text-slate-300" />
              <h3 className="text-sm font-bold text-slate-700">
                No Table Selected
              </h3>
              <p className="text-xs max-w-xs mt-1">
                Pick a dining table from the floor overview on the left to punch orders or manage customer billing.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Manual Waiter Ordering Modal */}
      {isOrdering && selectedTable && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Waiter POS: Table {selectedTable.tableNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Select menu dishes to punch directly to the kitchen line
                </p>
              </div>
              <button
                onClick={() => setIsOrdering(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 flex gap-2 border-b border-slate-100">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Quick search dishes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 transition"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Menu list */}
              <div className="w-3/5 p-3 overflow-y-auto space-y-2 border-r border-slate-100">
                {filteredMenuItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-white border border-slate-200/90 flex items-center justify-between hover:border-blue-300 transition shadow-2xs"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {item.name}
                      </h4>
                      <span className="text-[11px] text-blue-600 font-extrabold">
                        {formatCurrency(item.price)}
                      </span>
                    </div>
                    <button
                      onClick={() => addToCart(item)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs shadow-blue-500/20"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>

              {/* Waiter Cart Draft */}
              <div className="w-2/5 p-4 flex flex-col justify-between bg-slate-50/60">
                <div className="flex-1 overflow-y-auto space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Order Draft ({cart.reduce((s, c) => s + c.quantity, 0)})
                  </h4>
                  {cart.length === 0 ? (
                    <p className="text-xs text-slate-400 italic mt-6 text-center">
                      No items added yet.
                    </p>
                  ) : (
                    cart.map((c) => (
                      <div
                        key={c.item.id}
                        className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs shadow-2xs"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-slate-800 font-bold line-clamp-1">
                            {c.item.name}
                          </span>
                          <span className="text-blue-600 font-extrabold">
                            {formatCurrency(c.item.price * c.quantity)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                            <button
                              onClick={() => updateCartQty(c.item.id, -1)}
                              className="w-5 h-5 flex items-center justify-center text-slate-600"
                            >
                              -
                            </button>
                            <span className="w-5 text-center font-bold text-slate-800 text-[11px]">
                              {c.quantity}
                            </span>
                            <button
                              onClick={() => updateCartQty(c.item.id, 1)}
                              className="w-5 h-5 flex items-center justify-center text-slate-600"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <button
                    onClick={handleWaiterSubmitOrder}
                    disabled={cart.length === 0 || submittingOrder}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-sm shadow-blue-500/20 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send to Kitchen</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settle Bill Modal */}
      {isSettling && activeSession && selectedTable && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 text-slate-800 shadow-2xl">
            <h3 className="font-extrabold text-lg text-slate-900 mb-1">
              Settle Table {selectedTable.tableNumber} Bill
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Close dining session and mark table available for new guests.
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 mb-4 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="text-slate-800 font-semibold">{formatCurrency(activeSession.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Tax</span>
                <span className="text-slate-800 font-semibold">{formatCurrency(activeSession.tax)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Due</span>
                <span className="text-blue-600 font-extrabold text-base">
                  {formatCurrency(activeSession.total)}
                </span>
              </div>
            </div>

            <div className="mb-5">
              <label className="text-xs font-bold text-slate-700 mb-2 block">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSettleMethod("cash")}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    settleMethod === "cash"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  Cash Payment
                </button>
                <button
                  type="button"
                  onClick={() => setSettleMethod("card")}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    settleMethod === "card"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Card / POS
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsSettling(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSettleAndClose}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm"
              >
                Confirm Settle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
