"use client";

import React from "react";
import useSWR from "swr";
import { useState, useCallback, useMemo } from "react";
import {
  History,
  Search,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronRight as ChevronExpand,
  DollarSign,
  Clock,
  X,
  Layers,
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
  base_cost_per_hour: number;
  machine_cost_per_hour: number;
  operator_name: string;
  operator_id: number;
  total_time_min: number | null;
  time_per_piece_min: number | null;
  machine_cost: number | null;
  total_material_cost: number | null;
  company_name?: string;
  company_id?: number;
  group_id?: number;
  operation_sequence?: number;
}

interface DisplayRow {
  record: HistoryRecord;
  isGroup: boolean;
  groupSize: number;
  subRows: HistoryRecord[];
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
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  const { data: operatorsData } = useSWR("/api/operators", fetcher);
  const operators = operatorsData?.operators || [];
  const { data: companiesData } = useSWR("/api/companies", fetcher);
  const companies = companiesData?.companies || [];

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

  // Group records by group_id. API already returns groups together and sorted by operation_sequence.
  const displayRows: DisplayRow[] = useMemo(() => {
    const groupMap = new Map<number, HistoryRecord[]>();
    const rows: DisplayRow[] = [];
    const seenGroups = new Set<number>();

    // Collect group members
    records.forEach((rec) => {
      if (rec.group_id) {
        if (!groupMap.has(rec.group_id)) {
          groupMap.set(rec.group_id, []);
        }
        groupMap.get(rec.group_id)!.push(rec);
      }
    });

    // Sort each group by operation_sequence (API already does this, but ensure)
    groupMap.forEach((group) => {
      group.sort(
        (a, b) => (a.operation_sequence || 0) - (b.operation_sequence || 0),
      );
    });

    // Build display rows preserving API order
    records.forEach((rec) => {
      if (rec.group_id) {
        if (seenGroups.has(rec.group_id)) return;
        seenGroups.add(rec.group_id);
        const group = groupMap.get(rec.group_id)!;
        rows.push({
          record: group[0],
          isGroup: group.length > 1,
          groupSize: group.length,
          subRows: group.slice(1),
        });
      } else {
        rows.push({
          record: rec,
          isGroup: false,
          groupSize: 1,
          subRows: [],
        });
      }
    });

    return rows;
  }, [records]);

  function toggleGroup(groupId: number) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

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

