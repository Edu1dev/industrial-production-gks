"use client";

import React from "react"

import useSWR from "swr";
import { useState } from "react";
import { toast } from "sonner";
import {
  Wrench,
  Plus,
  Loader2,
  ArrowLeft,
  DollarSign,
  Settings,
} from "lucide-react";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Operation {
  id: number;
  name: string;
  machine_cost_per_hour: number;
}

export default function OperacoesPage() {
  const { data, mutate, isLoading } = useSWR("/api/operations", fetcher);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", machine_cost_per_hour: "" });

  const operations: Operation[] = data?.operations || [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) {
      toast.error("Nome da operacao e obrigatorio");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          machine_cost_per_hour: form.machine_cost_per_hour
            ? parseFloat(form.machine_cost_per_hour)
            : 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao salvar");
        return;
      }

      toast.success(`Operacao "${form.name}" salva com sucesso!`);
      setForm({ name: "", machine_cost_per_hour: "" });
      setShowForm(false);
      mutate();
    } catch {
      toast.error("Erro de conexao");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Page Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Wrench className="h-6 w-6 text-accent" />
              Operacoes
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerenciar tipos de operacao e custos de maquina
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex h-12 items-center gap-2 rounded-xl bg-accent px-5 font-bold text-accent-foreground transition-all hover:opacity-90"
        >
          <Plus className="h-5 w-5" />
          Nova Operacao
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-bold text-card-foreground">
            Cadastrar / Atualizar Operacao
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="op_name"
                className="mb-1.5 block text-sm font-medium text-card-foreground"
              >
                Nome da Operacao *
              </label>
              <input
                id="op_name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Retifica, Furadeira..."
                className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label
                htmlFor="op_cost"
                className="mb-1.5 block text-sm font-medium text-card-foreground"
              >
                Custo por Hora (R$)
              </label>
              <input
                id="op_cost"
                type="number"
                min="0"
                step="0.01"
                value={form.machine_cost_per_hour}
                onChange={(e) =>
                  setForm({ ...form, machine_cost_per_hour: e.target.value })
                }
                placeholder="0.00"
                className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex h-12 items-center gap-2 rounded-xl bg-[hsl(var(--success))] px-6 font-bold text-[hsl(var(--success-foreground))] transition-all hover:opacity-90 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex h-12 items-center rounded-xl bg-muted px-6 font-medium text-muted-foreground transition-colors hover:bg-muted/80"
            >
              Cancelar
            </button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Se a operacao ja existir, o custo sera atualizado.
          </p>
        </form>
      )}

      {/* Operations List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : operations.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <Settings className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
          <h3 className="mb-1 text-lg font-semibold text-card-foreground">
            Nenhuma operacao cadastrada
          </h3>
          <p className="text-sm text-muted-foreground">
            Clique em "Nova Operacao" para cadastrar a primeira.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {operations.map((op) => (
            <div
              key={op.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Wrench className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-card-foreground">
                      {op.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      ID: {op.id}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-muted p-3">
                <DollarSign className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    Custo Maquina/Hora
                  </p>
                  <p className="font-mono text-lg font-bold text-foreground">
                    R$ {Number(op.machine_cost_per_hour).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
