"use client";

import React from "react"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Factory,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    login: "",
    password: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { login: form.login, password: form.password }
          : form;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao processar");
        return;
      }

      toast.success(
        mode === "login"
          ? `Bem-vindo, ${data.operator.name}!`
          : "Conta criada com sucesso!",
      );
      router.push("/");
      router.refresh();
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
          {/* Mode Toggle */}
          <div className="mb-6 flex rounded-xl bg-muted p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all ${
                mode === "login"
                  ? "bg-card text-card-foreground shadow-sm"
                  : "text-muted-foreground hover:text-card-foreground"
              }`}
            >
              <LogIn className="h-4 w-4" />
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all ${
                mode === "register"
                  ? "bg-card text-card-foreground shadow-sm"
                  : "text-muted-foreground hover:text-card-foreground"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Cadastrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "register" && (
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-sm font-medium text-card-foreground"
                >
                  Nome Completo
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="Ex: Joao Silva"
                  className="h-14 w-full rounded-xl border border-input bg-background px-4 text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            )}

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
              ) : mode === "login" ? (
                <>
                  <LogIn className="h-5 w-5" />
                  Entrar
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  Criar Conta
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
