"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react"; // Import ArrowLeft here
import useSWR from "swr";
import { useState, useCallback } from "react";
import {
  History,
  Search,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Trophy,
  XCircle,
  DollarSign,
  Clock,
  X,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface HistoryRecord {
  id: number;
  status: string;
  quantity: number;
  start_time: string;
  end_time?: string;
  total_pause_ms: number;
  expected_time_minutes?: number;
  charged_value: number;
  part_code: string;
  part_description?: string;
  material_cost: number;
  operation_name: string;
  machine_cost_per_hour: number;
  operator_name: string;
  operator_id: number;
  total_time_min: number | null;
  time_per_piece_min: number | null;
  machine_cost: number | null;
  total_material_cost: number | null;
  company_name?: string;
  company_id?: number;
}

const PAGE_SIZE = 20;

export default function HistoricoPage() {
  const [filters, setFilters] = useState({
    operator_id: "",
    part_code: "",
    status: "",
    date_from: "",
    date_to: "",
    company_id: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch operators and companies for filter dropdowns
  const { data: operatorsData } = useSWR("/api/operators", fetcher);
  const operators = operatorsData?.operators || [];
  const { data: companiesData } = useSWR("/api/companies", fetcher);
  const companies = companiesData?.companies || [];

  // Build URL with filters
  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (appliedFilters.operator_id)
      params.set("operator_id", appliedFilters.operator_id);
    if (appliedFilters.part_code)
      params.set("part_code", appliedFilters.part_code);
    if (appliedFilters.status) params.set("status", appliedFilters.status);
    if (appliedFilters.date_from)
      params.set("date_from", appliedFilters.date_from);
    if (appliedFilters.date_to) params.set("date_to", appliedFilters.date_to);
    if (appliedFilters.company_id)
      params.set("company_id", appliedFilters.company_id);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(page * PAGE_SIZE));
    return `/api/history?${params.toString()}`;
  }, [appliedFilters, page]);

  const { data, isLoading } = useSWR(buildUrl(), fetcher);
  const records: HistoryRecord[] = data?.records || [];
  const total: number = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function applyFilters() {
    setAppliedFilters(filters);
    setPage(0);
  }

  function clearFilters() {
    const empty = {
      operator_id: "",
      part_code: "",
      status: "",
      date_from: "",
      date_to: "",
      company_id: "",
    };
    setFilters(empty);
    setAppliedFilters(empty);
    setPage(0);
  }

  const hasActiveFilters = Object.values(appliedFilters).some((v) => v !== "");

  function getEvaluation(record: HistoryRecord) {
    if (!record.expected_time_minutes || !record.total_time_min) return null;
    const actual = Number(record.total_time_min);
    const expected = Number(record.expected_time_minutes);

    if (actual < expected * 0.9)
      return {
        label: "EXCELENTE",
        color: "text-[hsl(var(--success))]",
        bg: "bg-[hsl(var(--success))]/10",
        icon: CheckCircle2,
      };
    if (actual <= expected * 1.1)
      return {
        label: "BOM",
        color: "text-primary",
        bg: "bg-primary/10",
        icon: Trophy,
      };
    return {
      label: "PESSIMO",
      color: "text-destructive",
      bg: "bg-destructive/10",
      icon: XCircle,
    };
  }

  // Summary stats for filtered results
  const finishedRecords = records.filter((r) => r.status === "FINALIZADO");
  const avgTimePP =
    finishedRecords.length > 0
      ? (
          finishedRecords.reduce(
            (sum, r) => sum + (Number(r.time_per_piece_min) || 0),
            0,
          ) / finishedRecords.length
        ).toFixed(2)
      : null;
  const totalMachineCost = finishedRecords.reduce(
    (sum, r) => sum + (Number(r.machine_cost) || 0),
    0,
  );
  const totalCharged = records.reduce(
    (sum, r) => sum + (Number(r.charged_value) || 0),
    0,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Page Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <History className="h-6 w-6 text-accent" />
            Historico de Producao
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} registro(s) encontrado(s)
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex h-12 items-center gap-2 rounded-xl px-5 font-bold transition-all ${
            hasActiveFilters
              ? "bg-accent text-accent-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          }`}
        >
          <Filter className="h-5 w-5" />
          Filtros
          {hasActiveFilters && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-foreground/20 text-xs">
              {Object.values(appliedFilters).filter((v) => v !== "").length}
            </span>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-card-foreground">Filtros</h2>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-sm font-medium text-destructive hover:underline"
              >
                <X className="h-4 w-4" />
                Limpar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label
                htmlFor="filter_company"
                className="mb-1.5 block text-sm font-medium text-card-foreground"
              >
                Empresa
              </label>
              <select
                id="filter_company"
                value={filters.company_id}
                onChange={(e) =>
                  setFilters({ ...filters, company_id: e.target.value })
                }
                className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Todas</option>
                {companies.map(
                  (c: { id: number; name: string }) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="filter_operator"
                className="mb-1.5 block text-sm font-medium text-card-foreground"
              >
                Operador
              </label>
              <select
                id="filter_operator"
                value={filters.operator_id}
                onChange={(e) =>
                  setFilters({ ...filters, operator_id: e.target.value })
                }
                className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Todos</option>
                {operators.map(
                  (op: { id: number; name: string }) => (
                    <option key={op.id} value={op.id}>
                      {op.name}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="filter_part"
                className="mb-1.5 block text-sm font-medium text-card-foreground"
              >
                Codigo da Peca
              </label>
              <input
                id="filter_part"
                type="text"
                value={filters.part_code}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    part_code: e.target.value.toUpperCase(),
                  })
                }
                placeholder="Ex: PCA-001"
                className="h-12 w-full rounded-xl border border-input bg-background px-3 font-mono text-sm text-foreground uppercase placeholder:font-sans placeholder:normal-case placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label
                htmlFor="filter_status"
                className="mb-1.5 block text-sm font-medium text-card-foreground"
              >
                Status
              </label>
              <select
                id="filter_status"
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Todos</option>
                <option value="EM_PRODUCAO">Em Producao</option>
                <option value="PAUSADO">Pausado</option>
                <option value="FINALIZADO">Finalizado</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="filter_date_from"
                className="mb-1.5 block text-sm font-medium text-card-foreground"
              >
                Data Inicio
              </label>
              <input
                id="filter_date_from"
                type="date"
                value={filters.date_from}
                onChange={(e) =>
                  setFilters({ ...filters, date_from: e.target.value })
                }
                className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label
                htmlFor="filter_date_to"
                className="mb-1.5 block text-sm font-medium text-card-foreground"
              >
                Data Fim
              </label>
              <input
                id="filter_date_to"
                type="date"
                value={filters.date_to}
                onChange={(e) =>
                  setFilters({ ...filters, date_to: e.target.value })
                }
                className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <button
            onClick={applyFilters}
            className="mt-4 flex h-12 items-center gap-2 rounded-xl bg-accent px-6 font-bold text-accent-foreground transition-all hover:opacity-90"
          >
            <Search className="h-5 w-5" />
            Aplicar Filtros
          </button>
        </div>
      )}

      {/* Summary Stats */}
      {finishedRecords.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Tempo Med./Peca
            </div>
            <p className="mt-1 font-mono text-xl font-bold text-foreground">
              {avgTimePP}min
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              Custo Maquina
            </div>
            <p className="mt-1 font-mono text-xl font-bold text-foreground">
              R$ {totalMachineCost.toFixed(2)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              Valor Cobrado
            </div>
            <p className="mt-1 font-mono text-xl font-bold text-accent">
              R$ {totalCharged.toFixed(2)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <History className="h-3.5 w-3.5" />
              Na pagina
            </div>
            <p className="mt-1 font-mono text-xl font-bold text-foreground">
              {records.length}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                / {total}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Records Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <History className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
          <h3 className="mb-1 text-lg font-semibold text-card-foreground">
            Nenhum registro encontrado
          </h3>
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters
              ? "Tente ajustar os filtros."
              : "Inicie producoes para ver o historico aqui."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="whitespace-nowrap px-3 py-3 text-left font-semibold text-foreground">
                    Data
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-semibold text-foreground">
                    Peca
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-semibold text-foreground">
                    Empresa
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-semibold text-foreground">
                    Operacao
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-semibold text-foreground">
                    Operador
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-center font-semibold text-foreground">
                    Qtd
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-center font-semibold text-foreground">
                    Tempo Total
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-center font-semibold text-foreground">
                    Tempo/Peca
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-center font-semibold text-foreground">
                    Custo Maq.
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-center font-semibold text-foreground">
                    Custo MP
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-center font-semibold text-foreground">
                    Cobrado
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-center font-semibold text-foreground">
                    Status
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-center font-semibold text-foreground">
                    Avaliacao
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => {
                  const evaluation = getEvaluation(rec);
                  const EvalIcon = evaluation?.icon;
                  const totalCost =
                    (Number(rec.machine_cost) || 0) +
                    (Number(rec.total_material_cost) || 0);

                  return (
                    <tr
                      key={rec.id}
                      className="border-b border-border transition-colors last:border-0 hover:bg-muted/50"
                    >
                      <td className="whitespace-nowrap px-3 py-3 text-foreground">
                        {new Date(rec.start_time).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-mono font-bold text-foreground">
                          {rec.part_code}
                        </span>
                        {rec.part_description && (
                          <p className="max-w-[120px] truncate text-xs text-muted-foreground">
                            {rec.part_description}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-foreground">
                        {rec.company_name || (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-foreground">
                        {rec.operation_name}
                      </td>
                      <td className="px-3 py-3 text-foreground">
                        {rec.operator_name}
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-foreground">
                        {rec.quantity}
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-foreground">
                        {rec.total_time_min
                          ? `${rec.total_time_min}min`
                          : "-"}
                      </td>
                      <td className="px-3 py-3 text-center font-mono font-bold text-foreground">
                        {rec.time_per_piece_min
                          ? `${rec.time_per_piece_min}min`
                          : "-"}
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-foreground">
                        {rec.machine_cost
                          ? `R$${Number(rec.machine_cost).toFixed(2)}`
                          : "-"}
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-foreground">
                        {rec.total_material_cost
                          ? `R$${Number(rec.total_material_cost).toFixed(2)}`
                          : "-"}
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-accent">
                        {Number(rec.charged_value) > 0
                          ? `R$${Number(rec.charged_value).toFixed(2)}`
                          : "-"}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${
                            rec.status === "FINALIZADO"
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
                      <td className="px-3 py-3 text-center">
                        {evaluation && EvalIcon ? (
                          <span
                            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ${evaluation.bg} ${evaluation.color}`}
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Pagina {page + 1} de {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground disabled:opacity-40"
                  aria-label="Pagina anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() =>
                    setPage(Math.min(totalPages - 1, page + 1))
                  }
                  disabled={page >= totalPages - 1}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground disabled:opacity-40"
                  aria-label="Proxima pagina"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
