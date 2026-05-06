"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { QrCode, LayoutDashboard } from "lucide-react";

export function DashboardSidebar() {
  const pathname = usePathname();

  const menuItems = [
    {
      href: "/dashboard",
      label: "Dashboard Logbook",
      icon: LayoutDashboard,
    },
  ];

  return (
    <aside className="w-full border-b border-slate-200 bg-white lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-200 px-6 py-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-2">
              <Image src="/images/spil_logo.svg" alt="SPIL" width={36} height={36} priority />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight text-slate-900">SPIL</div>
              <div className="text-sm text-slate-500">Visitor QR Dashboard</div>
            </div>
          </Link>
        </div>

        <div className="px-4 py-5">
          <div className="mb-3 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            <QrCode className="h-4 w-4" />
            Menu
          </div>
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}
