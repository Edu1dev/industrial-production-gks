"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react"; // Import ArrowLeft here

import React from "react";

import useSWR from "swr";
import { useState } from "react";
import { toast } from "sonner";
import {
  Users,
  Trophy,
  Clock,
  AlertTriangle,
  TrendingUp,
  UserPlus,
  Loader2,
  Package,
  Eye,
  Pencil,
  Trash2,
  Key,
  X,
  AlertCircle,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Operator {
  id: number;
  name: string;
  login: string;
  created_at: string;
  total_finished: number;
  active_count: number;
  avg_time_per_piece_min: number | null;
  best_time_per_piece_min: number | null;
  worst_time_per_piece_min: number | null;
  total_pieces: number;
}

export default function OperadoresPage() {
  const { data, mutate, isLoading } = useSWR("/api/operators", fetcher);
  const [showForm, setShowForm] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", login: "", password: "", is_admin: false });

  // Management State
  const [editingUnlocks, setEditingUnlocks] = useState<number | null>(null); // ID of operator to change password
  const [newPassword, setNewPassword] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const operators: Operator[] = data?.operators || [];

  // Find best/worst operators
  const rankedOperators = operators
    .filter((o) => o.avg_time_per_piece_min !== null)
    .sort(
      (a, b) => (a.avg_time_per_piece_min || 0) - (b.avg_time_per_piece_min || 0),
    );

  const bestOperator = rankedOperators[0] || null;
  const worstOperator =
    rankedOperators.length > 1
      ? rankedOperators[rankedOperators.length - 1]
      : null;

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.login || !form.password) {
      toast.error("Preencha todos os campos");
      return;
    }

    setRegistering(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao cadastrar");
        return;
      }

      toast.success(`Operador "${form.name}" cadastrado com sucesso!`);
      setForm({ name: "", login: "", password: "", is_admin: false });
      setShowForm(false);
      mutate();
    } catch {
      toast.error("Erro de conexao");
    } finally {
      setRegistering(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUnlocks || !newPassword) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/operators/${editingUnlocks}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao atualizar senha");
        return;
      }

      toast.success("Senha atualizada com sucesso");
      setEditingUnlocks(null);
      setNewPassword("");
    } catch {
      toast.error("Erro de conexao");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!deletingId) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/operators/${deletingId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao excluir operador");
        return;
      }

      toast.success("Operador excluido com sucesso");
      setDeletingId(null);
      mutate();
    } catch {
      toast.error("Erro de conexao");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Page Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Users className="h-6 w-6 text-accent" />
            Operadores
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerenciar operadores e comparar desempenho
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex h-12 items-center gap-2 rounded-xl bg-accent px-5 font-bold text-accent-foreground transition-all hover:opacity-90"
        >
          <UserPlus className="h-5 w-5" />
          Novo Operador
        </button>
      </div>

      {/* Register Form */}
      {showForm && (
        <form
          onSubmit={handleRegister}
          className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-bold text-card-foreground">
            Cadastrar Novo Operador
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label
                htmlFor="reg_name"
                className="mb-1.5 block text-sm font-medium text-card-foreground"
              >
                Nome Completo *
              </label>
              <input
                id="reg_name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Joao Silva"
                className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label
                htmlFor="reg_login"
                className="mb-1.5 block text-sm font-medium text-card-foreground"
              >
                Login *
              </label>
              <input
                id="reg_login"
                type="text"
                required
                value={form.login}
                onChange={(e) => setForm({ ...form, login: e.target.value })}
                placeholder="Ex: joao"
                className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label
                htmlFor="reg_password"
                className="mb-1.5 block text-sm font-medium text-card-foreground"
              >
                Senha *
              </label>
              <div className="relative">
                <input
                  id="reg_password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={4}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="Min. 4 caracteres"
                  className="h-14 w-full rounded-xl border border-input bg-background px-4 pr-14 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
          </div>

          {/* Admin Checkbox */}
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-4">
            <input
              id="is_admin"
              type="checkbox"
              checked={form.is_admin}
              onChange={(e) => setForm({ ...form, is_admin: e.target.checked })}
              className="h-5 w-5 rounded border-input text-accent focus:ring-2 focus:ring-accent"
            />
            <label htmlFor="is_admin" className="flex-1 cursor-pointer">
              <span className="block text-sm font-semibold text-card-foreground">
                Administrador
              </span>
              <span className="block text-xs text-muted-foreground">
                Admins podem criar empresas, operadores e alterar configurações
              </span>
            </label>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={registering}
              className="flex h-12 items-center gap-2 rounded-xl bg-[hsl(var(--success))] px-6 font-bold text-[hsl(var(--success-foreground))] transition-all hover:opacity-90 disabled:opacity-50"
            >
              {registering ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <UserPlus className="h-5 w-5" />
              )}
              Cadastrar
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex h-12 items-center rounded-xl bg-muted px-6 font-medium text-muted-foreground transition-colors hover:bg-muted/80"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Performance Summary Cards */}
      {rankedOperators.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bestOperator && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--success))]/10">
                  <Trophy className="h-5 w-5 text-[hsl(var(--success))]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Operador Mais Rapido
                  </p>
                  <p className="text-base font-bold text-card-foreground">
                    {bestOperator.name}
                  </p>
                </div>
              </div>
              <p className="font-mono text-2xl font-bold text-[hsl(var(--success))]">
                {bestOperator.avg_time_per_piece_min}min
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}
                  /peca
                </span>
              </p>
            </div>
          )}

          {worstOperator && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Operador Mais Lento
                  </p>
                  <p className="text-base font-bold text-card-foreground">
                    {worstOperator.name}
                  </p>
                </div>
              </div>
              <p className="font-mono text-2xl font-bold text-destructive">
                {worstOperator.avg_time_per_piece_min}min
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}
                  /peca
                </span>
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Total Operadores
                </p>
                <p className="text-base font-bold text-card-foreground">
                  {operators.length} cadastrados
                </p>
              </div>
            </div>
            <p className="font-mono text-2xl font-bold text-accent">
              {operators.reduce((sum, o) => sum + Number(o.total_pieces || 0), 0)}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                pecas totais
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Operators Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : operators.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <Users className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
          <h3 className="mb-1 text-lg font-semibold text-card-foreground">
            Nenhum operador cadastrado
          </h3>
          <p className="text-sm text-muted-foreground">
            Clique em "Novo Operador" para cadastrar o primeiro.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="flex flex-col gap-3 md:hidden">
            {operators.map((op, i) => {
              const rank = rankedOperators.findIndex((r) => r.id === op.id);
              return (
                <div key={op.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {rank >= 0 ? (
                        <span
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${rank === 0
                            ? "bg-accent text-accent-foreground"
                            : rank === 1
                              ? "bg-muted-foreground/20 text-foreground"
                              : "bg-muted text-muted-foreground"
                            }`}
                        >
                          {rank + 1}
                        </span>
                      ) : (
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground">
                          {i + 1}
                        </span>
                      )}
                      <div>
                        <p className="font-semibold text-foreground">{op.name}</p>
                        <p className="text-xs text-muted-foreground">@{op.login}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {Number(op.active_count) > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-[hsl(var(--success))]/10 px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--success))]">
                          {op.active_count} ativa(s)
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          Inativo
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 rounded-xl bg-muted/50 p-3">
                    <div className="text-center">
                      <p className="text-[10px] font-medium uppercase text-muted-foreground">Producoes</p>
                      <p className="font-mono text-sm font-bold text-foreground">{op.total_finished || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-medium uppercase text-muted-foreground">Pecas</p>
                      <p className="font-mono text-sm font-bold text-foreground">{op.total_pieces || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-medium uppercase text-muted-foreground">Tempo Med.</p>
                      <p className="font-mono text-sm font-bold text-foreground">
                        {op.avg_time_per_piece_min ? `${op.avg_time_per_piece_min}min` : "-"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-3">
                    <div className="text-center">
                      <p className="text-[10px] font-medium uppercase text-muted-foreground">Melhor</p>
                      <p className="font-mono text-sm font-bold text-[hsl(var(--success))]">
                        {op.best_time_per_piece_min ? `${op.best_time_per_piece_min}min` : "-"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-medium uppercase text-muted-foreground">Pior</p>
                      <p className="font-mono text-sm font-bold text-destructive">
                        {op.worst_time_per_piece_min ? `${op.worst_time_per_piece_min}min` : "-"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingUnlocks(op.id);
                        setNewPassword("");
                      }}
                      className="flex h-9 items-center gap-1.5 rounded-lg bg-muted px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                    >
                      <Key className="h-3.5 w-3.5" />
                      Senha
                    </button>
                    <button
                      onClick={() => setDeletingId(op.id)}
                      className="flex h-9 items-center gap-1.5 rounded-lg bg-destructive/10 px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden rounded-2xl border border-border bg-card shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="px-4 py-3 text-left font-semibold text-foreground">
                      #
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">
                      Operador
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">
                      <span className="flex items-center justify-center gap-1">
                        <Package className="h-3.5 w-3.5" />
                        Producoes
                      </span>
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">
                      <span className="flex items-center justify-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Pecas
                      </span>
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">
                      <span className="flex items-center justify-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Tempo Med./Peca
                      </span>
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">
                      Melhor Tempo
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">
                      Pior Tempo
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      Acoes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {operators.map((op, i) => {
                    const rank = rankedOperators.findIndex(
                      (r) => r.id === op.id,
                    );
                    return (
                      <tr
                        key={op.id}
                        className="border-b border-border transition-colors last:border-0 hover:bg-muted/50"
                      >
                        <td className="px-4 py-3">
                          {rank >= 0 ? (
                            <span
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${rank === 0
                                ? "bg-accent text-accent-foreground"
                                : rank === 1
                                  ? "bg-muted-foreground/20 text-foreground"
                                  : "bg-muted text-muted-foreground"
                                }`}
                            >
                              {rank + 1}
                            </span>
                          ) : (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                              {i + 1}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <span className="font-semibold text-foreground">
                              {op.name}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              @{op.login}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-foreground">
                          {op.total_finished || 0}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-foreground">
                          {op.total_pieces || 0}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {op.avg_time_per_piece_min ? (
                            <span className="font-mono font-bold text-foreground">
                              {op.avg_time_per_piece_min}min
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {op.best_time_per_piece_min ? (
                            <span className="font-mono font-bold text-[hsl(var(--success))]">
                              {op.best_time_per_piece_min}min
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {op.worst_time_per_piece_min ? (
                            <span className="font-mono font-bold text-destructive">
                              {op.worst_time_per_piece_min}min
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {Number(op.active_count) > 0 ? (
                            <span className="inline-flex items-center rounded-full bg-[hsl(var(--success))]/10 px-2.5 py-0.5 text-xs font-semibold text-[hsl(var(--success))]">
                              {op.active_count} ativa(s)
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                              Inativo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingUnlocks(op.id);
                                setNewPassword("");
                              }}
                              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              title="Alterar Senha"
                            >
                              <Key className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeletingId(op.id)}
                              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              title="Excluir Operador"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Password Change Modal */}
      {editingUnlocks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleUpdatePassword}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-card-foreground">
                  Alterar Senha
                </h3>
                <p className="text-sm text-muted-foreground">
                  Digite a nova senha para o operador.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUnlocks(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6">
              <label
                htmlFor="new_password"
                className="mb-1.5 block text-sm font-medium text-card-foreground"
              >
                Nova Senha
              </label>
              <input
                id="new_password"
                type="text"
                required
                minLength={4}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 4 caracteres"
                className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingUnlocks(null)}
                className="h-10 rounded-xl bg-muted px-4 font-medium text-muted-foreground transition-colors hover:bg-muted/80"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex h-10 items-center gap-2 rounded-xl bg-accent px-4 font-bold text-accent-foreground transition-all hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar Senha
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>

            <h3 className="mb-2 text-lg font-bold text-card-foreground">
              Confirmar Exclusao
            </h3>
            <p className="mb-6 text-muted-foreground">
              Tem certeza que deseja excluir este operador? Esta acao nao pode ser desfeita.
              <br />
              <span className="text-xs opacity-70">
                Nota: Operadores com producoes registradas nao podem ser excluidos.
              </span>
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="h-10 rounded-xl bg-muted px-4 font-medium text-muted-foreground transition-colors hover:bg-muted/80"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="flex h-10 items-center gap-2 rounded-xl bg-destructive px-4 font-bold text-destructive-foreground transition-all hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
