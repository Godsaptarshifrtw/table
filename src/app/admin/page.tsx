"use client";

import { useEffect, useState, useMemo } from "react";
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
  Search,
  ExternalLink,
  ChevronRight,
  Flame,
  ChefHat,
  BellRing,
  CheckCircle2,
  XCircle,
  X,
  CreditCard,
  Receipt,
  RotateCcw,
  Sparkles,
  UserCheck,
  Percent,
  Phone,
  Printer,
  Download,
} from "lucide-react";
import { StaffNavbar } from "@/components/StaffNavbar";
import { TableQRModal } from "@/components/TableQRModal";
import { Table, Order, TableSession, MenuItem, MenuCategory, Staff, Restaurant } from "@/types";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { InvoiceReceipt } from "@/components/InvoiceReceipt";

export default function AdminDashboardPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [qrModalTable, setQrModalTable] = useState<Table | null>(null);
  const [isNewTableOpen, setIsNewTableOpen] = useState(false);
  const [selectedTableForDetails, setSelectedTableForDetails] = useState<Table | null>(null);
  const [invoiceModalData, setInvoiceModalData] = useState<{
    table: Table;
    orders: Order[];
    customerPhone?: string | null;
    paymentMethod?: string;
    paymentStatus?: string;
  } | null>(null);

  // New Table Form
  const [newTableNum, setNewTableNum] = useState("");
  const [newTableDisplayName, setNewTableDisplayName] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState(4);

  // Active Tab & Filters
  const [activeTab, setActiveTab] = useState<"floor" | "orders" | "menu" | "tables" | "activity">("floor");
  const [tableFilter, setTableFilter] = useState<"all" | "occupied" | "available" | "awaiting_bill">("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [menuSearchQuery, setMenuSearchQuery] = useState("");
  const [selectedMenuCategory, setSelectedMenuCategory] = useState("all");

  const loadData = async () => {
    try {
      const [tRes, oRes, mRes] = await Promise.all([
        fetch("/api/tables", { cache: "no-store" }),
        fetch("/api/orders", { cache: "no-store" }),
        fetch("/api/menu", { cache: "no-store" }),
      ]);
      const tData = await tRes.json();
      const oData = await oRes.json();
      const mData = await mRes.json();

      if (tData.success) {
        setTables(tData.tables);
        if (tData.restaurant) setRestaurant(tData.restaurant);
      }
      if (oData.success) setOrders(oData.orders);
      if (mData.success) {
        setMenuItems(mData.menuItems);
        setCategories(mData.categories);
      }
    } catch (e) {
      console.error("Failed to load admin dashboard data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, []);

  // Summary Metrics
  const totalTables = tables.length;
  const availableTables = tables.filter((t) => t.status === "available").length;
  const occupiedTables = tables.filter((t) => t.status === "occupied").length;
  const awaitingBillTables = tables.filter((t) => t.status === "awaiting_bill").length;
  const occupancyPercentage = totalTables > 0 ? Math.round(((totalTables - availableTables) / totalTables) * 100) : 0;

  const validOrders = orders.filter((o) => o.status !== "cancelled");
  const todaySales = validOrders.reduce((sum, o) => sum + o.total, 0);
  const totalTaxCollected = validOrders.reduce((sum, o) => sum + (o.tax || 0), 0);
  const averageOrderValue = validOrders.length > 0 ? Math.round(todaySales / validOrders.length) : 0;

  const activeOrders = orders.filter((o) => o.status !== "served" && o.status !== "cancelled");
  const preparingOrders = orders.filter((o) => o.status === "preparing" || o.status === "partially_ready");
  const readyOrders = orders.filter((o) => o.status === "ready");

  // Create Table Handler
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

  // Quick Table Status Changer
  const handleUpdateTableStatus = async (tableId: string, status: string) => {
    try {
      const res = await fetch("/api/tables", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId, status }),
      });
      if (res.ok) loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Close Session, Collect Cash & Settle Table
  const handleSettleAndFreeTable = async (table: Table, paymentMethod = "Cash") => {
    const tableOrders = orders.filter(
      (o) => o.tableId === table.id && o.status !== "cancelled"
    );
    const orderTotal = tableOrders.reduce((sum, o) => sum + o.total, 0);
    const phone = tableOrders.find((o) => o.customerPhone)?.customerPhone || (table as any).customerPhone;

    if (
      !confirm(
        `Confirm receiving ${formatCurrency(orderTotal)} in ${paymentMethod.toUpperCase()} & settle Table ${table.tableNumber}?`
      )
    ) {
      return;
    }

    try {
      if (table.activeSessionId) {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: table.activeSessionId,
            tableId: table.id,
            closedByStaffId: "staff_admin",
            paymentMethod: paymentMethod.toLowerCase(),
            paymentStatus: "paid",
            discount: 0,
          }),
        });
        if (!res.ok) {
          // Fallback to table status update if needed
          await fetch("/api/tables", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tableId: table.id, status: "available" }),
          });
        }
      } else {
        await fetch("/api/tables", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tableId: table.id, status: "available" }),
        });
      }

      // Automatically present downloadable & printable receipt for admin and customer records
      setInvoiceModalData({
        table,
        orders: tableOrders,
        customerPhone: phone,
        paymentMethod: paymentMethod,
        paymentStatus: "Paid",
      });

      setSelectedTableForDetails(null);
      loadData();
    } catch (err) {
      alert("Could not settle table. Please try again.");
    }
  };

  // Menu Availability Switch
  const handleToggleMenuAvailability = async (item: MenuItem) => {
    try {
      const newStatus = !item.isAvailable;
      setMenuItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isAvailable: newStatus } : i))
      );
      await fetch("/api/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, isAvailable: newStatus }),
      });
    } catch (err) {
      alert("Failed to toggle item availability");
      loadData();
    }
  };

  // Order Status Changer
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await fetch("/api/orders/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered Tables
  const filteredTables = tables.filter((t) => {
    if (tableFilter === "all") return true;
    if (tableFilter === "occupied") return t.status === "occupied";
    if (tableFilter === "available") return t.status === "available";
    if (tableFilter === "awaiting_bill") return t.status === "awaiting_bill";
    return true;
  });

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = orderStatusFilter === "all" || o.status === orderStatusFilter;
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.tableNumberSnapshot.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.items.some((i) => i.nameSnapshot.toLowerCase().includes(orderSearchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Filtered Menu Items
  const filteredMenuItems = menuItems.filter((m) => {
    const matchesCat = selectedMenuCategory === "all" || m.categoryId === selectedMenuCategory;
    const matchesSearch =
      m.name.toLowerCase().includes(menuSearchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(menuSearchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <StaffNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Top Header & Quick Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                Command Center
              </span>
              <span className="text-xs text-slate-400 font-semibold">• Live Firestore Sync</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-1 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              Executive Operations &amp; Restaurant Hub
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time monitoring across table occupancy, customer QR orders, kitchen fulfillment &amp; revenue
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
              title="Refresh live metrics"
            >
              <RotateCcw className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => setIsNewTableOpen(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-blue-500/25 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Dining Table</span>
            </button>
          </div>
        </div>

        {/* Live Executive Metric Cards (Financials & Floor Capacity) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Today's Total Money */}
          <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Today&apos;s Total Money</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2">
                {formatCurrency(todaySales)}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-bold text-slate-700">{validOrders.length} orders placed</span>
              <span className="font-bold text-emerald-600">GST: {formatCurrency(totalTaxCollected)}</span>
            </div>
          </div>

          {/* Table Occupancy */}
          <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Floor Occupancy</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-slate-900">
                  {occupiedTables + awaitingBillTables} / {totalTables}
                </span>
                <span className="text-xs font-bold text-blue-600">({occupancyPercentage}%)</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full"
                  style={{ width: `${occupancyPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-medium">
                <span>{availableTables} Available</span>
                <span className="text-amber-600 font-bold">{awaitingBillTables} Bill Called</span>
              </div>
            </div>
          </div>

          {/* Kitchen Active Tickets */}
          <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Kitchen Tickets</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ChefHat className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {activeOrders.length} Active
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-amber-600 font-bold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> {preparingOrders.length} on stove
              </span>
              <span className="text-indigo-600 font-bold">{readyOrders.length} ready to plate</span>
            </div>
          </div>

          {/* Taxes & Financial Compliance */}
          <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>GST Collected (5%)</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-purple-700 mt-2">
                {formatCurrency(totalTaxCollected)}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
              <span>Net Food: {formatCurrency(todaySales - totalTaxCollected)}</span>
              <span className="text-emerald-600 font-bold">100% Tax Compliant</span>
            </div>
          </div>
        </div>

        {/* Tab Controls Navigation */}
        <div className="flex border-b border-slate-200 space-x-2 sm:space-x-8 text-xs font-bold mb-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("floor")}
            className={`pb-3.5 transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "floor"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Floor Occupancy &amp; Tables ({tables.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`pb-3.5 transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "orders"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Orders Ledger ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("menu")}
            className={`pb-3.5 transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "menu"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Menu &amp; Live Stock Control ({menuItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("tables")}
            className={`pb-3.5 transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "tables"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>QR Station &amp; Setup</span>
          </button>
        </div>

        {/* TAB 1: FLOOR OCCUPANCY & ACTIVE SESSIONS */}
        {activeTab === "floor" && (
          <div>
            {/* Filter pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTableFilter("all")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    tableFilter === "all"
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  All ({totalTables})
                </button>
                <button
                  onClick={() => setTableFilter("occupied")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    tableFilter === "occupied"
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Occupied ({occupiedTables})
                </button>
                <button
                  onClick={() => setTableFilter("awaiting_bill")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    tableFilter === "awaiting_bill"
                      ? "bg-amber-600 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Bill Requested ({awaitingBillTables})
                </button>
                <button
                  onClick={() => setTableFilter("available")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    tableFilter === "available"
                      ? "bg-emerald-600 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Available ({availableTables})
                </button>
              </div>

              <span className="text-xs text-slate-400 font-semibold">
                Click any table card to inspect running orders and bills
              </span>
            </div>

            {/* Table Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredTables.map((table) => {
                const tableOrders = orders.filter(
                  (o) => o.tableId === table.id && o.status !== "cancelled"
                );
                const tableActiveOrders = tableOrders.filter((o) => o.status !== "served");
                const currentTableTotal = tableOrders.reduce((sum, o) => sum + o.total, 0);

                const isOccupied = table.status === "occupied";
                const isAwaitingBill = table.status === "awaiting_bill";
                const isAvailable = table.status === "available";

                return (
                  <div
                    key={table.id}
                    onClick={() => setSelectedTableForDetails(table)}
                    className={`cursor-pointer rounded-3xl p-5 border flex flex-col justify-between transition-all duration-200 shadow-xs hover:shadow-xl hover:-translate-y-0.5 ${
                      isAwaitingBill
                        ? "bg-amber-50/50 border-amber-300 ring-2 ring-amber-400/50"
                        : isOccupied
                        ? "bg-blue-50/30 border-blue-200 hover:border-blue-400"
                        : "bg-white border-slate-200/90 hover:border-blue-300"
                    }`}
                  >
                    <div>
                      {/* Top Table Info */}
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-black text-lg text-slate-900 block leading-tight">
                            Table {table.tableNumber}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {table.displayName}
                          </span>
                        </div>

                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            isAvailable
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : isAwaitingBill
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : isOccupied
                              ? "bg-blue-100 text-blue-900 border border-blue-300"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {table.status.replace("_", " ")}
                        </span>
                      </div>

                      {/* Seating & Waiter */}
                      <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-medium">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {table.capacity} Seats
                        </span>
                        {table.assignedWaiterName && (
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                            {table.assignedWaiterName}
                          </span>
                        )}
                      </div>

                      {/* Food & Ticket Preview */}
                      {tableOrders.length > 0 ? (
                        <div className="mt-3.5 bg-white/80 border border-slate-200/70 rounded-2xl p-3 text-xs">
                          <div className="flex items-center justify-between font-bold text-slate-700 pb-1.5 border-b border-slate-100">
                            <span>Active Order</span>
                            <span className="text-blue-600">{tableActiveOrders.length} in kitchen</span>
                          </div>
                          <div className="mt-1.5 space-y-1">
                            {tableOrders[0].items.slice(0, 2).map((item) => (
                              <div key={item.id} className="flex justify-between text-[11px] text-slate-600">
                                <span className="line-clamp-1">{item.quantity}x {item.nameSnapshot}</span>
                                <span className="font-semibold text-slate-800">{formatCurrency(item.lineTotal)}</span>
                              </div>
                            ))}
                            {tableOrders[0].items.length > 2 && (
                              <p className="text-[10px] text-slate-400 font-semibold">
                                +{tableOrders[0].items.length - 2} more items...
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3.5 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-3 text-center text-xs text-slate-400">
                          Table is ready for guests
                        </div>
                      )}
                    </div>

                    {/* Bottom Running Bill & Quick Action */}
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                          Current Bill
                        </span>
                        <span className="font-black text-slate-900 text-sm">
                          {formatCurrency(currentTableTotal)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setQrModalTable(table);
                          }}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition"
                          title="View QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTableForDetails(table);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: ORDERS LEDGER & AUDIT TRAIL */}
        {activeTab === "orders" && (
          <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
            {/* Header Controls */}
            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  Real-Time Orders Ledger &amp; Transactions
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete chronological history of every customer QR and waiter order
                </p>
              </div>

              {/* Search & Status Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by Order #, Table, dish..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition"
                  />
                </div>

                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-600 transition"
                >
                  <option value="all">All Statuses</option>
                  <option value="submitted">Submitted / Queued</option>
                  <option value="preparing">Cooking</option>
                  <option value="ready">Ready to Serve</option>
                  <option value="served">Delivered / Served</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Orders Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-5">Order #</th>
                    <th className="py-3.5 px-5">Table</th>
                    <th className="py-3.5 px-5">Source</th>
                    <th className="py-3.5 px-5">Itemized Dishes</th>
                    <th className="py-3.5 px-5">Special Notes</th>
                    <th className="py-3.5 px-5">Total</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5">Time Placed</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No orders found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-4 px-5 font-mono font-black text-blue-600">
                          {o.orderNumber}
                        </td>
                        <td className="py-4 px-5 font-bold text-slate-900">
                          Table {o.tableNumberSnapshot}
                        </td>
                        <td className="py-4 px-5">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase ${
                              o.source === "qr"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {o.source === "qr" ? "QR Customer" : "Waiter POS"}
                          </span>
                        </td>
                        <td className="py-4 px-5 max-w-xs">
                          <div className="space-y-0.5">
                            {o.items.map((i) => (
                              <div key={i.id} className="text-slate-700 font-medium">
                                <span className="font-bold text-slate-900">{i.quantity}x</span>{" "}
                                {i.nameSnapshot}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 px-5 max-w-xs text-slate-500 italic text-[11px]">
                          {o.specialInstructions || "—"}
                        </td>
                        <td className="py-4 px-5 font-black text-slate-900 text-sm">
                          {formatCurrency(o.total)}
                        </td>
                        <td className="py-4 px-5">
                          <span
                            className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                              o.status === "served"
                                ? "bg-emerald-100 text-emerald-800"
                                : o.status === "ready"
                                ? "bg-indigo-100 text-indigo-800"
                                : o.status === "preparing"
                                ? "bg-amber-100 text-amber-800"
                                : o.status === "cancelled"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {o.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-slate-400 font-medium whitespace-nowrap">
                          {formatRelativeTime(o.createdAt)}
                        </td>
                        <td className="py-4 px-5 text-right whitespace-nowrap">
                          {o.status !== "served" && o.status !== "cancelled" ? (
                            <button
                              onClick={() => handleUpdateOrderStatus(o.id, "served")}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition"
                            >
                              Mark Served
                            </button>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: MENU ITEMS & LIVE STOCK CONTROL */}
        {activeTab === "menu" && (
          <div>
            {/* Header & Category Filter */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 mb-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  Menu Catalog &amp; Live Stock Switch
                </h3>
                <p className="text-xs text-slate-400">
                  Toggle availability with 1-click. Disabled dishes immediately show as &quot;Sold Out&quot; on customer QR menus.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search dishes..."
                    value={menuSearchQuery}
                    onChange={(e) => setMenuSearchQuery(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition"
                  />
                </div>

                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setSelectedMenuCategory("all")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      selectedMenuCategory === "all"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    All ({menuItems.length})
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedMenuCategory(c.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                        selectedMenuCategory === c.id
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Menu Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredMenuItems.map((item) => {
                const isVeg = item.foodType === "veg" || item.foodType === "vegan";
                return (
                  <div
                    key={item.id}
                    className={`bg-white border rounded-3xl p-5 flex flex-col justify-between transition-all duration-200 shadow-xs hover:shadow-md ${
                      item.isAvailable ? "border-slate-200/90" : "border-rose-200 bg-rose-50/20 opacity-80"
                    }`}
                  >
                    <div className="flex gap-4">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-20 h-20 rounded-2xl object-cover bg-slate-100 shrink-0 border border-slate-100"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center p-0.5 ${
                              isVeg ? "border-emerald-600" : "border-rose-600"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isVeg ? "bg-emerald-600" : "bg-rose-600"
                              }`}
                            />
                          </span>
                          <h4 className="font-bold text-sm text-slate-900 leading-snug">
                            {item.name}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                          {item.description}
                        </p>
                        <div className="text-xs text-slate-400 font-semibold mt-1">
                          ⏱ ~{item.preparationMetadata?.avgPrepTimeMinutes || 15} mins prep
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-black text-base text-slate-900">
                        {formatCurrency(item.price)}
                      </span>

                      {/* Stock Switch */}
                      <button
                        onClick={() => handleToggleMenuAvailability(item)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                          item.isAvailable
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.isAvailable ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        <span>{item.isAvailable ? "In Stock" : "Sold Out"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: QR CODE STATION & SETUP */}
        {activeTab === "tables" && (
          <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  Registered Dining Tables &amp; Public Tokens
                </h3>
                <p className="text-xs text-slate-400">
                  Every table has a unique cryptographic token for contactless mobile ordering.
                </p>
              </div>

              <button
                onClick={() => setIsNewTableOpen(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Table</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-5">Table Number</th>
                    <th className="py-3.5 px-5">Display Name / Section</th>
                    <th className="py-3.5 px-5">Capacity</th>
                    <th className="py-3.5 px-5">Public Token</th>
                    <th className="py-3.5 px-5">Current Status</th>
                    <th className="py-3.5 px-5 text-right">QR Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tables.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-5 font-black text-slate-900 text-sm">
                        Table {t.tableNumber}
                      </td>
                      <td className="py-4 px-5 font-semibold text-slate-700">
                        {t.displayName}
                      </td>
                      <td className="py-4 px-5 text-slate-500 font-medium">
                        {t.capacity} guests
                      </td>
                      <td className="py-4 px-5">
                        <span className="font-mono text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {t.publicId}
                        </span>
                      </td>
                      <td className="py-4 px-5">
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
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => setQrModalTable(t)}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs inline-flex items-center gap-1.5 transition border border-blue-200"
                        >
                          <QrCode className="w-3.5 h-3.5 text-blue-600" />
                          View / Print QR
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: TABLE DETAILS & SETTLE BILL INSPECTION */}
      {selectedTableForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 text-slate-800 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                  {selectedTableForDetails.tableNumber}
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    Table {selectedTableForDetails.tableNumber} Inspection
                  </h3>
                  <span className="text-xs text-slate-400">
                    {selectedTableForDetails.displayName} • Cap {selectedTableForDetails.capacity}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTableForDetails(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Table Details Body */}
            {(() => {
              const tableOrders = orders.filter(
                (o) => o.tableId === selectedTableForDetails.id && o.status !== "cancelled"
              );
              const subtotal = tableOrders.reduce((sum, o) => sum + o.subtotal, 0);
              const tax = tableOrders.reduce((sum, o) => sum + (o.tax || 0), 0);
              const total = tableOrders.reduce((sum, o) => sum + o.total, 0);
              const phone = tableOrders.find((o) => o.customerPhone)?.customerPhone || (selectedTableForDetails as any).customerPhone;

              return (
                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                  {/* Status & Quick Change */}
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Current Floor Status
                      </span>
                      <span className="text-xs font-black text-slate-900 uppercase">
                        {selectedTableForDetails.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleUpdateTableStatus(selectedTableForDetails.id, "occupied")}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                      >
                        Occupied
                      </button>
                      <button
                        onClick={() => handleUpdateTableStatus(selectedTableForDetails.id, "awaiting_bill")}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                      >
                        Awaiting Bill
                      </button>
                    </div>
                  </div>

                  {/* Customer Phone badge if captured */}
                  {phone && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50/80 border border-blue-200 rounded-2xl text-xs text-blue-900 font-bold">
                      <Phone className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Customer Mobile: <strong className="text-blue-800 font-mono tracking-wide">+91 {phone}</strong></span>
                    </div>
                  )}

                  {/* Active Orders List */}
                  <div>
                    <h4 className="text-xs font-black text-slate-900 mb-2 uppercase tracking-wider">
                      Orders in this dining session ({tableOrders.length})
                    </h4>
                    {tableOrders.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">No active orders placed on this table yet.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {tableOrders.map((o) => (
                          <div key={o.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 text-xs">
                              <span className="font-mono font-bold text-blue-600">{o.orderNumber}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase">
                                {o.status.replace("_", " ")}
                              </span>
                            </div>
                            <div className="mt-2 space-y-1">
                              {o.items.map((i) => (
                                <div key={i.id} className="flex justify-between text-xs text-slate-700">
                                  <span>{i.quantity}x {i.nameSnapshot}</span>
                                  <span className="font-bold text-slate-900">{formatCurrency(i.lineTotal)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bill Breakdown */}
                  {tableOrders.length > 0 && (
                    <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>Subtotal</span>
                        <span className="font-bold text-slate-800">{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>GST (5%)</span>
                        <span className="font-bold text-slate-800">{formatCurrency(tax)}</span>
                      </div>
                      <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                        <span>Total Payable</span>
                        <span className="text-blue-600">{formatCurrency(total)}</span>
                      </div>
                    </div>
                  )}

                  {/* Actions (View & Print Bill + Take Cash & Settle) */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => setQrModalTable(selectedTableForDetails)}
                      className="py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <QrCode className="w-4 h-4 text-blue-600" />
                      <span>QR</span>
                    </button>

                    {tableOrders.length > 0 && (
                      <button
                        onClick={() => {
                          setInvoiceModalData({
                            table: selectedTableForDetails,
                            orders: tableOrders,
                            customerPhone: phone,
                            paymentMethod: "Cash",
                            paymentStatus: tableOrders.every((o) => o.status === "served") ? "Paid" : "Pending Settlement",
                          });
                        }}
                        className="flex-1 py-3 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-2xl text-xs font-black transition flex items-center justify-center gap-1.5"
                      >
                        <Receipt className="w-4 h-4 text-blue-600" />
                        <span>View / Print Bill</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleSettleAndFreeTable(selectedTableForDetails, "Cash")}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition shadow-md shadow-emerald-500/25 flex items-center justify-center gap-1.5"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Take Cash &amp; Settle ({formatCurrency(total)})</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL 2: QR MODAL */}
      {qrModalTable && (
        <TableQRModal
          isOpen={!!qrModalTable}
          onClose={() => setQrModalTable(null)}
          tableNumber={qrModalTable.tableNumber}
          publicId={qrModalTable.publicId}
          displayName={qrModalTable.displayName}
        />
      )}

      {/* MODAL 3: ADD NEW DINING TABLE */}
      {isNewTableOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 text-slate-800 shadow-2xl">
            <h3 className="font-black text-base text-slate-900 mb-1">
              Add New Dining Table
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Instantly provisions a new table with a secure cryptographic QR token.
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
                  Section / Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rooftop Garden"
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
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider transition shadow-sm shadow-blue-500/20"
                >
                  Create Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 4: OFFICIAL TAX INVOICE & BILL PRINT/DOWNLOAD */}
      {invoiceModalData && (
        <InvoiceReceipt
          restaurant={restaurant}
          tableNumber={invoiceModalData.table.tableNumber}
          orders={invoiceModalData.orders}
          customerPhone={invoiceModalData.customerPhone}
          paymentMethod={invoiceModalData.paymentMethod || "Cash"}
          paymentStatus={invoiceModalData.paymentStatus || "Paid"}
          onClose={() => setInvoiceModalData(null)}
        />
      )}
    </div>
  );
}
