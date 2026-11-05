"use client";

import { useEffect, useState, use } from "react";
import {
  Utensils,
  Search,
  Plus,
  Minus,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Clock,
  MapPin,
  Flame,
  ChefHat,
  BellRing,
  Timer,
  Check,
  RefreshCw,
  Info,
  X,
  ChevronRight,
  Filter,
  Volume2,
  Phone,
  Printer,
  Download,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { MenuCategory, MenuItem, Restaurant, Table, Order } from "@/types";
import { InvoiceReceipt } from "@/components/InvoiceReceipt";

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
}

export default function CustomerMenuPage({
  params,
}: {
  params: Promise<{ tablePublicId: string }>;
}) {
  const resolvedParams = use(params);
  const { tablePublicId } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [table, setTable] = useState<Table | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [dietaryFilter, setDietaryFilter] = useState<"all" | "veg" | "non-veg">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Cart state: manual add then place order
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [billRequested, setBillRequested] = useState(false);
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Load saved phone number on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("customer_phone");
      if (saved) setCustomerPhone(saved);
    } catch {}
  }, []);

  // Live Active Orders for this Table
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [selectedItemForNotes, setSelectedItemForNotes] = useState<MenuItem | null>(null);
  const [tempNotes, setTempNotes] = useState<string>("");
  const [orderSuccessMessage, setOrderSuccessMessage] = useState<string | null>(null);

  // Quick note chips
  const quickNoteChips = [
    "Less Spicy 🌶️",
    "No Onions/Garlic 🧅",
    "Extra Crispy 🍟",
    "Make it Jain 🌱",
    "Serve Extra Hot ♨️",
    "Sauce on the side 🥣",
  ];

  // Fetch initial table & menu data
  const loadTableAndMenu = async () => {
    try {
      const res = await fetch(`/api/table/${tablePublicId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to load table menu");
        return;
      }

      setTable(data.table);
      setRestaurant(data.restaurant);
      setCategories(data.categories || []);
      setMenuItems(data.menuItems || []);

      // If active session exists, set live orders immediately
      if (data.activeOrders) {
        setActiveOrders(data.activeOrders);
      }
    } catch (err: unknown) {
      setError("Unable to connect to restaurant server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Poll active orders for this table only when status changes
  const fetchSessionOrders = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions?sessionId=${sessionId}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.success && Array.isArray(data.orders)) {
        setActiveOrders((prev) => {
          const prevSig = prev.map((o) => `${o.id}_${o.status}`).join(",");
          const nextSig = data.orders.map((o: Order) => `${o.id}_${o.status}`).join(",");
          // If no status changed, keep previous reference to prevent blinking & re-renders
          if (prevSig === nextSig) return prev;
          return data.orders;
        });
      }
    } catch {
      // Silently ignore background polling blips
    }
  };

  useEffect(() => {
    loadTableAndMenu();
  }, [tablePublicId]);

  // Only poll if there are active orders waiting or cooking in the kitchen
  const hasActiveCookingOrders = activeOrders.some(
    (o) =>
      o.status === "submitted" ||
      o.status === "acknowledged" ||
      o.status === "preparing" ||
      o.status === "partially_ready"
  );

  useEffect(() => {
    if (!table?.activeSessionId || !hasActiveCookingOrders) return;
    const interval = setInterval(() => {
      fetchSessionOrders(table.activeSessionId!);
    }, 8000);
    return () => clearInterval(interval);
  }, [table?.activeSessionId, hasActiveCookingOrders]);

  // Cart Operations
  const addToCart = (item: MenuItem, notes?: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItem.id === item.id
            ? {
                ...c,
                quantity: c.quantity + 1,
                specialInstructions: notes || c.specialInstructions,
              }
            : c
        );
      }
      return [...prev, { menuItem: item, quantity: 1, specialInstructions: notes }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((c) => {
          if (c.menuItem.id === itemId) {
            const newQty = c.quantity + delta;
            return newQty > 0 ? { ...c, quantity: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const updateInstructions = (itemId: string, notes: string) => {
    setCart((prev) =>
      prev.map((c) =>
        c.menuItem.id === itemId ? { ...c, specialInstructions: notes } : c
      )
    );
  };

  // Totals calculations in INR
  const cartSubtotal = cart.reduce(
    (sum, c) => sum + c.menuItem.price * c.quantity,
    0
  );
  const taxRate = 0.05; // 5% GST
  const cartTax = Math.round(cartSubtotal * taxRate);
  const cartTotal = cartSubtotal + cartTax;
  const totalItemCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  // Manual Order Submission
  const handlePlaceOrder = async () => {
    if (!table || cart.length === 0) return;

    // Validate 10-digit mobile number requirement
    const cleanPhone = customerPhone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      alert("Please enter a valid 10-digit mobile number for your digital bill.");
      return;
    }

    try {
      localStorage.setItem("customer_phone", cleanPhone);
    } catch {}

    setOrderSubmitting(true);
    try {
      const orderPayload = {
        restaurantId: restaurant?.id || "rest_default_01",
        tablePublicId,
        customerPhone: cleanPhone,
        source: "qr",
        items: cart.map((c) => ({
          menuItemId: c.menuItem.id,
          quantity: c.quantity,
          specialInstructions: c.specialInstructions?.trim() || "",
        })),
        specialInstructions: "Customer Order via QR Digital Menu",
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = data.error || (data.details ? Object.values(data.details).join(", ") : "Order submission failed.");
        alert(errorMsg);
        return;
      }

      setCart([]);
      setIsCartOpen(false);
      setOrderSuccessMessage(`Order #${data.order.orderNumber} successfully sent to the kitchen!`);
      setTimeout(() => setOrderSuccessMessage(null), 6000);

      // Refresh table state & live active order
      loadTableAndMenu();
    } catch (err) {
      alert("Network error submitting order. Please notify your waiter.");
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Request Bill Handler
  const handleRequestBill = async () => {
    if (!table || billRequested) return;
    try {
      const res = await fetch("/api/tables", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: table.id,
          status: "bill_requested",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBillRequested(true);
      } else {
        alert(data.error || "Could not request bill");
      }
    } catch (err) {
      alert("Request failed. Please notify your waiter.");
    }
  };

  // Call Waiter Handler
  const handleCallWaiter = () => {
    setWaiterCalled(true);
    setTimeout(() => setWaiterCalled(false), 5000);
  };

  // Active Orders Aggregates
  const totalActiveExpenditure = activeOrders.reduce((sum, o) => sum + o.total, 0);

  // Calculate estimated time remaining & live location
  const getOrderStageInfo = (order: Order) => {
    switch (order.status) {
      case "submitted":
        return {
          stage: "Sent to Kitchen",
          location: "Order Queue (Waiting Chef Acceptance)",
          color: "bg-blue-50 text-blue-700 border-blue-200",
          progress: 25,
          etaMinutes: 18,
          icon: Clock,
          badge: "bg-amber-100 text-amber-900 border-amber-300",
        };
      case "acknowledged":
      case "preparing":
        return {
          stage: "Cooking & Simmering",
          location: "Main Kitchen Stove Line",
          color: "bg-amber-50 text-amber-800 border-amber-200",
          progress: 60,
          etaMinutes: 10,
          icon: Flame,
          badge: "bg-orange-100 text-orange-900 border-orange-300",
        };
      case "partially_ready":
      case "ready":
        return {
          stage: "Plated & Ready to Serve",
          location: "Kitchen Pickup Counter",
          color: "bg-emerald-50 text-emerald-800 border-emerald-200",
          progress: 90,
          etaMinutes: 2,
          icon: BellRing,
          badge: "bg-emerald-100 text-emerald-900 border-emerald-300",
        };
      case "served":
        return {
          stage: "Delivered to Your Table",
          location: `Delivered at Table ${order.tableNumberSnapshot}`,
          color: "bg-purple-50 text-purple-800 border-purple-200",
          progress: 100,
          etaMinutes: 0,
          icon: CheckCircle2,
          badge: "bg-purple-100 text-purple-900 border-purple-300",
        };
      default:
        return {
          stage: order.status.replace("_", " "),
          location: "Kitchen Display Queue",
          color: "bg-slate-50 text-slate-700 border-slate-200",
          progress: 40,
          etaMinutes: 15,
          icon: Timer,
          badge: "bg-slate-100 text-slate-800 border-slate-300",
        };
    }
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      selectedCategory === "all" || item.categoryId === selectedCategory;
    const matchesDietary =
      dietaryFilter === "all" ||
      (dietaryFilter === "veg" && (item.foodType === "veg" || item.foodType === "vegan")) ||
      (dietaryFilter === "non-veg" && item.foodType === "non-veg");
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesDietary && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50/40 flex flex-col items-center justify-center p-6 text-slate-800">
        <div className="w-16 h-16 relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
          <div className="w-16 h-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          <Utensils className="w-6 h-6 text-blue-600" />
        </div>
        <p className="mt-5 text-slate-800 font-extrabold text-base tracking-tight">
          Opening Gourmet Menu
        </p>
        <p className="text-slate-400 text-xs mt-1">Connecting to Table {tablePublicId}...</p>
      </div>
    );
  }

  if (error || !table) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black mb-2 text-slate-900">Table QR Not Found</h2>
        <p className="text-slate-500 text-sm max-w-sm mb-6 leading-relaxed">
          {error || "The table code is invalid or no longer active. Please ask your server for assistance."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-800 pb-32">
      {/* Toast: Waiter Summon Notification */}
      {waiterCalled && (
        <div className="fixed top-4 inset-x-0 z-50 flex justify-center px-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 max-w-md w-full">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <BellRing className="w-4 h-4 animate-bounce" />
            </div>
            <div className="flex-1 text-xs">
              <p className="font-extrabold text-white">Waiter Called!</p>
              <p className="text-slate-300">Staff has been notified for Table {table.tableNumber}.</p>
            </div>
            <button
              onClick={() => setWaiterCalled(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Toast: Order Placed Success */}
      {orderSuccessMessage && (
        <div className="fixed top-4 inset-x-0 z-50 flex justify-center px-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 max-w-md w-full">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <div className="flex-1 text-xs">
              <p className="font-black text-white text-sm">Order Dispatched</p>
              <p className="text-emerald-100">{orderSuccessMessage}</p>
            </div>
            <button
              onClick={() => setOrderSuccessMessage(null)}
              className="text-emerald-200 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* TOP RESTAURANT NAVIGATION BAR */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Brand Info */}
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-slate-900 text-base tracking-tight leading-none">
                  {restaurant?.name || "Gourmet Bistro & Grill"}
                </h1>
                <span className="hidden sm:inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Open
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  Table {table.tableNumber}
                </span>
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                  {table.displayName}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions (Call Waiter + Request Bill + View Invoice) */}
          <div className="flex items-center space-x-2">
            {activeOrders.length > 0 && (
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-black text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition active:scale-95 shadow-2xs"
                title="View your official restaurant tax invoice"
              >
                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">View Bill</span>
                <span className="sm:hidden">Bill</span>
              </button>
            )}

            <button
              onClick={handleCallWaiter}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition active:scale-95 shadow-2xs"
              title="Call your table waiter"
            >
              <BellRing className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Call Waiter</span>
              <span className="sm:hidden">Waiter</span>
            </button>

            <button
              onClick={handleRequestBill}
              disabled={billRequested}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition active:scale-95 shadow-2xs ${
                billRequested
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
              }`}
            >
              <Receipt className="w-3.5 h-3.5 text-blue-600" />
              <span>{billRequested ? "Bill Requested" : "Request Bill"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO CONTAINER */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5">
        {/* LIVE ACTIVE ORDER TRACKER (Displayed prominently when customer has placed orders) */}
        {activeOrders.length > 0 && (
          <div className="mb-6">
            <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-blue-900/50">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center">
                    <ChefHat className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                        Live Kitchen Status
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white">
                        Order #{activeOrders[0].orderNumber}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {activeOrders[0].items.length} items ordered for Table {table.tableNumber}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-300 block font-medium">
                    Total Order Value
                  </span>
                  <span className="text-xl font-black text-emerald-400">
                    {formatCurrency(totalActiveExpenditure)}
                  </span>
                </div>
              </div>

              {/* Real-time Stage & Location Details */}
              {(() => {
                const stage = getOrderStageInfo(activeOrders[0]);
                const StageIcon = stage.icon;
                return (
                  <div className="pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <StageIcon className="w-4 h-4 text-blue-400" />
                        <span className="text-sm">{stage.stage}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold border border-white/10">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {stage.etaMinutes > 0
                            ? `~${stage.etaMinutes} mins remaining`
                            : "Delivered to Table"}
                        </span>
                      </div>
                    </div>

                    {/* Animated Progress Bar */}
                    <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden p-0.5">
                      <div
                        className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-1.5 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${stage.progress}%` }}
                      />
                    </div>

                    {/* Exact Location Beacon */}
                    <div className="flex items-center gap-2 mt-3 text-xs text-slate-300 bg-white/5 border border-white/10 rounded-2xl p-2.5">
                      <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>
                        Where is your order:{" "}
                        <strong className="text-white font-extrabold">{stage.location}</strong>
                      </span>
                    </div>

                    {/* View Tax Bill Button */}
                    <button
                      onClick={() => setShowInvoiceModal(true)}
                      className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-2xl text-xs font-black transition border border-emerald-500/30"
                    >
                      <Receipt className="w-4 h-4 text-emerald-400" />
                      <span>View &amp; Download Itemized Tax Invoice (₹{totalActiveExpenditure})</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* SEARCH & FILTERS SECTION */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              placeholder="Search dishes, burgers, paneer, shakes, biryani..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-2xl pl-12 pr-10 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition shadow-inner font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Dietary Filters (Pure Veg / Non-Veg / All) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Dietary:
              </span>
              <button
                onClick={() => setDietaryFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  dietaryFilter === "all"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setDietaryFilter("veg")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  dietaryFilter === "veg"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-400 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="w-3.5 h-3.5 rounded-sm border border-emerald-600 flex items-center justify-center p-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                </span>
                <span>Pure Veg</span>
              </button>
              <button
                onClick={() => setDietaryFilter("non-veg")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  dietaryFilter === "non-veg"
                    ? "bg-rose-50 text-rose-800 border-rose-400 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="w-3.5 h-3.5 rounded-sm border border-rose-600 flex items-center justify-center p-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                </span>
                <span>Non-Veg</span>
              </button>
            </div>

            <div className="text-xs font-bold text-slate-500">
              Showing <span className="text-blue-600">{filteredItems.length}</span> dishes
            </div>
          </div>

          {/* Category Navigation Pills */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pt-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all shadow-xs flex items-center gap-1.5 ${
                selectedCategory === "all"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>🔥 All Dishes</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategory === "all" ? "bg-white/20 text-white" : "bg-white text-slate-600"
                }`}
              >
                {menuItems.length}
              </span>
            </button>

            {categories.map((cat) => {
              const count = menuItems.filter((i) => i.categoryId === cat.id).length;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all shadow-xs flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? "bg-white/20 text-white" : "bg-white text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* MENU DISHES GRID */}
        <main className="mt-6">
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
              <Utensils className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-base font-extrabold text-slate-700">No dishes found</p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching for something else or reset your filters.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setDietaryFilter("all");
                }}
                className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredItems.map((item) => {
                const inCart = cart.find((c) => c.menuItem.id === item.id);
                const isVeg = item.foodType === "veg" || item.foodType === "vegan";

                return (
                  <div
                    key={item.id}
                    className="group bg-white border border-slate-200/90 hover:border-blue-400 rounded-3xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                  >
                    {/* Top Food Image Container */}
                    <div className="relative aspect-[16/10] w-full bg-slate-100 overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            // Fallback to stylized container on broken image link
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : null}

                      {/* Fallback pattern if image is hidden or missing */}
                      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-50 via-slate-100 to-indigo-50 flex items-center justify-center text-slate-400">
                        <Utensils className="w-10 h-10 text-slate-300" />
                      </div>

                      {/* Top Badges (FSSAI Veg/Non-Veg mark & Prep time) */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        {/* Standard Indian FSSAI Emblem */}
                        <div
                          className={`w-6 h-6 rounded-md bg-white/95 backdrop-blur-xs flex items-center justify-center shadow-md ${
                            isVeg ? "border-[1.5px] border-emerald-600" : "border-[1.5px] border-rose-600"
                          }`}
                        >
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${
                              isVeg ? "bg-emerald-600" : "bg-rose-600"
                            }`}
                          />
                        </div>

                        <span className="bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-slate-800 shadow-xs">
                          {item.foodType}
                        </span>
                      </div>

                      {/* Prep time badge */}
                      {item.preparationMetadata?.avgPrepTimeMinutes && (
                        <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-md">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>~{item.preparationMetadata.avgPrepTimeMinutes}m</span>
                        </div>
                      )}
                    </div>

                    {/* Dish Body Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-blue-600 transition-colors">
                            {item.name}
                          </h3>
                        </div>

                        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed font-normal">
                          {item.description}
                        </p>

                        {/* Spice / Allergen tags */}
                        {item.preparationMetadata && (
                          <div className="flex flex-wrap gap-1 mt-2.5">
                            {item.preparationMetadata.spiceLevel &&
                              item.preparationMetadata.spiceLevel !== "none" && (
                                <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200">
                                  🌶️ {item.preparationMetadata.spiceLevel}
                                </span>
                              )}
                            {item.preparationMetadata.allergens?.map((alg) => (
                              <span
                                key={alg}
                                className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600"
                              >
                                {alg}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Price and Add to Cart Section */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Price
                          </span>
                          <span className="text-lg font-black text-slate-900">
                            {formatCurrency(item.price)}
                          </span>
                        </div>

                        {inCart ? (
                          <div className="flex items-center bg-blue-50 border border-blue-200 rounded-2xl p-1 shadow-2xs">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white text-blue-700 hover:bg-blue-100 shadow-2xs font-extrabold active:scale-95 transition"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center text-sm font-black text-blue-900">
                              {inCart.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white text-blue-700 hover:bg-blue-100 shadow-2xs font-extrabold active:scale-95 transition"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedItemForNotes(item);
                              setTempNotes("");
                            }}
                            className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/25 active:scale-95 transition-all"
                          >
                            <Plus className="w-4 h-4" />
                            <span>ADD</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* FLOATING BOTTOM CART BAR (Review & Place Order) */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-4 inset-x-0 z-40 max-w-lg mx-auto px-4 animate-in slide-in-from-bottom-5 duration-200">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-extrabold p-4 rounded-3xl flex items-center justify-between shadow-2xl shadow-blue-600/40 transition-all transform active:scale-98 border border-white/20"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs text-white flex items-center justify-center text-sm font-black border border-white/20">
                {totalItemCount}
              </div>
              <div className="text-left">
                <span className="text-xs font-bold block opacity-90 leading-none">
                  {totalItemCount} {totalItemCount === 1 ? "Item" : "Items"} in Cart
                </span>
                <span className="text-sm font-black tracking-tight leading-tight flex items-center gap-1 mt-0.5">
                  Review &amp; Place Order <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] opacity-80 block uppercase font-bold tracking-wider">
                Total
              </span>
              <span className="text-lg font-black tracking-tight text-white">
                {formatCurrency(cartTotal)}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* SPECIAL COOKING NOTES MODAL (When tapping ADD on a dish) */}
      {selectedItemForNotes && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  Customization
                </span>
                <h3 className="font-extrabold text-base text-slate-900">
                  Add {selectedItemForNotes.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItemForNotes(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Price: <strong className="text-slate-900 font-extrabold">{formatCurrency(selectedItemForNotes.price)}</strong>
            </p>

            {/* Quick chips */}
            <div className="mt-3">
              <label className="text-xs font-bold text-slate-700 block mb-2">
                Quick Chef Instructions:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {quickNoteChips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => {
                      setTempNotes((prev) => (prev ? `${prev}, ${chip}` : chip));
                    }}
                    className="px-2.5 py-1 rounded-xl text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-transparent font-medium text-slate-700 transition"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Note Input */}
            <div className="mt-3">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Custom Instructions:
              </label>
              <input
                type="text"
                placeholder="e.g. Less oil, separate dressing, cut in halves..."
                value={tempNotes}
                onChange={(e) => setTempNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition"
              />
            </div>

            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => setSelectedItemForNotes(null)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  addToCart(selectedItemForNotes, tempNotes);
                  setSelectedItemForNotes(null);
                }}
                className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider transition shadow-md shadow-blue-500/25"
              >
                Add to Cart ({formatCurrency(selectedItemForNotes.price)})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CART REVIEW & CHECKOUT DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200">
          <div className="bg-white border-t border-slate-200 rounded-t-3xl max-w-lg w-full mx-auto p-5 sm:p-6 max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Review Your Order</h2>
                  <span className="text-xs text-slate-500 font-medium">
                    Table {table.tableNumber} • Confirmed &amp; sent directly to kitchen
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Cart Items Scrollable List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {cart.map((c) => (
                <div
                  key={c.menuItem.id}
                  className="bg-slate-50/90 p-4 rounded-2xl border border-slate-200 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center p-0.5 ${
                            c.menuItem.foodType === "veg" || c.menuItem.foodType === "vegan"
                              ? "border-emerald-600"
                              : "border-rose-600"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              c.menuItem.foodType === "veg" || c.menuItem.foodType === "vegan"
                                ? "bg-emerald-600"
                                : "bg-rose-600"
                            }`}
                          />
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-900">
                          {c.menuItem.name}
                        </h4>
                      </div>
                      <div className="text-xs text-blue-600 font-black mt-1">
                        {formatCurrency(c.menuItem.price * c.quantity)}
                      </div>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center bg-white rounded-xl p-1 border border-slate-200 shadow-2xs">
                      <button
                        onClick={() => updateQuantity(c.menuItem.id, -1)}
                        className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 font-black"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 text-center text-xs font-black text-slate-800">
                        {c.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(c.menuItem.id, 1)}
                        className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 font-black"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Special instruction notes field */}
                  <input
                    type="text"
                    placeholder="Instructions: less spicy, no onions, extra crispy..."
                    value={c.specialInstructions || ""}
                    onChange={(e) =>
                      updateInstructions(c.menuItem.id, e.target.value)
                    }
                    className="w-full mt-3 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition"
                  />
                </div>
              ))}
            </div>

            {/* Mobile Number Capture (Requirement: Take phone number when ordering) */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/90 rounded-2xl p-3.5 my-2">
              <label className="block text-xs font-black text-slate-900 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  Your Mobile Number <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] text-blue-700 bg-blue-100 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  For Digital Bill
                </span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs font-extrabold text-slate-500">
                  +91
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="Enter 10-digit mobile number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-white border border-slate-300 focus:border-blue-600 rounded-xl pl-12 pr-3 py-2 text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-2xs"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Your itemized tax bill and live order status will be linked to this number.
              </p>
            </div>

            {/* Bill Breakdown in INR */}
            <div className="border-t border-slate-100 pt-3.5 space-y-2 text-xs text-slate-500">
              <div className="flex justify-between font-medium">
                <span>Subtotal ({totalItemCount} items)</span>
                <span className="text-slate-900 font-bold">{formatCurrency(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Restaurant GST &amp; Taxes ({Math.round(taxRate * 100)}%)</span>
                <span className="text-slate-900 font-bold">{formatCurrency(cartTax)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-100">
                <span>Grand Total</span>
                <span className="text-blue-600 font-black text-lg">{formatCurrency(cartTotal)}</span>
              </div>
            </div>

            {/* ETA Info Badge */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3 mt-3 flex items-center gap-2.5 text-xs text-blue-900 font-medium">
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Estimated preparation time: <strong>~15-20 mins</strong>. Freshly prepared upon order.
              </span>
            </div>

            {/* Confirm Order Button */}
            <button
              onClick={handlePlaceOrder}
              disabled={orderSubmitting || cart.length === 0}
              className="mt-4 w-full bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-extrabold py-4 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-blue-500/30 transition disabled:opacity-50 active:scale-98"
            >
              {orderSubmitting ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending to Kitchen Display...
                </span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Confirm &amp; Place Order ({formatCurrency(cartTotal)})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
      {/* Official Tax Invoice & Bill Modal */}
      {showInvoiceModal && (
        <InvoiceReceipt
          restaurant={restaurant}
          tableNumber={table?.tableNumber || ""}
          orders={activeOrders}
          customerPhone={customerPhone || activeOrders[0]?.customerPhone}
          paymentMethod="Cash"
          paymentStatus={activeOrders.every((o) => o.status === "served") ? "Paid" : "Pending Settlement"}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}
    </div>
  );
}
