"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Factory, LogOut, User } from "lucide-react";

interface DashboardHeaderProps {
  operator: { id: number; name: string; login: string };
}

export function DashboardHeader({ operator }: DashboardHeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Sessao encerrada");
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-primary-foreground/10 bg-primary shadow-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
            <Factory className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-primary-foreground">
              ProTrack
            </h1>
            <p className="text-xs text-primary-foreground/60">
              Apontamento de Producao
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-xl bg-primary-foreground/10 px-4 py-2">
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
        </div>
      </div>
    </header>
  );
}
