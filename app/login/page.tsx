"use client";

import React from "react"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Factory,
  LogIn,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    login: "",
    password: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao processar");
        return;
      }

      toast.success(`Bem-vindo, ${data.operator.name}!`);

      // Full page navigation to ensure the cookie is sent with the request
      window.location.href = "/dashboard";
    } catch {
      toast.error("Erro de conexao");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-primary p-4">
      <div className="flex w-full max-w-md flex-col gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
            <Factory className="h-9 w-9 text-accent-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-primary-foreground">
              ProTrack
            </h1>
            <p className="mt-1 text-sm text-primary-foreground/70">
              Sistema de Apontamento de Producao
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl bg-card p-8 shadow-xl">
          <h2 className="mb-6 text-center text-xl font-bold text-card-foreground">
            Entrar no Sistema
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="login"
                className="mb-1.5 block text-sm font-medium text-card-foreground"
              >
                Login
              </label>
              <input
                id="login"
                type="text"
                required
                value={form.login}
                onChange={(e) =>
                  setForm({ ...form, login: e.target.value })
                }
                placeholder="Seu login"
                className="h-14 w-full rounded-xl border border-input bg-background px-4 text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-card-foreground"
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="Sua senha"
                  className="h-14 w-full rounded-xl border border-input bg-background px-4 pr-14 text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground"
                  aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-14 items-center justify-center gap-2 rounded-xl bg-accent text-lg font-bold text-accent-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Entrar
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
