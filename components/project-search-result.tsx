"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Building2,
  Clock,
  CheckCircle2,
  Play,
  Loader2,
  Zap,
  Package,
  Square,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ProjectSearchResultProps {
  project: {
    id: number;
    part_code: string;
    company_name: string;
    description: string;
    quantity: number;
    estimated_time_minutes: number | null;
    charged_value_per_piece: number;
    material_cost: number;
    status: string;
  };
  operations: {
    id: number;
    operation_name: string;
    status: string;
    operator_name: string;
    start_time: string;
    end_time: string | null;
  }[];
  bestTimePerPieceMs: number | null;
  onStarted: () => void;
  onCancel: () => void;
}

function formatDuration(ms: number) {
  if (!ms || ms <= 0) return "-";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

export function ProjectSearchResult({
  project,
  operations,
  bestTimePerPieceMs,
  onStarted,
  onCancel,
}: ProjectSearchResultProps) {
  const [showOperationSelect, setShowOperationSelect] = useState(false);
  const [availableOperations, setAvailableOperations] = useState<
    { id: number; name: string; machine_cost_per_hour: number }[]
  >([]);
  const [selectedOperation, setSelectedOperation] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/operations")
      .then((res) => res.json())
      .then((data) => {
        if (data.operations) setAvailableOperations(data.operations);
      })
      .catch(() => { });
  }, []);

  const finishedOps = operations.filter((o) => o.status === "FINALIZADO");
  const activeOps = operations.filter((o) => o.status !== "FINALIZADO");

  async function handleStart() {
    if (!selectedOperation) {
      toast.error("Selecione uma operacao");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          operation_id: parseInt(selectedOperation),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao iniciar producao");
        return;
      }

      toast.success(`Producao iniciada: ${project.part_code}`);
      onStarted();
    } catch {
      toast.error("Erro de conexao");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      {/* Project Info */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-accent" />
            <span className="font-mono text-2xl font-bold text-card-foreground">
              {project.part_code}
            </span>
          </div>
          {project.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {project.description}
            </p>
          )}
        </div>
        <button
          onClick={onCancel}
          className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/80"
        >
          Voltar
        </button>
      </div>

      {/* Details Grid */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">Empresa</p>
          <p className="flex items-center gap-1 text-sm font-semibold text-foreground">
            <Building2 className="h-3.5 w-3.5" />
            {project.company_name}
          </p>
        </div>
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">Quantidade</p>
          <p className="text-sm font-semibold text-foreground">{project.quantity} peca(s)</p>
        </div>
        {project.estimated_time_minutes && (
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Tempo Previsto/Peça</p>
            <p className="flex items-center gap-1 text-sm font-semibold text-foreground">
              <Clock className="h-3.5 w-3.5" />
              {Number(project.estimated_time_minutes) >= 60
                ? `${Math.floor(Number(project.estimated_time_minutes) / 60)}h ${Math.round(Number(project.estimated_time_minutes) % 60)}min`
                : `${Number(project.estimated_time_minutes)}min`}
            </p>
          </div>
        )}
        {bestTimePerPieceMs && (
          <div className="rounded-xl bg-[hsl(var(--success))]/10 p-3">
            <p className="text-xs text-muted-foreground">Melhor Tempo/Peca</p>
            <p className="flex items-center gap-1 text-sm font-semibold text-[hsl(var(--success))]">
              <Zap className="h-3.5 w-3.5" />
              {formatDuration(bestTimePerPieceMs)}
            </p>
          </div>
        )}
      </div>

      {/* Completed Operations */}
      {finishedOps.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Operacoes Concluidas</h3>
          <div className="space-y-1.5">
            {finishedOps.map((op, index) => {
              const isDuplicate = finishedOps.slice(0, index).some(
                (prev) => prev.operation_name === op.operation_name
              );
              return (
                <div
                  key={op.id}
                  className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm"
                >
                  <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                  <span className="font-medium text-foreground">
                    {op.operation_name}{isDuplicate ? " (Reajuste)" : ""}
                  </span>
                  <span className="text-muted-foreground">- {op.operator_name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Operations Warning */}
      {activeOps.length > 0 && (
        <div className="mb-4 rounded-lg border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/10 p-3">
          <p className="text-sm font-medium text-[hsl(var(--warning))]">
            Este projeto possui operacao(oes) ativa(s). Aguarde a finalizacao.
          </p>
        </div>
      )}

      {/* Start Production or Finalize Project */}
      {activeOps.length === 0 && (
        <div>
          {!showOperationSelect ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setShowOperationSelect(true)}
                className="flex h-14 shrink-0 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--success))] px-6 text-base font-bold text-[hsl(var(--success-foreground))] transition-all hover:opacity-90"
              >
                <Play className="h-5 w-5" />
                Iniciar Produção
              </button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    disabled={loading}
                    className="flex h-14 shrink-0 items-center justify-center gap-2 rounded-xl bg-destructive px-6 text-base font-bold text-destructive-foreground transition-all hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                    Finalizar
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Finalizar Projeto?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja finalizar este projeto? Ele nao podera mais receber apontamentos e saira da lista de producao ativa.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const res = await fetch(`/api/projects/${project.id}/finalize`, {
                            method: "POST",
                          });

                          if (!res.ok) {
                            const data = await res.json();
                            toast.error(data.error || "Erro ao finalizar projeto");
                            return;
                          }

                          toast.success("Projeto finalizado com sucesso!");
                          onStarted(); // Refresh dashboard
                        } catch {
                          toast.error("Erro de conexao");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sim, Finalizar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label htmlFor="select_operation" className="mb-1.5 block text-sm font-medium text-card-foreground">
                  Selecione a Operacao *
                </label>
                <select
                  id="select_operation"
                  value={selectedOperation}
                  onChange={(e) => setSelectedOperation(e.target.value)}
                  className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">Selecione...</option>
                  {availableOperations.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleStart}
                  disabled={loading || !selectedOperation}
                  className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--success))] text-base font-bold text-[hsl(var(--success-foreground))] transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                  Confirmar
                </button>
                <button
                  onClick={() => {
                    setShowOperationSelect(false);
                    setSelectedOperation("");
                  }}
                  className="flex h-14 items-center rounded-xl bg-muted px-6 font-medium text-muted-foreground transition-colors hover:bg-muted/80"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
