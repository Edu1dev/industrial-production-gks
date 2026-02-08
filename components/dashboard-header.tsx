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
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

interface DashboardHeaderProps {
  operator: { id: number; name: string; login: string };
}

const navItems = [
  { href: "/", label: "Producao", icon: Activity },
  { href: "/operadores", label: "Operadores", icon: Users },
  { href: "/operacoes", label: "Operacoes", icon: Wrench },
  { href: "/historico", label: "Historico", icon: History },
];

export function DashboardHeader({ operator }: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Sessao encerrada");
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-primary-foreground/10 bg-primary shadow-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
            <Factory className="h-5 w-5 text-accent-foreground" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold leading-tight text-primary-foreground">
              ProTrack
            </h1>
            <p className="text-xs text-primary-foreground/60">
              Apontamento de Producao
            </p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Navegacao principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-xl bg-primary-foreground/10 px-4 py-2 sm:flex">
            <User className="h-4 w-4 text-primary-foreground/70" />
            <span className="text-sm font-semibold text-primary-foreground">
              {operator.name}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/10 text-primary-foreground/70 transition-colors hover:bg-primary-foreground/20 hover:text-primary-foreground"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/10 text-primary-foreground/70 transition-colors hover:bg-primary-foreground/20 md:hidden"
            aria-label="Menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {menuOpen && (
        <nav className="border-t border-primary-foreground/10 bg-primary px-4 py-3 md:hidden" aria-label="Navegacao mobile">
          <div className="flex flex-col gap-1">
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-primary-foreground/10 px-4 py-2 sm:hidden">
              <User className="h-4 w-4 text-primary-foreground/70" />
              <span className="text-sm font-semibold text-primary-foreground">
                {operator.name}
              </span>
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-all ${
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </a>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