  // Summary stats — only count head records (one per group) for charged values
  const allFinished = records.filter((r) => r.status === "FINALIZADO");
  const avgTimePP =
    allFinished.length > 0
      ? (
        allFinished.reduce(
          (sum, r) => sum + (Number(r.time_per_piece_min) || 0),
          0,
        ) / allFinished.length
      ).toFixed(2)
      : null;
  const totalMachineCost = allFinished.reduce(
    (sum, r) => sum + (Number(r.machine_cost) || 0),
    0,
  );
  // Charged value: only from head records (first operation per group)
  const totalCharged = displayRows.reduce(
    (sum, row) =>
      sum + Number(row.record.charged_value || 0) * (row.record.quantity || 0),
    0,
  );
  // Material cost: only from head records (belongs to group, not individual operations)
  const totalMaterialCostSum = displayRows.reduce(
    (sum, row) => sum + (Number(row.record.total_material_cost) || 0),
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
          className={`flex h-12 items-center gap-2 rounded-xl px-5 font-bold transition-all ${hasActiveFilters
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
                {companies.map((c: { id: number; name: string }) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
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
                {operators.map((op: { id: number; name: string }) => (
                  <option key={op.id} value={op.id}>
                    {op.name}
                  </option>
                ))}
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
      {displayRows.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Tempo Med./Peca
            </div>
            <p className="mt-1 font-mono text-xl font-bold text-foreground">
              {avgTimePP ? `${avgTimePP}min` : "-"}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              Custo Maquina Total
            </div>
            <p className="mt-1 font-mono text-xl font-bold text-foreground">
              R$ {totalMachineCost.toFixed(2)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              Valor Total Cobrado
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
              {displayRows.length}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                / {total}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Records */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : displayRows.length === 0 ? (
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
        <div className="space-y-3">
          {displayRows.map((row) => {
            const rec = row.record;
            const expanded =
              rec.group_id ? expandedGroups.has(rec.group_id) : false;
            const chargedPerPiece = Number(rec.charged_value) || 0;
            const chargedTotal = chargedPerPiece * (rec.quantity || 0);

            return (
              <div
                key={rec.group_id ? `g-${rec.group_id}` : `s-${rec.id}`}
                className={`rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md ${row.isGroup
                  ? expanded
                    ? "border-accent/50"
                    : "border-border"
                  : "border-border"
                  }`}
              >
                {/* Card Principal */}
                <div
                  onClick={
                    row.isGroup && rec.group_id
                      ? () => toggleGroup(rec.group_id!)
                      : undefined
                  }
                  className={`p-4 ${row.isGroup ? "cursor-pointer select-none" : ""
                    }`}
                >
                  {/* Header: Peca + Empresa + Data + Status */}
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {row.isGroup && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          {expanded ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronExpand className="h-5 w-5" />
                          )}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg font-bold text-foreground">
                            {rec.part_code}
                          </span>
                          {row.isGroup && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                              <Layers className="h-3 w-3" />
                              {row.groupSize} operacoes
                            </span>
                          )}
                        </div>
                        {rec.part_description && (
                          <p className="text-xs text-muted-foreground">
                            {rec.part_description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {new Date(rec.start_time).toLocaleDateString("pt-BR")}
                      </span>
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${rec.status === "FINALIZADO"
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
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-10">
                    <div>
                      <p className="text-[10px] font-medium uppercase text-muted-foreground">
                        Empresa
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {rec.company_name || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase text-muted-foreground">
                        Operacao
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {rec.operation_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase text-muted-foreground">
                        Operador
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {rec.operator_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase text-muted-foreground">
                        Qtd
                      </p>
                      <p className="font-mono text-sm font-bold text-foreground">
                        {rec.quantity}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase text-muted-foreground">
                        Base/Hora
                      </p>
                      <p className="font-mono text-sm text-foreground">
                        {rec.base_cost_per_hour
                          ? `R$ ${Number(rec.base_cost_per_hour).toFixed(2)}`
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase text-muted-foreground">
                        Maq/Hora
                      </p>
                      <p className="font-mono text-sm text-foreground">
                        {rec.machine_cost_per_hour
                          ? `R$ ${Number(rec.machine_cost_per_hour).toFixed(2)}`
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase text-muted-foreground">
                        Custo Maq.
                      </p>
                      <p className="font-mono text-sm text-foreground">
                        {rec.machine_cost
                          ? `R$ ${Number(rec.machine_cost).toFixed(2)}`
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase text-muted-foreground">
                        Custo MP
                      </p>
                      <p className="font-mono text-sm text-foreground">
                        {rec.total_material_cost
                          ? `R$ ${Number(rec.total_material_cost).toFixed(2)}`
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase text-muted-foreground">
                        Valor/Pç
                      </p>
                      <p className="font-mono text-sm font-semibold text-accent">
                        {chargedPerPiece > 0
                          ? `R$ ${chargedPerPiece.toFixed(2)}`
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase text-muted-foreground">
                        Valor Total
                      </p>
                      <p className="font-mono text-sm font-bold text-accent">
                        {chargedTotal > 0
                          ? `R$ ${chargedTotal.toFixed(2)}`
                          : "-"}
                      </p>
                    </div>
                  </div>

                  {/* Financial Analysis / Profitability - Only at Group Level */}
                  {(() => {
                    const allRecords = row.isGroup ? [rec, ...row.subRows] : [rec];
                    const allFinished = allRecords.every(r => r.status === "FINALIZADO");
                    const totalTime = allRecords.reduce((acc, r) => acc + (Number(r.total_time_min) || 0), 0);
                    const realPerMin = totalTime > 0 ? chargedTotal / totalTime : 0;
                    const TARGET_PER_MIN = 1.667; // Fixed business factor

                    return (
                      <div className="mt-3 flex items-center justify-between rounded-xl bg-muted/40 px-4 py-2">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-[10px] font-medium uppercase text-muted-foreground">
                              Tempo Total
                            </p>
                            <p className="font-mono text-sm font-medium text-foreground">
                              {totalTime.toFixed(2)} min
                            </p>
                          </div>
                          <div className="h-8 w-px bg-border"></div>
                          <div>
                            <p className="text-[10px] font-medium uppercase text-muted-foreground">
                              Valor Cobrado
                            </p>
                            <p className="font-mono text-sm font-bold text-accent">
                              R$ {chargedTotal.toFixed(2)}
                            </p>
                          </div>
                          <div className="h-8 w-px bg-border"></div>
                          <div>
                            <p className="text-[10px] font-medium uppercase text-muted-foreground">
                              Real / Min
                            </p>
                            <p className={`font-mono text-sm font-bold ${allFinished
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
                        </div>

                        <div className="flex items-center gap-2">
                          {totalTime === 0 ? (
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
                    );
                  })()}
                </div>

                {/* Sub-operacoes expandidas */}
                {expanded && row.subRows.length > 0 && (
                  <div className="border-t border-border bg-muted/30 px-4 pb-3 pt-2">
                    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                      Operacoes do grupo
                    </p>
                    <div className="space-y-2">
                      {row.subRows.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl bg-background p-3"
                        >
                          <div className="min-w-[80px]">
                            <p className="text-[10px] font-medium uppercase text-muted-foreground">
                              Data
                            </p>
                            <p className="text-sm text-foreground">
                              {new Date(sub.start_time).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          <div className="min-w-[100px]">
                            <p className="text-[10px] font-medium uppercase text-muted-foreground">
                              Operacao
                            </p>
                            <p className="text-sm font-medium text-foreground">
                              {sub.operation_name}
                            </p>
                          </div>
                          <div className="min-w-[100px]">
                            <p className="text-[10px] font-medium uppercase text-muted-foreground">
                              Operador
                            </p>
                            <p className="text-sm text-foreground">
                              {sub.operator_name}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-medium uppercase text-muted-foreground">
                              Qtd
                            </p>
                            <p className="font-mono text-sm font-bold text-foreground">
                              {sub.quantity}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-medium uppercase text-muted-foreground">
                              Tempo Total
                            </p>
                            <p className="font-mono text-sm text-foreground">
                              {sub.total_time_min
                                ? `${sub.total_time_min} min`
                                : "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-medium uppercase text-muted-foreground">
                              Tempo/Peca
                            </p>
                            <p className="font-mono text-sm text-foreground">
                              {sub.time_per_piece_min
                                ? `${sub.time_per_piece_min} min`
                                : "-"}
                            </p>
                          </div>
                          <div>
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${sub.status === "FINALIZADO"
                                ? "bg-muted text-muted-foreground"
                                : sub.status === "EM_PRODUCAO"
                                  ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]"
                                  : "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]"
                                }`}
                            >
                              {sub.status === "EM_PRODUCAO"
                                ? "Producao"
                                : sub.status === "PAUSADO"
                                  ? "Pausado"
                                  : "Finalizado"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
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
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
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
  );
}
