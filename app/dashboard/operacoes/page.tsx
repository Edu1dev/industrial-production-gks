"use client";

import React from "react";

import useSWR from "swr";
import { useState } from "react";
import { toast } from "sonner";
import {
  Wrench,
  Plus,
  Loader2,
  DollarSign,
  Settings,
  Pencil,
  Check,
  X,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const MACHINE_COST_FACTOR = 1.667;

function calcMachineCost(baseCost: number): number {
  return Math.round(baseCost * MACHINE_COST_FACTOR * 100) / 100;
}

interface Operation {
  id: number;
  name: string;
  base_cost_per_hour: number;
  machine_cost_per_hour: number;
}

export default function OperacoesPage() {
  const { data, mutate, isLoading } = useSWR("/api/operations", fetcher);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", base_cost_per_hour: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const operations: Operation[] = data?.operations || [];

  const formBaseCost = parseFloat(form.base_cost_per_hour) || 0;
  const formMachineCost = calcMachineCost(formBaseCost);

  const editBaseCost = parseFloat(editValue) || 0;
  const editMachineCost = calcMachineCost(editBaseCost);

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
          base_cost_per_hour: formBaseCost,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao salvar");
        return;
      }

      toast.success(`Operacao "${form.name}" salva com sucesso!`);
      setForm({ name: "", base_cost_per_hour: "" });
      setShowForm(false);
      mutate();
    } catch {
      toast.error("Erro de conexao");
    } finally {
      setSaving(false);
    }
  }

  function startEditing(op: Operation) {
    setEditingId(op.id);
    setEditValue(Number(op.base_cost_per_hour).toFixed(2));
  }

  function cancelEditing() {
    setEditingId(null);
    setEditValue("");
  }

  async function handleEditSave(id: number) {
    setEditSaving(true);
    try {
      const res = await fetch("/api/operations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          base_cost_per_hour: editBaseCost,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao atualizar");
        return;
      }

      toast.success("Valor/hora atualizado!");
      setEditingId(null);
      setEditValue("");
      mutate();
    } catch {
      toast.error("Erro de conexao");
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Page Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Wrench className="h-6 w-6 text-accent" />
            Operações
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerenciar tipos de operacao e custos de maquina
          </p>
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
                htmlFor="op_base_cost"
                className="mb-1.5 block text-sm font-medium text-card-foreground"
              >
                Custo Base/Hora (R$)
              </label>
              <input
                id="op_base_cost"
                type="number"
                min="0"
                step="0.01"
                value={form.base_cost_per_hour}
                onChange={(e) =>
                  setForm({ ...form, base_cost_per_hour: e.target.value })
                }
                placeholder="0.00"
                className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
              {formBaseCost > 0 && (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Custo Maquina/Hora: <span className="font-semibold text-foreground">R$ {formMachineCost.toFixed(2)}</span>
                  <span className="ml-1 text-xs">(x 1.667)</span>
                </p>
              )}
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
                {editingId !== op.id && (
                  <button
                    onClick={() => startEditing(op)}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Editar custo base/hora"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-muted p-3">
                <DollarSign className="h-5 w-5 text-accent" />
                {editingId === op.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">
                        Custo Base/Hora
                      </p>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-lg font-bold text-foreground">
                          R$
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleEditSave(op.id);
                            if (e.key === "Escape") cancelEditing();
                          }}
                          autoFocus
                          className="w-28 rounded-lg border border-input bg-background px-2 py-1 font-mono text-lg font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </div>
                      {editBaseCost > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Maquina/Hora: R$ {editMachineCost.toFixed(2)} <span className="text-[10px]">(x 1.667)</span>
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditSave(op.id)}
                        disabled={editSaving}
                        className="rounded-lg bg-[hsl(var(--success))] p-2 text-[hsl(var(--success-foreground))] transition-colors hover:opacity-90 disabled:opacity-50"
                        title="Salvar"
                      >
                        {editSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={cancelEditing}
                        disabled={editSaving}
                        className="rounded-lg bg-muted-foreground/20 p-2 text-muted-foreground transition-colors hover:bg-muted-foreground/30 disabled:opacity-50"
                        title="Cancelar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Custo Base/Hora
                        </p>
                        <p className="font-mono text-lg font-bold text-foreground">
                          R$ {Number(op.base_cost_per_hour).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          Maquina/Hora <span className="text-[10px]">(x 1.667)</span>
                        </p>
                        <p className="font-mono text-lg font-bold text-accent">
                          R$ {Number(op.machine_cost_per_hour).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
