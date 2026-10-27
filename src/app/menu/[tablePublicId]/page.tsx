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
  Heart,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { MenuCategory, MenuItem, Restaurant, Table } from "@/types";

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

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [billRequested, setBillRequested] = useState(false);

  // Load menu and table context
  useEffect(() => {
    async function loadTableAndMenu() {
      try {
        setLoading(true);
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
      } catch (err: unknown) {
        setError("Unable to connect to restaurant server. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    loadTableAndMenu();
  }, [tablePublicId]);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menuItem: item, quantity: 1 }];
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

  // Calculations
  const cartSubtotal = cart.reduce(
    (sum, item) => sum + item.menuItem.price * item.quantity,
    0
  );
  const taxRate = restaurant?.taxRate || 0.08;
  const cartTax = Number((cartSubtotal * taxRate).toFixed(2));
  const cartTotal = Number((cartSubtotal + cartTax).toFixed(2));
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Submit order to API
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

      setOrderSuccess(data.order.orderNumber);
      setCart([]);
      setIsCartOpen(false);
    } catch (err: unknown) {
      alert("Network error. Please try again.");
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Request Bill
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
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-500 text-sm font-semibold">
          Loading gourmet menu...
        </p>
      </div>
    );
  }

  if (error || !table) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mb-4 shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2 text-slate-900">QR Code Not Found</h2>
        <p className="text-slate-500 text-sm max-w-sm mb-6">
          {error || "The table code is invalid or no longer active. Please ask your waiter for assistance."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-28">
      {/* Top Banner / Restaurant Info */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-tight text-slate-900 leading-tight">
                {restaurant?.name}
              </h1>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">
                  Table {table.tableNumber}
                </span>
                <span className="text-[11px] text-slate-400">
                  {table.displayName}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleRequestBill}
            disabled={billRequested}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
              billRequested
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs"
                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs"
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-blue-600" />
            <span>{billRequested ? "Bill Called" : "Request Bill"}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="max-w-md mx-auto px-4 pb-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search dishes, burgers, drinks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition shadow-inner"
            />
          </div>
        </div>

        {/* Category Horizontal Scrolling Tabs */}
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

      {/* Order Success Alert Banner */}
      {orderSuccess && (
        <div className="max-w-md mx-auto px-4 mt-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start space-x-3 text-emerald-800 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-emerald-900 block text-sm">
                Order {orderSuccess} Sent to Kitchen!
              </span>
              Our culinary team is preparing your food now. You can order additional dishes anytime.
            </div>
          </div>
        </div>
      )}

      {/* Food Items List */}
      <main className="max-w-md mx-auto px-4 mt-4 space-y-3.5">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No dishes found matching your search.
          </div>
        ) : (
          filteredItems.map((item) => {
            const inCart = cart.find((c) => c.menuItem.id === item.id);
            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-3.5 flex gap-3.5 shadow-xs hover:shadow-md hover:border-blue-300 transition duration-200"
              >
                {/* Food Image */}
                {item.imageUrl && (
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100 shadow-inner">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 left-1">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs ${
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

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="font-extrabold text-blue-600 text-sm">
                      {formatCurrency(item.price, item.currency)}
                    </span>

                    {inCart ? (
                      <div className="flex items-center bg-blue-50 rounded-xl p-0.5 border border-blue-200">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-700 hover:bg-blue-100"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center text-xs font-bold text-blue-900">
                          {inCart.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-700 hover:bg-blue-100"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item)}
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
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-4 rounded-2xl flex items-center justify-between shadow-xl shadow-blue-600/30 transition-all transform active:scale-98"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/20 text-white flex items-center justify-center text-xs font-bold">
                {totalItemCount}
              </div>
              <span className="text-sm font-bold">View Order Details</span>
            </div>
            <span className="text-base font-extrabold tracking-tight">
              {formatCurrency(cartTotal)}
            </span>
          </button>
        </div>
      )}

      {/* Cart Modal / Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-150">
          <div className="bg-white border-t border-slate-200 rounded-t-3xl max-w-md w-full mx-auto p-5 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">Your Order</h2>
                <span className="text-xs text-slate-400 font-semibold">
                  (Table {table.tableNumber})
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {cart.map((c) => (
                <div
                  key={c.menuItem.id}
                  className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80 shadow-2xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {c.menuItem.name}
                      </h4>
                      <div className="text-[11px] text-blue-600 font-bold mt-0.5">
                        {formatCurrency(c.menuItem.price * c.quantity)}
                      </div>
                    </div>

                    <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-200 shadow-2xs">
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
                    placeholder="Add cooking notes (e.g. less spicy)..."
                    value={c.specialInstructions || ""}
                    onChange={(e) =>
                      updateInstructions(c.menuItem.id, e.target.value)
                    }
                    className="w-full mt-2.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition"
                  />
                </div>
              ))}
            </div>

            {/* Bill Breakdown */}
            <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-slate-800 font-semibold">{formatCurrency(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Tax ({Math.round(taxRate * 100)}%)</span>
                <span className="text-slate-800 font-semibold">{formatCurrency(cartTax)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-100">
                <span>Total Due</span>
                <span className="text-blue-600 font-extrabold text-base">{formatCurrency(cartTotal)}</span>
              </div>
            </div>

            {/* Place Order CTA */}
            <button
              onClick={handlePlaceOrder}
              disabled={orderSubmitting || cart.length === 0}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition disabled:opacity-50"
            >
              {orderSubmitting ? (
                <span>Sending to Kitchen...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Confirm & Send Order ({formatCurrency(cartTotal)})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
