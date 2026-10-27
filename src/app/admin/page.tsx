"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  UtensilsCrossed,
  DollarSign,
  TrendingUp,
  Clock,
  QrCode,
  Plus,
  Users,
  CheckCircle,
  AlertCircle,
  FileText,
  Filter,
} from "lucide-react";
import { StaffNavbar } from "@/components/StaffNavbar";
import { TableQRModal } from "@/components/TableQRModal";
import { Table, Order, TableSession, MenuItem, MenuCategory } from "@/types";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

export default function AdminDashboardPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // QR Modal
  const [qrModalTable, setQrModalTable] = useState<Table | null>(null);

  // New Table Modal
  const [isNewTableOpen, setIsNewTableOpen] = useState(false);
  const [newTableNum, setNewTableNum] = useState("");
  const [newTableDisplayName, setNewTableDisplayName] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState(4);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"overview" | "tables" | "menu" | "orders">("overview");

  const loadData = async () => {
    try {
      const [tRes, oRes, mRes] = await Promise.all([
        fetch("/api/tables"),
        fetch("/api/orders"),
        fetch("/api/menu"),
      ]);
      const tData = await tRes.json();
      const oData = await oRes.json();
      const mData = await mRes.json();

      if (tData.success) setTables(tData.tables);
      if (oData.success) setOrders(oData.orders);
      if (mData.success) {
        setMenuItems(mData.menuItems);
        setCategories(mData.categories);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Summary Metrics
  const totalTables = tables.length;
  const availableTables = tables.filter((t) => t.status === "available").length;
  const occupiedTables = tables.filter((t) => t.status === "occupied").length;
  const awaitingBillTables = tables.filter((t) => t.status === "awaiting_bill").length;

  const activeOrders = orders.filter(
    (o) => o.status !== "served" && o.status !== "cancelled"
  );
  const preparingOrders = orders.filter(
    (o) => o.status === "preparing" || o.status === "partially_ready"
  );
  const readyOrders = orders.filter((o) => o.status === "ready");

  const todaySales = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.total, 0);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNum || !newTableDisplayName) return;

    try {
      const res = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber: newTableNum,
          displayName: newTableDisplayName,
          capacity: Number(newTableCapacity),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsNewTableOpen(false);
        setNewTableNum("");
        setNewTableDisplayName("");
        loadData();
      } else {
        alert(data.error || "Failed to create table");
      }
    } catch (err) {
      alert("Error creating table");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <StaffNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              Executive Operations & Analytics Hub
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Live monitoring across QR customer ordering, dining occupancy & kitchen fulfillment
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNewTableOpen(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Dining Table</span>
            </button>
          </div>
        </div>

        {/* Live Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Today&apos;s Revenue</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">
              {formatCurrency(todaySales)}
            </div>
            <div className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Live sales transactions
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Table Occupancy</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">
              {occupiedTables} / {totalTables}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {availableTables} available • {awaitingBillTables} bill called
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Active Kitchen Tickets</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">
              {activeOrders.length}
            </div>
            <div className="text-[11px] font-semibold text-amber-600 mt-1">
              {preparingOrders.length} currently cooking
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Dishes Ready to Serve</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-indigo-600 mt-2">
              {readyOrders.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Awaiting server delivery
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 space-x-6 text-xs font-bold mb-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3.5 transition-all border-b-2 ${
              activeTab === "overview"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Floor Occupancy
          </button>
          <button
            onClick={() => setActiveTab("tables")}
            className={`pb-3.5 transition-all border-b-2 ${
              activeTab === "tables"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Table Management & QR ({tables.length})
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`pb-3.5 transition-all border-b-2 ${
              activeTab === "orders"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Orders Audit Log ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("menu")}
            className={`pb-3.5 transition-all border-b-2 ${
              activeTab === "menu"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Menu Items Catalog ({menuItems.length})
          </button>
        </div>

        {/* Tab 1: Floor Occupancy */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tables.map((table) => {
              const tableOrders = orders.filter(
                (o) => o.tableId === table.id && o.status !== "served" && o.status !== "cancelled"
              );
              return (
                <div
                  key={table.id}
                  className="bg-white border border-slate-200/90 rounded-3xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-blue-300 transition duration-200"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-base text-slate-900">
                        Table {table.tableNumber}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
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
                    <p className="text-xs text-slate-500 mt-1">
                      {table.displayName} • Cap {table.capacity}
                    </p>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">
                        Active Tickets
                      </span>
                      <span className="font-bold text-slate-800">
                        {tableOrders.length} tickets
                      </span>
                    </div>

                    <button
                      onClick={() => setQrModalTable(table)}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200 transition"
                      title="Inspect Table QR Code"
                    >
                      <QrCode className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Table Management & QR Codes */}
        {activeTab === "tables" && (
          <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Registered Dining Tables
                </h3>
                <p className="text-xs text-slate-400">
                  Each table contains an opaque cryptographically assigned URL token
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="py-3.5 px-5">Table #</th>
                    <th className="py-3.5 px-5">Name</th>
                    <th className="py-3.5 px-5">Capacity</th>
                    <th className="py-3.5 px-5">Public QR Token</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tables.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-5 font-bold text-slate-900">
                        Table {t.tableNumber}
                      </td>
                      <td className="py-3.5 px-5 text-slate-700 font-medium">
                        {t.displayName}
                      </td>
                      <td className="py-3.5 px-5 text-slate-500">{t.capacity} guests</td>
                      <td className="py-3.5 px-5 font-mono text-[11px] text-blue-600 bg-blue-50/40 px-2 py-0.5 rounded">
                        {t.publicId}
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            t.status === "available"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => setQrModalTable(t)}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs inline-flex items-center gap-1.5 transition border border-blue-200"
                        >
                          <QrCode className="w-3.5 h-3.5 text-blue-600" />
                          View QR
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: All Orders Log */}
        {activeTab === "orders" && (
          <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Orders Ledger & Transactions
                </h3>
                <p className="text-xs text-slate-400">
                  Real-time history sorted by newest arrival
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="py-3.5 px-5">Order #</th>
                    <th className="py-3.5 px-5">Table</th>
                    <th className="py-3.5 px-5">Source</th>
                    <th className="py-3.5 px-5">Dishes Summary</th>
                    <th className="py-3.5 px-5">Total</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5">Placed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-5 font-mono font-bold text-blue-600">
                        {o.orderNumber}
                      </td>
                      <td className="py-3.5 px-5 text-slate-900 font-semibold">
                        Table {o.tableNumberSnapshot}
                      </td>
                      <td className="py-3.5 px-5 uppercase text-[10px] font-bold text-slate-500">
                        {o.source}
                      </td>
                      <td className="py-3.5 px-5 text-slate-700">
                        {o.items.map((i) => `${i.quantity}x ${i.nameSnapshot}`).join(", ")}
                      </td>
                      <td className="py-3.5 px-5 font-extrabold text-slate-900">
                        {formatCurrency(o.total)}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-100 text-slate-700 border border-slate-200">
                          {o.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-slate-400">
                        {formatRelativeTime(o.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Menu Items */}
        {activeTab === "menu" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200/90 rounded-3xl p-4 flex gap-3.5 shadow-xs hover:shadow-md hover:border-blue-300 transition duration-200"
              >
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-18 h-18 rounded-2xl object-cover bg-slate-100 shrink-0 border border-slate-100 shadow-inner"
                  />
                )}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">
                      {item.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                    <span className="font-extrabold text-xs text-blue-600">
                      {formatCurrency(item.price)}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold uppercase border border-emerald-200">
                      Available
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Modal */}
      {qrModalTable && (
        <TableQRModal
          isOpen={!!qrModalTable}
          onClose={() => setQrModalTable(null)}
          tableNumber={qrModalTable.tableNumber}
          publicId={qrModalTable.publicId}
          displayName={qrModalTable.displayName}
        />
      )}

      {/* Add New Table Modal */}
      {isNewTableOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 text-slate-800 shadow-2xl">
            <h3 className="font-extrabold text-base text-slate-900 mb-1">
              Add New Dining Table
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Instantly generates an opaque QR code for contactless customer ordering.
            </p>

            <form onSubmit={handleCreateTable} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Table Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 06"
                  required
                  value={newTableNum}
                  onChange={(e) => setNewTableNum(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Display / Location Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Terrace Corner"
                  required
                  value={newTableDisplayName}
                  onChange={(e) => setNewTableDisplayName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Seating Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 transition"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewTableOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm shadow-blue-500/20"
                >
                  Create Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
