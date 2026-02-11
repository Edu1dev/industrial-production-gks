"use client";

import useSWR from "swr";
import { useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  Clock,
  Award,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Search,
  Loader2,
} from "lucide-react";
import {
  ProductionControls,
} from "./production-controls";
import { PartSearch } from "./part-search";
import { ProjectSearchResult } from "./project-search-result";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function formatDuration(ms: number) {
  if (!ms || ms <= 0) return "0min";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

type TabKey = "production" | "search" | "dashboard";

interface DashboardContentProps {
  operator: { id: number; name: string; login: string; is_admin: boolean } | null;
}

export function DashboardContent({ operator }: DashboardContentProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("production");
  const {
    data: dashboardData,
    mutate,
    isLoading,
  } = useSWR("/api/dashboard", fetcher, {
    refreshInterval: 10000,
  });

  // Project search state
  const [projectSearchCode, setProjectSearchCode] = useState("");
  const [projectSearchLoading, setProjectSearchLoading] = useState(false);
  const [projectSearchResult, setProjectSearchResult] = useState<{
    project: any;
    operations: any[];
    best_time_per_piece_ms: number | null;
  } | null>(null);
  const [projectSearchError, setProjectSearchError] = useState("");

  const activeRecords = dashboardData?.activeRecords || [];
  const recentRecords = dashboardData?.recentRecords || [];
  const rankings = dashboardData?.rankings || [];
  const repeatedParts = dashboardData?.repeatedParts || [];

  const tabs: { key: TabKey; label: string; icon: typeof Activity; adminOnly: boolean }[] = [
    { key: "production", label: "Producao", icon: Activity, adminOnly: false },
    { key: "search", label: "Buscar Peca", icon: Clock, adminOnly: false },
    { key: "dashboard", label: "Dashboard", icon: BarChart3, adminOnly: true },
  ];

  const visibleTabs = tabs.filter(tab => !tab.adminOnly || operator?.is_admin);

  async function handleProjectSearch() {
    if (!projectSearchCode.trim()) {
      toast.error("Digite o codigo da peca");
      return;
    }

    setProjectSearchLoading(true);
    setProjectSearchError("");
    setProjectSearchResult(null);

    try {
      const res = await fetch(`/api/projects/search?part_code=${encodeURIComponent(projectSearchCode.trim())}`);

      if (!res.ok) {
        try {
          const data = await res.json();
          setProjectSearchError(data.error || "Projeto nao encontrado");
        } catch {
          setProjectSearchError("Erro no servidor");
        }
        return;
      }

      const data = await res.json();
      setProjectSearchResult(data);
    } catch (err) {
      console.error("Project search error:", err);
      setProjectSearchError("Erro de conexao");
    } finally {
      setProjectSearchLoading(false);
    }
  }

  function handleProjectStarted() {
    setProjectSearchResult(null);
    setProjectSearchCode("");
    mutate();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Tab Navigation */}
      <div className="mb-6 flex gap-2 overflow-x-auto rounded-xl bg-card p-1.5 shadow-sm">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3.5 text-sm font-semibold transition-all ${activeTab === tab.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Production Tab */}
      {activeTab === "production" && (
        <div className="flex flex-col gap-6">
          {/* Active Productions */}
          {activeRecords.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                  <Activity className="h-5 w-5 text-[hsl(var(--success))]" />
                  Producoes Ativas ({activeRecords.length})
                </h2>
                <button
                  onClick={() => mutate()}
                  className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                  aria-label="Atualizar"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  Atualizar
                </button>
              </div>
              <div className="flex flex-col gap-4">
                {activeRecords.map(
                  (record: {
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
                  }) => (
                    <ProductionControls key={record.id} record={record} />
                  ),
                )}
              </div>
            </div>
          )}

          {/* Project Search */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-card-foreground">
              <Search className="h-5 w-5 text-accent" />
              Buscar Projeto
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={projectSearchCode}
                onChange={(e) => setProjectSearchCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleProjectSearch();
                  }
                }}
                placeholder="Codigo da peca (ex: PCA-001)"
                className="h-14 w-full rounded-xl border border-input bg-background px-4 font-mono text-lg font-bold text-foreground uppercase placeholder:text-muted-foreground placeholder:font-normal placeholder:text-base focus:outline-none focus:ring-2 focus:ring-accent sm:flex-1"
              />
              <button
                onClick={handleProjectSearch}
                disabled={projectSearchLoading}
                className="flex h-14 shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-6 font-bold text-accent-foreground transition-all hover:opacity-90 disabled:opacity-50"
              >
                {projectSearchLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
                Buscar
              </button>
            </div>

            {projectSearchError && (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                <p className="text-sm font-medium text-destructive">{projectSearchError}</p>
              </div>
            )}
          </div>

          {/* Project Search Result */}
          {projectSearchResult && (
            <ProjectSearchResult
              project={projectSearchResult.project}
              operations={projectSearchResult.operations}
              bestTimePerPieceMs={projectSearchResult.best_time_per_piece_ms}
              onStarted={handleProjectStarted}
              onCancel={() => setProjectSearchResult(null)}
            />
          )}
        </div>
      )}

      {/* Search Tab */}
      {activeTab === "search" && <PartSearch isAdmin={!!operator?.is_admin} />}

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div className="flex flex-col gap-6">
          {/* Operator Rankings */}
          {rankings.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-card-foreground">
                <Award className="h-5 w-5 text-accent" />
                Ranking de Operadores
              </h2>
              {/* Mobile Cards */}
              <div className="flex flex-col gap-2 md:hidden">
                {rankings.map(
                  (
                    r: {
                      operator_id: number;
                      operator_name: string;
                      total_records: number;
                      avg_time_per_piece_min: number;
                      best_time_per_piece_min: number;
                    },
                    i: number,
                  ) => (
                    <div key={r.operator_id} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                      <span
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${i === 0
                          ? "bg-accent text-accent-foreground"
                          : i === 1
                            ? "bg-muted text-foreground"
                            : "bg-muted text-muted-foreground"
                          }`}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{r.operator_name}</p>
                        <p className="text-xs text-muted-foreground">{r.total_records} producoes</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-bold text-foreground">
                          {r.avg_time_per_piece_min ? `${r.avg_time_per_piece_min}min` : "-"}
                        </p>
                        <p className="font-mono text-xs text-[hsl(var(--success))]">
                          {r.best_time_per_piece_min ? `${r.best_time_per_piece_min}min` : "-"}
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>
              {/* Desktop Table */}
              <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="px-3 py-2.5 text-left font-semibold text-foreground">
                        #
                      </th>
                      <th className="px-3 py-2.5 text-left font-semibold text-foreground">
                        Operador
                      </th>
                      <th className="px-3 py-2.5 text-center font-semibold text-foreground">
                        Total Producoes
                      </th>
                      <th className="px-3 py-2.5 text-center font-semibold text-foreground">
                        Tempo Medio/Peca
                      </th>
                      <th className="px-3 py-2.5 text-center font-semibold text-foreground">
                        Melhor Tempo/Peca
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map(
                      (
                        r: {
                          operator_id: number;
                          operator_name: string;
                          total_records: number;
                          avg_time_per_piece_min: number;
                          best_time_per_piece_min: number;
                        },
                        i: number,
                      ) => (
                        <tr
                          key={r.operator_id}
                          className="border-b border-border last:border-0"
                        >
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${i === 0
                                ? "bg-accent text-accent-foreground"
                                : i === 1
                                  ? "bg-muted text-foreground"
                                  : "bg-muted text-muted-foreground"
                                }`}
                            >
                              {i + 1}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-medium text-foreground">
                            {r.operator_name}
                          </td>
                          <td className="px-3 py-2.5 text-center text-foreground">
                            {r.total_records}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono text-foreground">
                            {r.avg_time_per_piece_min
                              ? `${r.avg_time_per_piece_min}min`
                              : "-"}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono text-[hsl(var(--success))]">
                            {r.best_time_per_piece_min
                              ? `${r.best_time_per_piece_min}min`
                              : "-"}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Repeated Parts Comparison */}
          {repeatedParts.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-card-foreground">
                <TrendingUp className="h-5 w-5 text-accent" />
                Pecas Repetidas - Comparacao
              </h2>
              {/* Mobile Cards */}
              <div className="flex flex-col gap-2 md:hidden">
                {repeatedParts.map(
                  (p: {
                    part_code: string;
                    description?: string;
                    production_count: number;
                    best_time_min: number;
                    worst_time_min: number;
                  }) => (
                    <div key={p.part_code} className="rounded-xl border border-border bg-background p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-foreground">{p.part_code}</span>
                          {p.description && (
                            <span className="ml-1.5 text-xs text-muted-foreground">{p.description}</span>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">{p.production_count}x</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-muted/50 p-2 text-center">
                          <p className="text-[10px] font-medium uppercase text-muted-foreground">Melhor</p>
                          <p className="font-mono text-sm font-bold text-[hsl(var(--success))]">
                            {p.best_time_min ? `${p.best_time_min}min` : "-"}
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2 text-center">
                          <p className="text-[10px] font-medium uppercase text-muted-foreground">Pior</p>
                          <p className="font-mono text-sm font-bold text-destructive">
                            {p.worst_time_min ? `${p.worst_time_min}min` : "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
              {/* Desktop Table */}
              <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="px-3 py-2.5 text-left font-semibold text-foreground">
                        Peca
                      </th>
                      <th className="px-3 py-2.5 text-center font-semibold text-foreground">
                        Producoes
                      </th>
                      <th className="px-3 py-2.5 text-center font-semibold text-foreground">
                        Melhor Tempo
                      </th>
                      <th className="px-3 py-2.5 text-center font-semibold text-foreground">
                        Pior Tempo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {repeatedParts.map(
                      (p: {
                        part_code: string;
                        description?: string;
                        production_count: number;
                        best_time_min: number;
                        worst_time_min: number;
                      }) => (
                        <tr
                          key={p.part_code}
                          className="border-b border-border last:border-0"
                        >
                          <td className="px-3 py-2.5">
                            <span className="font-mono font-bold text-foreground">
                              {p.part_code}
                            </span>
                            {p.description && (
                              <span className="ml-1.5 text-xs text-muted-foreground">
                                {p.description}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center text-foreground">
                            {p.production_count}x
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono text-[hsl(var(--success))]">
                            {p.best_time_min ? `${p.best_time_min}min` : "-"}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono text-destructive">
                            {p.worst_time_min
                              ? `${p.worst_time_min}min`
                              : "-"}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Records */}
          {recentRecords.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-card-foreground">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Ultimos Apontamentos
              </h2>
              {/* Mobile Cards */}
              <div className="flex flex-col gap-2 md:hidden">
                {recentRecords.map(
                  (rec: {
                    id: number;
                    part_code: string;
                    operation_name: string;
                    operator_name: string;
                    quantity: number;
                    start_time: string;
                    end_time?: string;
                    total_pause_ms: number;
                    status: string;
                    company_name?: string;
                  }) => {
                    let timeStr = "-";
                    if (rec.end_time) {
                      const start = new Date(rec.start_time).getTime();
                      const end = new Date(rec.end_time).getTime();
                      const total = end - start - (rec.total_pause_ms || 0);
                      timeStr = formatDuration(total);
                    }
                    return (
                      <div key={rec.id} className="rounded-xl border border-border bg-background p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-foreground">{rec.part_code}</span>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${rec.status === "FINALIZADO"
                                ? "bg-muted text-muted-foreground"
                                : rec.status === "EM_PRODUCAO"
                                  ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]"
                                  : "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]"
                                }`}
                            >
                              {rec.status === "EM_PRODUCAO" ? "Producao" : rec.status === "PAUSADO" ? "Pausado" : "Finalizado"}
                            </span>
                          </div>
                          <span className="font-mono text-sm font-bold text-foreground">{timeStr}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          {rec.company_name && <span>{rec.company_name}</span>}
                          <span>{rec.operation_name}</span>
                          <span>{rec.operator_name}</span>
                          <span>Qtd: {rec.quantity}</span>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
              {/* Desktop Table */}
              <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="px-3 py-2.5 text-left font-semibold text-foreground">
                        Peca
                      </th>
                      <th className="px-3 py-2.5 text-left font-semibold text-foreground">
                        Empresa
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
                      <th className="px-3 py-2.5 text-center font-semibold text-foreground">
                        Tempo
                      </th>
                      <th className="px-3 py-2.5 text-center font-semibold text-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRecords.map(
                      (rec: {
                        id: number;
                        part_code: string;
                        operation_name: string;
                        operator_name: string;
                        quantity: number;
                        start_time: string;
                        end_time?: string;
                        total_pause_ms: number;
                        status: string;
                        company_name?: string;
                      }) => {
                        let timeStr = "-";
                        if (rec.end_time) {
                          const start = new Date(rec.start_time).getTime();
                          const end = new Date(rec.end_time).getTime();
                          const total =
                            end - start - (rec.total_pause_ms || 0);
                          timeStr = formatDuration(total);
                        }

                        return (
                          <tr
                            key={rec.id}
                            className="border-b border-border last:border-0"
                          >
                            <td className="px-3 py-2.5 font-mono font-bold text-foreground">
                              {rec.part_code}
                            </td>
                            <td className="px-3 py-2.5 text-foreground">
                              {rec.company_name || (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
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
                            <td className="px-3 py-2.5 text-center font-mono text-foreground">
                              {timeStr}
                            </td>
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
                      },
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {rankings.length === 0 &&
            repeatedParts.length === 0 &&
            recentRecords.length === 0 && (
              <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
                <BarChart3 className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
                <h3 className="mb-1 text-lg font-semibold text-card-foreground">
                  Nenhum dado ainda
                </h3>
                <p className="text-sm text-muted-foreground">
                  Inicie producoes para ver estatisticas e comparacoes aqui.
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
