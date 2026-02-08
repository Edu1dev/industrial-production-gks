"use client";

import React from "react"

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  Clock,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface HistoryRecord {
  id: number;
  status: string;
  quantity: number;
  start_time: string;
  end_time?: string;
  total_pause_ms: number;
  expected_time_minutes?: number;
  charged_value: number;
  operation_name: string;
  machine_cost_per_hour: number;
  operator_name: string;
  operator_id: number;
}

interface PartData {
  id: number;
  code: string;
  description?: string;
  material_cost: number;
  company_id?: number;
  company_name?: string;
}

function formatDuration(ms: number) {
  if (ms <= 0) return "0min";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

function calculateProductionTime(record: HistoryRecord): number {
  if (!record.end_time) return 0;
  const start = new Date(record.start_time).getTime();
  const end = new Date(record.end_time).getTime();
  return end - start - (record.total_pause_ms || 0);
}

function getEvaluation(
  record: HistoryRecord,
): { label: string; color: string; icon: typeof CheckCircle2 } | null {
  if (!record.expected_time_minutes || !record.end_time) return null;
  const actualMinutes = calculateProductionTime(record) / 60000;
  const expectedMinutes = Number(record.expected_time_minutes);

  if (actualMinutes < expectedMinutes * 0.9) {
    return {
      label: "EXCELENTE",
      color: "text-[hsl(var(--success))]",
      icon: CheckCircle2,
    };
  }
  if (actualMinutes <= expectedMinutes * 1.1) {
    return {
      label: "BOM",
      color: "text-[hsl(var(--chart-1))]",
      icon: Trophy,
    };
  }
  return {
    label: "PESSIMO",
    color: "text-destructive",
    icon: XCircle,
  };
}

export function PartSearch({ isAdmin }: { isAdmin: boolean }) {
  const [searchCode, setSearchCode] = useState("");
  const [searchCompanyId, setSearchCompanyId] = useState("");
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [part, setPart] = useState<PartData | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => {
        if (data.companies) setCompanies(data.companies);
      })
      .catch(() => { });
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchCode.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      let url = `/api/parts?code=${encodeURIComponent(searchCode.toUpperCase())}`;
      if (searchCompanyId) {
        url += `&company_id=${encodeURIComponent(searchCompanyId)}`;
      }
      const res = await fetch(url);
      const data = await res.json();

      setPart(data.part || null);
      setHistory(data.history || []);

      if (!data.part) {
        toast.info("Peca nao encontrada. Sera criada ao iniciar producao.");
      }
    } catch {
      toast.error("Erro ao buscar peca");
    } finally {
      setLoading(false);
    }
  }

  // Calculate comparison stats for repeated parts
  const finishedRecords = history.filter((r) => r.status === "FINALIZADO");
  const hasComparison = finishedRecords.length > 1;

  let bestTime = Infinity;
  let worstTime = 0;
  let bestOperator = "";
  let worstOperator = "";

  if (hasComparison) {
    for (const rec of finishedRecords) {
      const time = calculateProductionTime(rec) / rec.quantity;
      if (time < bestTime) {
        bestTime = time;
        bestOperator = rec.operator_name;
      }
      if (time > worstTime) {
        worstTime = time;
        worstOperator = rec.operator_name;
      }
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-card-foreground">
        <Search className="h-5 w-5 text-accent" />
        Buscar Peca / Historico
      </h2>

      <form onSubmit={handleSearch} className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          value={searchCode}
          onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
          placeholder="Codigo da peca..."
          className="h-14 flex-1 min-w-[200px] rounded-xl border border-input bg-background px-4 font-mono text-xl font-bold text-foreground uppercase placeholder:text-muted-foreground placeholder:font-normal placeholder:text-base focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <select
          value={searchCompanyId}
          onChange={(e) => setSearchCompanyId(e.target.value)}
          className="h-14 rounded-xl border border-input bg-background px-4 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">Todas empresas</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="flex h-14 items-center justify-center gap-2 rounded-xl bg-accent px-6 font-bold text-accent-foreground transition-all hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Search className="h-5 w-5" />
          )}
          Buscar
        </button>
      </form>

      {searched && (
        <>
          {part && (
            <div className="mb-4 rounded-xl bg-muted p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-lg font-bold text-foreground">
                    {part.code}
                  </span>
                  {part.description && (
                    <span className="ml-2 text-sm text-muted-foreground">
                      - {part.description}
                    </span>
                  )}
                  {part.company_name && (
                    <span className="ml-2 text-sm text-accent font-medium">
                      ({part.company_name})
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <span className="text-sm text-muted-foreground">
                    Custo MP: R$ {Number(part.material_cost).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Comparison Stats - Admin Only */}
          {hasComparison && isAdmin && (
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-xl bg-[hsl(var(--success))]/10 p-3 text-center">
                <Trophy className="mx-auto mb-1 h-5 w-5 text-[hsl(var(--success))]" />
                <p className="text-xs text-muted-foreground">Melhor Tempo/Peca</p>
                <p className="font-mono text-sm font-bold text-foreground">
                  {formatDuration(bestTime)}
                </p>
                <p className="text-xs text-[hsl(var(--success))]">
                  {bestOperator}
                </p>
              </div>
              <div className="rounded-xl bg-destructive/10 p-3 text-center">
                <AlertTriangle className="mx-auto mb-1 h-5 w-5 text-destructive" />
                <p className="text-xs text-muted-foreground">Pior Tempo/Peca</p>
                <p className="font-mono text-sm font-bold text-foreground">
                  {formatDuration(worstTime)}
                </p>
                <p className="text-xs text-destructive">{worstOperator}</p>
              </div>
              <div className="rounded-xl bg-accent/10 p-3 text-center">
                <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-accent" />
                <p className="text-xs text-muted-foreground">Mais Rapido</p>
                <p className="text-sm font-bold text-foreground">{bestOperator}</p>
              </div>
              <div className="rounded-xl bg-muted p-3 text-center">
                <Clock className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Mais Lento</p>
                <p className="text-sm font-bold text-foreground">
                  {worstOperator}
                </p>
              </div>
            </div>
          )}

          {/* History Table */}
          {history.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="px-3 py-2.5 text-left font-semibold text-foreground">
                      Data
                    </th>
                    <th className="px-3 py-2.5 text-left font-semibold text-foreground">
                      Operacao
                    </th>
                    <th className="px-3 py-2.5 text-left font-semibold text-foreground">
                      Operador
                    </th>
                    <th className="px-3 py-2.5 text-center font-semibold text-foreground">
                      Qtd
                    </th>
                    {isAdmin && (
                      <>
                        <th className="px-3 py-2.5 text-center font-semibold text-foreground">
                          Tempo Total
                        </th>
                        <th className="px-3 py-2.5 text-center font-semibold text-foreground">
                          Tempo/Peca
                        </th>
                      </>
                    )}
                    <th className="px-3 py-2.5 text-center font-semibold text-foreground">
                      Status
                    </th>
                    {isAdmin && (
                      <th className="px-3 py-2.5 text-center font-semibold text-foreground">
                        Avaliacao
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {history.map((rec) => {
                    const totalTime = calculateProductionTime(rec);
                    const timePerPiece =
                      rec.quantity > 0 ? totalTime / rec.quantity : 0;
                    const evaluation = getEvaluation(rec);
                    const EvalIcon = evaluation?.icon;

                    return (
                      <tr
                        key={rec.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="whitespace-nowrap px-3 py-2.5 text-foreground">
                          {new Date(rec.start_time).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-3 py-2.5 text-foreground">
                          {rec.operation_name}
                        </td>
                        <td className="px-3 py-2.5 text-foreground">
                          {rec.operator_name}
                        </td>
                        <td className="px-3 py-2.5 text-center text-foreground">
                          {rec.quantity}
                        </td>
                        {isAdmin && (
                          <>
                            <td className="px-3 py-2.5 text-center font-mono text-foreground">
                              {rec.end_time ? formatDuration(totalTime) : "-"}
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono text-foreground">
                              {rec.end_time ? formatDuration(timePerPiece) : "-"}
                            </td>
                          </>
                        )}
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${rec.status === "FINALIZADO"
                                ? "bg-muted text-muted-foreground"
                                : rec.status === "EM_PRODUCAO"
                                  ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]"
                                  : "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]"
                              }`}
                          >
                            {rec.status === "EM_PRODUCAO"
                              ? "Producao"
                              : rec.status === "PAUSADO"
                                ? "Pausado"
                                : "Finalizado"}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-3 py-2.5 text-center">
                            {evaluation && EvalIcon ? (
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-bold ${evaluation.color}`}
                              >
                                <EvalIcon className="h-3.5 w-3.5" />
                                {evaluation.label}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                -
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : searched && !part ? (
            <p className="text-center text-sm text-muted-foreground">
              Peca nao encontrada. Inicie uma producao para criar.
            </p>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Nenhum historico de producao.
            </p>
          )}
        </>
      )}
    </div>
  );
}
