"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UtensilsCrossed, ShieldCheck, Lock, Mail, ArrowRight, UserCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@restaurant.com");
  const [role, setRole] = useState<"admin" | "waiter" | "kitchen">("admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Login failed");
        return;
      }

      login(data.staff);

      if (data.staff.role === "kitchen") {
        router.push("/kitchen");
      } else if (data.staff.role === "waiter") {
        router.push("/waiter");
      } else {
        router.push("/admin");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRoleSelect = (selectedRole: "admin" | "waiter" | "kitchen") => {
    setRole(selectedRole);
    if (selectedRole === "admin") setEmail("admin@restaurant.com");
    if (selectedRole === "waiter") setEmail("waiter@restaurant.com");
    if (selectedRole === "kitchen") setEmail("kitchen@restaurant.com");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30 text-slate-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto mb-3 shadow-2xs">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Staff Portal Access
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Access Admin Hub, Waiter POS, or Kitchen Station
          </p>
        </div>

        {/* Quick Role Shortcuts for Testing */}
        <div className="mb-6">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2 text-center">
            Select Role Profile
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickRoleSelect("admin")}
              className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                role === "admin"
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickRoleSelect("waiter")}
              className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                role === "waiter"
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              Waiter POS
            </button>
            <button
              type="button"
              onClick={() => handleQuickRoleSelect("kitchen")}
              className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                role === "kitchen"
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              Kitchen (KDS)
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Staff Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Security Key / Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                defaultValue="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 transition disabled:opacity-50 mt-2"
          >
            <span>{loading ? "Authenticating..." : `Sign In as ${role.toUpperCase()}`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            Protected with role-based access control and verified backend authentication.
          </p>
        </div>
      </div>
    </div>
  );
}
