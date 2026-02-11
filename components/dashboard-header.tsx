"use client";

import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  Factory,
  LogOut,
  User,
  Activity,
  Users,
  Wrench,
  History,
  Building2,
  FolderKanban,
  Clock,
} from "lucide-react";

interface DashboardHeaderProps {
  operator: { id: number; name: string; login: string; is_admin: boolean };
}

export function DashboardHeader({ operator }: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Producao", icon: Activity, adminOnly: false },
    { href: "/dashboard/ponto", label: "Ponto", icon: Clock, adminOnly: true },
    { href: "/dashboard/ausencias", label: "Ausencias", icon: LogOut, adminOnly: true },
    { href: "/dashboard/projetos", label: "Projetos", icon: FolderKanban, adminOnly: true },
    { href: "/dashboard/operadores", label: "Operadores", icon: Users, adminOnly: true },
    { href: "/dashboard/operacoes", label: "Operacoes", icon: Wrench, adminOnly: true },
    { href: "/dashboard/empresas", label: "Empresas", icon: Building2, adminOnly: true },
    { href: "/dashboard/historico", label: "Historico", icon: History, adminOnly: true },
  ];

  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || operator.is_admin
  );

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Sessao encerrada");
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <>
      {/* Top Header - Logo, Username, Logout */}
      <header className="sticky top-0 z-50 border-b border-primary-foreground/10 bg-primary shadow-lg">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
              <Factory className="h-5 w-5 text-accent-foreground" />
            </div>
            <h1 className="text-lg font-bold leading-tight text-primary-foreground">
              GKS
            </h1>
          </div>

          {/* User Info + Logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-primary-foreground/10 px-3 py-1.5">
              <User className="h-4 w-4 text-primary-foreground/70" />
              <span className="text-sm font-semibold text-primary-foreground">
                {operator.name}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground/10 text-primary-foreground/70 transition-colors hover:bg-primary-foreground/20 hover:text-primary-foreground"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Bottom Navigation Bar - Mobile App Style */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-primary-foreground/10 bg-primary shadow-[0_-2px_10px_rgba(0,0,0,0.15)]"
        aria-label="Navegacao principal"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-around px-1 py-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-2 transition-all ${
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "text-primary-foreground/50 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate text-[10px] font-medium leading-tight">
                  {item.label}
                </span>
              </a>
            );
          })}
        </div>
      </nav>
    </>
  );
}
