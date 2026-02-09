"use client";

import React, { useEffect } from "react";

import { useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Loader2,
  Building2,
} from "lucide-react";
import { ProductionTimer } from "./production-timer";
import { FinishProductionDialog } from "./finish-production-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ProductionRecord {
  id: number;
  part_code: string;
  part_description?: string;
  operation_name: string;
  machine_cost_per_hour: number;
  material_cost: number;
  status: string;
  quantity: number;
  start_time: string;
  end_time?: string;
  total_pause_ms: number;
  last_pause_start?: string | null;
  expected_time_minutes?: number;
  charged_value?: number;
  operator_name: string;
  company_name?: string;
  project_id?: number | null;
}

interface ProductionControlsProps {
  record: ProductionRecord;
}

export function ProductionControls({ record }: ProductionControlsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [showPauseReasonDialog, setShowPauseReasonDialog] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const { mutate } = useSWRConfig();

  async function handleAction(action: string, extra?: Record<string, unknown>) {
    setLoading(action);
    try {
      const res = await fetch(`/api/production/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao processar");
        return;
      }

      const messages: Record<string, string> = {
        pause: "Producao pausada",
        resume: "Producao retomada",
        finish: "Producao finalizada!",
      };

      toast.success(messages[action] || "Acao realizada");
      mutate("/api/dashboard");
      mutate((key: string) => typeof key === "string" && key.startsWith("/api/production"), undefined, { revalidate: true });
    } catch {
      toast.error("Erro de conexao");
    } finally {
      setLoading(null);
    }
  }

  function handlePauseClick() {
    if (record.project_id) {
      // Project-based: require reason
      setShowPauseReasonDialog(true);
    } else {
      // Legacy: pause directly
      handleAction("pause");
    }
  }

  async function handlePauseWithReason() {
    if (!pauseReason.trim()) {
      toast.error("Informe o motivo da pausa");
      return;
    }
    setShowPauseReasonDialog(false);
    await handleAction("pause", { reason: pauseReason.trim() });
    setPauseReason("");
  }

  async function handleFinishClick() {
    // Se estiver em producao, pausar primeiro (silenciosamente)
    if (record.status === "EM_PRODUCAO") {
      setLoading("pause");
      try {
        const res = await fetch(`/api/production/${record.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "pause" }),
        });

        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error || "Erro ao pausar");
          setLoading(null);
          return;
        }

        mutate("/api/dashboard");
        mutate((key: string) => typeof key === "string" && key.startsWith("/api/production"), undefined, { revalidate: true });

        await new Promise(resolve => setTimeout(resolve, 500));
      } catch {
        toast.error("Erro de conexao");
        setLoading(null);
        return;
      } finally {
        setLoading(null);
      }
    }

    setShowFinishDialog(true);
  }

  const statusColors: Record<string, string> = {
    EM_PRODUCAO: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
    PAUSADO: "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]",
    FINALIZADO: "bg-muted text-muted-foreground",
  };

  const statusLabels: Record<string, string> = {
    EM_PRODUCAO: "Em Producao",
    PAUSADO: "Pausado",
    FINALIZADO: "Finalizado",
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xl font-bold text-card-foreground">
              {record.part_code}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[record.status]}`}
            >
              {statusLabels[record.status]}
            </span>
            {record.project_id && (
              <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                Projeto
              </span>
            )}
          </div>
          {record.part_description && (
            <p className="mt-0.5 text-sm text-muted-foreground truncate">
              {record.part_description}
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>Op: {record.operation_name}</span>
            <span>Qtd: {record.quantity}</span>
            <span>Operador: {record.operator_name}</span>
            {record.company_name && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {record.company_name}
              </span>
            )}
          </div>
        </div>

        {/* Timer */}
        <div className="flex-shrink-0 rounded-xl bg-primary px-4 py-2 text-primary-foreground">
          <ProductionTimer
            startTime={record.start_time}
            totalPauseMs={record.total_pause_ms || 0}
            status={record.status}
            lastPauseStart={record.last_pause_start}
          />
        </div>
      </div>

      {/* Action Buttons */}
      {record.status !== "FINALIZADO" && (
        <div className="flex gap-3">
          {record.status === "EM_PRODUCAO" && (
            <>
              <button
                onClick={handlePauseClick}
                disabled={loading !== null}
                className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--warning))] text-base font-bold text-[hsl(var(--warning-foreground))] transition-all hover:opacity-90 disabled:opacity-50"
              >
                {loading === "pause" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Pause className="h-5 w-5" />
                )}
                Pausar
              </button>
              <button
                onClick={handleFinishClick}
                disabled={loading !== null}
                className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-destructive text-base font-bold text-destructive-foreground transition-all hover:opacity-90 disabled:opacity-50"
              >
                {loading === "pause" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Square className="h-5 w-5" />
                )}
                Finalizar
              </button>
            </>
          )}

          {record.status === "PAUSADO" && (
            <>
              <button
                onClick={() => handleAction("resume")}
                disabled={loading !== null}
                className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--success))] text-base font-bold text-[hsl(var(--success-foreground))] transition-all hover:opacity-90 disabled:opacity-50"
              >
                {loading === "resume" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <RotateCcw className="h-5 w-5" />
                )}
                Retomar
              </button>
              <button
                onClick={handleFinishClick}
                disabled={loading !== null}
                className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-destructive text-base font-bold text-destructive-foreground transition-all hover:opacity-90 disabled:opacity-50"
              >
                <Square className="h-5 w-5" />
                Finalizar
              </button>
            </>
          )}
        </div>
      )}

      {/* Pause Reason Dialog */}
      <Dialog open={showPauseReasonDialog} onOpenChange={setShowPauseReasonDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Motivo da Pausa</DialogTitle>
            <DialogDescription>
              Selecione o motivo da pausa para a peça <strong className="font-mono">{record.part_code}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {/* Predefined reason buttons */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "Almoço", icon: "🍽️" },
                { value: "Fim do turno", icon: "🏠" },
                { value: "Manutenção", icon: "🔧" },
                { value: "Banheiro", icon: "🚻" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPauseReason(option.value)}
                  className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${pauseReason === option.value
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-background text-foreground hover:border-accent/50"
                    }`}
                >
                  <span>{option.icon}</span>
                  {option.value}
                </button>
              ))}
            </div>
            {/* Other option with text input */}
            <div>
              <button
                onClick={() => setPauseReason("Outro")}
                className={`w-full flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${pauseReason === "Outro" || (pauseReason && !["Almoço", "Fim do turno", "Manutenção", "Banheiro"].includes(pauseReason))
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-background text-foreground hover:border-accent/50"
                  }`}
              >
                <span>📝</span>
                Outro motivo
              </button>
              {(pauseReason === "Outro" || (pauseReason && !["Almoço", "Fim do turno", "Manutenção", "Banheiro"].includes(pauseReason))) && (
                <textarea
                  value={pauseReason === "Outro" ? "" : pauseReason}
                  onChange={(e) => setPauseReason(e.target.value || "Outro")}
                  placeholder="Descreva o motivo..."
                  rows={2}
                  className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  autoFocus
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPauseReasonDialog(false);
                setPauseReason("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePauseWithReason}
              disabled={!pauseReason.trim()}
              className="bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] hover:bg-[hsl(var(--warning))]/90 disabled:opacity-50"
            >
              <Pause className="mr-2 h-4 w-4" />
              Pausar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FinishProductionDialog
        open={showFinishDialog}
        onOpenChange={setShowFinishDialog}
        recordId={record.id}
        partCode={record.part_code}
        operationName={record.operation_name}
        projectId={record.project_id || null}
        onFinished={() => {
          mutate("/api/dashboard");
          mutate((key: string) => typeof key === "string" && key.startsWith("/api/production"), undefined, { revalidate: true });
        }}
      />
    </div>
  );
}

export function StartProductionForm({
  onStarted,
}: {
  onStarted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [operations, setOperations] = useState<
    { id: number; name: string; machine_cost_per_hour: number }[]
  >([]);
  const [companies, setCompanies] = useState<
    { id: number; name: string }[]
  >([]);
  const [form, setForm] = useState({
    part_code: "",
    part_description: "",
    operation_id: "",
    company_id: "",
    quantity: "1",
    expected_time_minutes: "",
    charged_value: "",
    material_cost: "",
  });

  // Fetch operations and companies on mount
  useEffect(() => {
    fetch("/api/operations")
      .then((res) => res.json())
      .then((data) => {
        if (data.operations) setOperations(data.operations);
      })
      .catch(() => { });

    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => {
        if (data.companies) setCompanies(data.companies);
      })
      .catch(() => { });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.part_code || !form.operation_id || !form.quantity) {
      toast.error("Preencha codigo da peca, operacao e quantidade");
      return;
    }

    if (!form.company_id) {
      toast.error("Selecione uma empresa");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          part_code: form.part_code,
          part_description: form.part_description || null,
          operation_id: parseInt(form.operation_id),
          company_id: parseInt(form.company_id),
          quantity: parseInt(form.quantity),
          expected_time_minutes: form.expected_time_minutes
            ? parseFloat(form.expected_time_minutes)
            : null,
          charged_value: form.charged_value
            ? parseFloat(form.charged_value)
            : 0,
          material_cost: form.material_cost
            ? parseFloat(form.material_cost)
            : 0,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao iniciar producao");
        return;
      }

      toast.success(`Producao iniciada: ${data.part.code}`);
      setForm({
        part_code: "",
        part_description: "",
        operation_id: "",
        company_id: "",
        quantity: "1",
        expected_time_minutes: "",
        charged_value: "",
        material_cost: "",
      });
      onStarted();
    } catch {
      toast.error("Erro de conexao");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-card p-6 shadow-sm"
    >
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-card-foreground">
        <Play className="h-5 w-5 text-[hsl(var(--success))]" />
        Iniciar Nova Producao
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Part Code - Large input */}
        <div className="md:col-span-2">
          <label
            htmlFor="part_code"
            className="mb-1.5 block text-sm font-medium text-card-foreground"
          >
            Codigo da Peca *
          </label>
          <input
            id="part_code"
            type="text"
            required
            value={form.part_code}
            onChange={(e) =>
              setForm({ ...form, part_code: e.target.value.toUpperCase() })
            }
            placeholder="Ex: PCA-001"
            className="h-16 w-full rounded-xl border border-input bg-background px-4 font-mono text-2xl font-bold text-foreground uppercase placeholder:text-muted-foreground placeholder:font-normal placeholder:text-lg focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label
            htmlFor="part_description"
            className="mb-1.5 block text-sm font-medium text-card-foreground"
          >
            Descricao da Peca
          </label>
          <input
            id="part_description"
            type="text"
            value={form.part_description}
            onChange={(e) =>
              setForm({ ...form, part_description: e.target.value })
            }
            placeholder="Descricao opcional"
            className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label
            htmlFor="company"
            className="mb-1.5 block text-sm font-medium text-card-foreground"
          >
            Empresa *
          </label>
          <select
            id="company"
            required
            value={form.company_id}
            onChange={(e) =>
              setForm({ ...form, company_id: e.target.value })
            }
            className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Selecione...</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="operation"
            className="mb-1.5 block text-sm font-medium text-card-foreground"
          >
            Operacao *
          </label>
          <select
            id="operation"
            required
            value={form.operation_id}
            onChange={(e) =>
              setForm({ ...form, operation_id: e.target.value })
            }
            className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Selecione...</option>
            {operations.map((op) => (
              <option key={op.id} value={op.id}>
                {op.name} (R$ {Number(op.machine_cost_per_hour).toFixed(2)}/h)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="quantity"
            className="mb-1.5 block text-sm font-medium text-card-foreground"
          >
            Quantidade *
          </label>
          <input
            id="quantity"
            type="number"
            required
            min="1"
            value={form.quantity}
            onChange={(e) =>
              setForm({ ...form, quantity: e.target.value })
            }
            className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label
            htmlFor="expected_time"
            className="mb-1.5 block text-sm font-medium text-card-foreground"
          >
            Tempo Previsto (min)
          </label>
          <input
            id="expected_time"
            type="number"
            min="0"
            step="0.5"
            value={form.expected_time_minutes}
            onChange={(e) =>
              setForm({ ...form, expected_time_minutes: e.target.value })
            }
            placeholder="Opcional"
            className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label
            htmlFor="charged_value"
            className="mb-1.5 block text-sm font-medium text-card-foreground"
          >
            Valor Cobrado (R$)
          </label>
          <input
            id="charged_value"
            type="number"
            min="0"
            step="0.01"
            value={form.charged_value}
            onChange={(e) =>
              setForm({ ...form, charged_value: e.target.value })
            }
            placeholder="0.00"
            className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label
            htmlFor="material_cost"
            className="mb-1.5 block text-sm font-medium text-card-foreground"
          >
            Custo Materia-Prima (R$)
          </label>
          <input
            id="material_cost"
            type="number"
            min="0"
            step="0.01"
            value={form.material_cost}
            onChange={(e) =>
              setForm({ ...form, material_cost: e.target.value })
            }
            placeholder="0.00"
            className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-6 flex h-16 w-full items-center justify-center gap-3 rounded-xl bg-[hsl(var(--success))] text-xl font-bold text-[hsl(var(--success-foreground))] transition-all hover:opacity-90 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <Play className="h-6 w-6" />
        )}
        INICIAR PRODUCAO
      </button>
    </form>
  );
}
