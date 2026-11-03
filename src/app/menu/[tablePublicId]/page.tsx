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
  ChevronRight,
  Flame,
  ChefHat,
  BellRing,
  Timer,
  Check,
  RefreshCw,
  Info,
} from "lucide-react";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { MenuCategory, MenuItem, Restaurant, Table, Order } from "@/types";

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
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Cart state: manual add then place order
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [billRequested, setBillRequested] = useState(false);

  // Live Active Orders for this Table
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [selectedItemForNotes, setSelectedItemForNotes] = useState<MenuItem | null>(null);
  const [tempNotes, setTempNotes] = useState<string>("");

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
      setCategories(data.categories);
      setMenuItems(data.menuItems);

      // If active session exists, fetch live orders
      if (data.table?.activeSessionId) {
        fetchSessionOrders(data.table.activeSessionId);
      }
    } catch (err: unknown) {
      setError("Unable to connect to restaurant server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Poll active orders for this table in real-time
  const fetchSessionOrders = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions?sessionId=${sessionId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Order polling failed", err);
    }
  };

  useEffect(() => {
    loadTableAndMenu();
  }, [tablePublicId]);

  // Periodic poll every 4s for live order progress & kitchen tracking
  useEffect(() => {
    if (!table?.activeSessionId) return;
    const interval = setInterval(() => {
      fetchSessionOrders(table.activeSessionId!);
    }, 4000);
    return () => clearInterval(interval);
  }, [table?.activeSessionId]);

  // Cart Operations
  const addToCart = (item: MenuItem, notes?: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItem.id === item.id
            ? { ...c, quantity: c.quantity + 1, specialInstructions: notes || c.specialInstructions }
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

  // Cart Totals in INR
  const cartSubtotal = cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  const taxRate = restaurant?.taxRate ?? 0.05; // 5% GST
  const cartTax = Math.round(cartSubtotal * taxRate);
  const cartTotal = cartSubtotal + cartTax;
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Submit Order to Kitchen
  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !table) return;

    try {
      setOrderSubmitting(true);
      const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const payload = {
        restaurantId: restaurant?.id || "rest_default_01",
        tablePublicId: table.publicId,
        source: "qr",
        idempotencyKey,
        items: cart.map((c) => ({
          menuItemId: c.menuItem.id,
          quantity: c.quantity,
          specialInstructions: c.specialInstructions || undefined,
        })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Order placement failed.");
        return;
      }

      setCart([]);
      setIsCartOpen(false);

      // Refresh table status & orders
      await loadTableAndMenu();
      if (data.order?.sessionId) {
        fetchSessionOrders(data.order.sessionId);
      }
    } catch (err: unknown) {
      alert("Network error. Please try again.");
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Request Table Bill
  const handleRequestBill = async () => {
    if (!table?.activeSessionId) {
      alert("No active session with orders found for this table.");
      return;
    }

    try {
      const res = await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: table.activeSessionId,
          paymentMethod: "cash",
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

  // Active Orders Aggregates
  const totalActiveExpenditure = activeOrders.reduce((sum, o) => sum + o.total, 0);

  // Calculate estimated time remaining for latest active order
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
        };
      case "served":
        return {
          stage: "Delivered to Your Table",
          location: `Table ${order.tableNumberSnapshot}`,
          color: "bg-purple-50 text-purple-800 border-purple-200",
          progress: 100,
          etaMinutes: 0,
          icon: CheckCircle2,
        };
      default:
        return {
          stage: order.status.replace("_", " "),
          location: "Kitchen",
          color: "bg-slate-50 text-slate-700 border-slate-200",
          progress: 50,
          etaMinutes: 15,
          icon: Timer,
        };
    }
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      selectedCategory === "all" || item.categoryId === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-800">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4 shadow-sm" />
        <p className="text-slate-600 text-sm font-bold tracking-tight">
          Opening Gourmet Menu...
        </p>
      </div>
    );
  }

  if (error || !table) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800 text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mb-4 shadow-xs">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold mb-2 text-slate-900">Table QR Not Found</h2>
        <p className="text-slate-500 text-sm max-w-sm mb-6 leading-relaxed">
          {error || "The table code is invalid or no longer active. Please ask your server for assistance."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-36">
      {/* Top Banner / Restaurant Info */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-tight text-slate-900 leading-tight">
                {restaurant?.name}
              </h1>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                  Table {table.tableNumber}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {table.displayName}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleRequestBill}
            disabled={billRequested}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
              billRequested
                ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs"
                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs"
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-blue-600" />
            <span>{billRequested ? "Bill Called" : "Request Bill"}</span>
          </button>
        </div>

        {/* Live Active Order Status Pill (If Customer has active placed orders) */}
        {activeOrders.length > 0 && (
          <div className="max-w-md mx-auto px-4 pb-2.5">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/90 rounded-2xl p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
                  <span className="text-xs font-extrabold text-blue-900">
                    Active Order #{activeOrders[0].orderNumber}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-600">
                  Total: <strong className="text-blue-700 font-black">{formatCurrency(totalActiveExpenditure)}</strong>
                </span>
              </div>

              {/* Progress and Live Location */}
              {(() => {
                const stage = getOrderStageInfo(activeOrders[0]);
                const StageIcon = stage.icon;
                return (
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1">
                      <span className="flex items-center gap-1 text-blue-800">
                        <StageIcon className="w-3.5 h-3.5 text-blue-600" />
                        {stage.stage}
                      </span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <Clock className="w-3 h-3 text-amber-600" />
                        {stage.etaMinutes > 0 ? `~${stage.etaMinutes} mins remaining` : "Served"}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-blue-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${stage.progress}%` }}
                      />
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1.5 font-medium">
                      <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                      <span>Where is your order: <strong className="text-slate-800 font-bold">{stage.location}</strong></span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="max-w-md mx-auto px-4 pb-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search dishes, starters, biryani, shakes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition shadow-inner"
            />
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="max-w-md mx-auto px-4 flex gap-2 overflow-x-auto no-scrollbar pb-3">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-xs ${
              selectedCategory === "all"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            All Dishes ({menuItems.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-xs ${
                selectedCategory === cat.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* Main Dishes Catalog */}
      <main className="max-w-md mx-auto px-4 mt-4 space-y-3.5">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            No dishes found matching &quot;{searchQuery}&quot;.
          </div>
        ) : (
          filteredItems.map((item) => {
            const inCart = cart.find((c) => c.menuItem.id === item.id);
            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200/90 rounded-3xl p-4 flex gap-3.5 shadow-xs hover:shadow-md hover:border-blue-300 transition duration-200"
              >
                {/* Food Photo */}
                {item.imageUrl && (
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100 shadow-inner">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1.5 left-1.5">
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs ${
                          item.foodType === "veg"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : item.foodType === "vegan"
                            ? "bg-green-100 text-green-800 border border-green-300"
                            : "bg-red-100 text-red-800 border border-red-300"
                        }`}
                      >
                        {item.foodType.toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Dish Information */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed font-normal">
                      {item.description}
                    </p>
                    {item.preparationMetadata?.avgPrepTimeMinutes && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-semibold mt-1">
                        <Clock className="w-3 h-3 text-amber-500" />
                        ~{item.preparationMetadata.avgPrepTimeMinutes} mins prep
                      </span>
                    )}
                  </div>

                  {/* Pricing and First Add / Stepper */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                    <span className="font-black text-blue-600 text-sm">
                      {formatCurrency(item.price)}
                    </span>

                    {inCart ? (
                      <div className="flex items-center bg-blue-50 rounded-xl p-0.5 border border-blue-200">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-700 hover:bg-blue-100 font-bold"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center text-xs font-black text-blue-900">
                          {inCart.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-700 hover:bg-blue-100 font-bold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedItemForNotes(item);
                          setTempNotes("");
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm shadow-blue-500/20 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-4 inset-x-0 z-40 max-w-md mx-auto px-4">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold p-4 rounded-3xl flex items-center justify-between shadow-xl shadow-blue-600/30 transition-all transform active:scale-98"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center text-xs font-black">
                {totalItemCount}
              </div>
              <div className="text-left">
                <span className="text-xs font-bold block opacity-90 leading-none">
                  {totalItemCount} {totalItemCount === 1 ? "Item" : "Items"} in Cart
                </span>
                <span className="text-sm font-black tracking-tight leading-tight">
                  Review &amp; Place Order
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] opacity-80 block uppercase font-bold tracking-wider">
                Total
              </span>
              <span className="text-base font-black tracking-tight">
                {formatCurrency(cartTotal)}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Custom Note Dialog when customer first adds an item */}
      {selectedItemForNotes && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-5 text-slate-800 shadow-2xl">
            <h3 className="font-extrabold text-base text-slate-900 mb-1">
              Add {selectedItemForNotes.name}
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Price: <strong className="text-blue-600 font-bold">{formatCurrency(selectedItemForNotes.price)}</strong>
            </p>

            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Special Cooking Instructions (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Less spicy, no onions, extra crispy..."
              value={tempNotes}
              onChange={(e) => setTempNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition mb-4"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedItemForNotes(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  addToCart(selectedItemForNotes, tempNotes);
                  setSelectedItemForNotes(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm shadow-blue-500/20"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Review & Placement Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150">
          <div className="bg-white border-t border-slate-200 rounded-t-3xl max-w-md w-full mx-auto p-5 max-h-[88vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">Your Order Cart</h2>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Table {table.tableNumber} • Manual Confirmation
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

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {cart.map((c) => (
                <div
                  key={c.menuItem.id}
                  className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {c.menuItem.name}
                      </h4>
                      <div className="text-[11px] text-blue-600 font-extrabold mt-0.5">
                        {formatCurrency(c.menuItem.price * c.quantity)}
                      </div>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center bg-white rounded-xl p-0.5 border border-slate-200 shadow-2xs">
                      <button
                        onClick={() => updateQuantity(c.menuItem.id, -1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-slate-800">
                        {c.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(c.menuItem.id, 1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Special instruction notes */}
                  <input
                    type="text"
                    placeholder="Notes for chef: less spicy, no onions..."
                    value={c.specialInstructions || ""}
                    onChange={(e) =>
                      updateInstructions(c.menuItem.id, e.target.value)
                    }
                    className="w-full mt-2.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition"
                  />
                </div>
              ))}
            </div>

            {/* Price Breakdown in INR */}
            <div className="border-t border-slate-100 pt-3.5 space-y-2 text-xs text-slate-500">
              <div className="flex justify-between font-medium">
                <span>Subtotal ({totalItemCount} items)</span>
                <span className="text-slate-900 font-bold">{formatCurrency(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>GST &amp; Taxes ({Math.round(taxRate * 100)}%)</span>
                <span className="text-slate-900 font-bold">{formatCurrency(cartTax)}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-100">
                <span>Total Amount</span>
                <span className="text-blue-600 font-black text-base">{formatCurrency(cartTotal)}</span>
              </div>
            </div>

            {/* Estimated Prep Time Notice */}
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-2.5 mt-3 flex items-center gap-2 text-[11px] text-blue-900">
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Estimated preparation time: <strong>~15-20 minutes</strong> from order placement.</span>
            </div>

            {/* Final Confirmation CTA */}
            <button
              onClick={handlePlaceOrder}
              disabled={orderSubmitting || cart.length === 0}
              className="mt-3.5 w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition disabled:opacity-50"
            >
              {orderSubmitting ? (
                <span>Transmitting to Kitchen...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Confirm Order ({formatCurrency(cartTotal)})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
