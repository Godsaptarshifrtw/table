import Link from "next/link";
import {
  UtensilsCrossed,
  QrCode,
  LayoutDashboard,
  ChefHat,
  ConciergeBell,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Sparkles,
  Smartphone,
  Layers,
  Zap,
} from "lucide-react";

export default function HomePage() {
  const interfaces = [
    {
      title: "Customer QR Menu (Table 05)",
      description:
        "Opaque QR-scanned mobile ordering portal with real-time cart, dietary badges, special instructions, and bill requests.",
      href: "/menu/tbl_pub_05",
      badge: "Customer Facing",
      color: "border-blue-200 hover:border-blue-500 hover:shadow-blue-500/10",
      iconBg: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
      icon: Smartphone,
    },
    {
      title: "Kitchen Display System (KDS)",
      description:
        "High-contrast ticket monitor for kitchen staff with elapsed-time clocks, item-level prep/ready toggles, delay alerts, and ticket chimes.",
      href: "/kitchen",
      badge: "Kitchen Staff",
      color: "border-amber-200 hover:border-amber-500 hover:shadow-amber-500/10",
      iconBg: "bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white",
      icon: ChefHat,
    },
    {
      title: "Waiter POS & Table Management",
      description:
        "Touch-friendly POS for servers to punch manual orders, monitor dishes ready to be served, and settle dining sessions.",
      href: "/waiter",
      badge: "Waitstaff / POS",
      color: "border-emerald-200 hover:border-emerald-500 hover:shadow-emerald-500/10",
      iconBg: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
      icon: ConciergeBell,
    },
    {
      title: "Executive Admin Dashboard",
      description:
        "Full restaurant operations hub: live revenue metrics, occupancy grid, QR code generator, order audit logs, and menu management.",
      href: "/admin",
      badge: "Management",
      color: "border-indigo-200 hover:border-indigo-500 hover:shadow-indigo-500/10",
      iconBg: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
      icon: LayoutDashboard,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/40 text-slate-800 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base text-slate-900 tracking-tight">
                TableSync <span className="text-blue-600">Pro</span>
              </span>
              <span className="block text-[10px] text-slate-400 font-semibold -mt-0.5">
                Modern Restaurant OS
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition"
            >
              Staff Portal Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 py-14 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-4 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Next.js & Firebase Real-Time Synchronization</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Seamless Dining, Ordering & Kitchen Flow
          </h1>
          <p className="text-sm sm:text-base text-slate-500 mt-4 leading-relaxed max-w-xl mx-auto">
            A cohesive web operating system connecting customer table QR menus, waitstaff handheld terminals, and kitchen displays into one synchronized workflow.
          </p>
        </div>

        {/* 4 Connected Interfaces Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {interfaces.map((intf) => {
            const Icon = intf.icon;
            return (
              <Link
                key={intf.href}
                href={intf.href}
                className={`group p-6 rounded-3xl bg-white border ${intf.color} transition-all duration-200 shadow-sm hover:shadow-xl flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl ${intf.iconBg} flex items-center justify-center transition-all duration-200 shadow-xs`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/60">
                      {intf.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition">
                    {intf.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {intf.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-bold text-blue-600 group-hover:translate-x-1 transition">
                  <span>Launch Interface</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Architectural Highlights */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Production Architecture Checklist
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-slate-600">
            <div className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-800 block">Opaque Table Tokens</strong>
                Cryptographic URLs avoid table number enumeration.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-800 block">Immutable Price Snapshots</strong>
                Orders retain original menu prices permanently.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-800 block">Atomic Table Sessions</strong>
                Prevents bill settlement while items remain in prep.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-800 block">Item-Level States</strong>
                Individual dish prep & serving tracked independently.
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400 bg-white">
        TableSync Pro • Modern Restaurant Management & Ordering Architecture
      </footer>
    </div>
  );
}
