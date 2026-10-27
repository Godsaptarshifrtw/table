"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  UtensilsCrossed,
  LayoutDashboard,
  ChefHat,
  ConciergeBell,
  LogOut,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

export function StaffNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { staff, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const navLinks = [
    {
      href: "/admin",
      label: "Admin Hub",
      icon: LayoutDashboard,
      roles: ["admin"],
    },
    {
      href: "/waiter",
      label: "Waiter POS",
      icon: ConciergeBell,
      roles: ["admin", "waiter"],
    },
    {
      href: "/kitchen",
      label: "Kitchen KDS",
      icon: ChefHat,
      roles: ["admin", "kitchen"],
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-tight text-slate-900 text-base leading-none">
                TableSync <span className="text-blue-600">Pro</span>
              </span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mt-1">
                Restaurant OS
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          {staff ? (
            <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200/80 pl-3 pr-2 py-1.5 rounded-xl">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-end gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  {staff.displayName}
                </div>
                <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">
                  {staff.role} Portal
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Log out"
                className="p-1.5 rounded-lg bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 transition shadow-xs"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              <span>Staff Login</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
