"use client";

import React from "react"

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  Clock,
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

const TARGET_PER_MIN = 1.667; // Fixed business factor

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

  // Calculate finished records for profitability summary
  const finishedRecords = history.filter((r) => r.status === "FINALIZADO");

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

          {/* Part-Level Profitability Summary - Admin Only */}
          {isAdmin && finishedRecords.length > 0 && (() => {
            // Calculate totals for the Part
            const totalTimeMs = finishedRecords.reduce((acc, rec) => acc + calculateProductionTime(rec), 0);
            const totalTimeMin = totalTimeMs / 60000;
            const totalQuantity = finishedRecords.reduce((acc, rec) => acc + rec.quantity, 0);
            const totalCharged = finishedRecords.reduce((acc, rec) => acc + Number(rec.charged_value || 0), 0);
            const realPerMin = totalTimeMin > 0 ? totalCharged / totalTimeMin : 0;
            const allFinished = history.every(r => r.status === "FINALIZADO");

            return (
              <div className="mb-4 rounded-xl border border-border bg-muted/40 p-4">
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Resumo da Peça
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <p className="text-[10px] font-medium uppercase text-muted-foreground">
                      Tempo Total
                    </p>
                    <p className="font-mono text-sm font-medium text-foreground">
                      {totalTimeMin.toFixed(2)} min
                    </p>
                  </div>
                  <div className="h-8 w-px bg-border"></div>
                  <div>
                    <p className="text-[10px] font-medium uppercase text-muted-foreground">
                      Qtd Total
                    </p>
                    <p className="font-mono text-sm font-bold text-foreground">
                      {totalQuantity}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-border"></div>
                  <div>
                    <p className="text-[10px] font-medium uppercase text-muted-foreground">
                      Valor Cobrado
                    </p>
                    <p className="font-mono text-sm font-bold text-accent">
                      R$ {totalCharged.toFixed(2)}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-border"></div>
                  <div>
                    <p className="text-[10px] font-medium uppercase text-muted-foreground">
                      Real / Min
                    </p>
                    <p className={`font-mono text-sm font-bold ${allFinished && totalTimeMin > 0
                      ? realPerMin < TARGET_PER_MIN - 0.01
                        ? "text-destructive"
                        : realPerMin > TARGET_PER_MIN + 0.01
                          ? "text-emerald-500"
                          : "text-foreground"
                      : "text-foreground"
                      }`}>
                      R$ {realPerMin.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase text-muted-foreground">
                      Meta / Min
                    </p>
                    <p className="font-mono text-sm text-muted-foreground">
                      R$ {TARGET_PER_MIN.toFixed(2)}
                    </p>
                  </div>
                  <div className="ml-auto">
                    {totalTimeMin === 0 ? (
                      <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                        📊 Sem dados suficientes
                      </span>
                    ) : allFinished ? (
                      realPerMin < TARGET_PER_MIN - 0.01 ? (
                        <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-xs font-bold text-destructive">
                          ❌ Ruim
                        </span>
                      ) : realPerMin > TARGET_PER_MIN + 0.01 ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-500">
                          🔥 Excelente
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                          ✅ Bom
                        </span>
                      )
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                        ⏳ Em andamento
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}


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
                  </tr>
                </thead>
                <tbody>
                  {history.map((rec) => {
                    const totalTime = calculateProductionTime(rec);
                    const timePerPiece =
                      rec.quantity > 0 ? totalTime / rec.quantity : 0;

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
