"use client";

import React from "react";
import useSWR from "swr";
import { useState, useCallback, useMemo } from "react";
import {
  History,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronRight as ChevronExpand,
  DollarSign,
  Clock,
  Layers,
  Pause,
  Building2,
  Calendar,
  Users,
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

interface PauseLog {
  id: number;
  production_record_id: number;
  reason: string;
  paused_at: string;
  resumed_at: string | null;
  duration_min: number | null;
}

interface DisplayRow {
  record: HistoryRecord;
  isGroup: boolean;
  groupSize: number;
  subRows: HistoryRecord[];
}

interface CompanyGroup {
  companyName: string;
  companyId: number | null;
  rows: DisplayRow[];
  totalCharged: number;
  totalMachineCost: number;
  totalParts: number;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function HistoricoPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedOperator, setSelectedOperator] = useState("all");
  const [searchPart, setSearchPart] = useState("");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [pauseCache, setPauseCache] = useState<Record<string, PauseLog[]>>({});

  const { data: operatorsData } = useSWR("/api/operators", fetcher);
  const operators = operatorsData?.operators || [];
  const { data: companiesData } = useSWR("/api/companies", fetcher);
  const companies = companiesData?.companies || [];

  const dateRange = useMemo(() => {
    const start = new Date(selectedMonth.year, selectedMonth.month, 1);
    const end = new Date(selectedMonth.year, selectedMonth.month + 1, 0);
    return {
      from: start.toISOString().split("T")[0],
      to: end.toISOString().split("T")[0],
    };
  }, [selectedMonth]);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set("date_from", dateRange.from);
    params.set("date_to", dateRange.to);
    if (selectedOperator !== "all") params.set("operator_id", selectedOperator);
    if (searchPart.trim()) params.set("part_code", searchPart.trim());
    params.set("limit", "1000");
    params.set("offset", "0");
    return `/api/history?${params.toString()}`;
  }, [dateRange, selectedOperator, searchPart]);

  const { data, isLoading } = useSWR(buildUrl(), fetcher);
  const records: HistoryRecord[] = data?.records || [];
  const total: number = data?.total || 0;

  const displayRows: DisplayRow[] = useMemo(() => {
    const groupMap = new Map<number, HistoryRecord[]>();
    const rows: DisplayRow[] = [];
    const seenGroups = new Set<number>();

    records.forEach((rec) => {
      if (rec.group_id) {
        if (!groupMap.has(rec.group_id)) groupMap.set(rec.group_id, []);
        groupMap.get(rec.group_id)!.push(rec);
      }
    });

    groupMap.forEach((group) => {
      group.sort((a, b) => (a.operation_sequence || 0) - (b.operation_sequence || 0));
    });

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
        rows.push({ record: rec, isGroup: false, groupSize: 1, subRows: [] });
      }
    });

    return rows;
  }, [records]);

  // Group by company
  const companyGroups: CompanyGroup[] = useMemo(() => {
    const map = new Map<string, DisplayRow[]>();

    displayRows.forEach((row) => {
      const key = row.record.company_name || "Sem Empresa";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    });

    const groups: CompanyGroup[] = [];
    map.forEach((rows, companyName) => {
      const totalCharged = rows.reduce(
        (sum, r) => sum + Number(r.record.charged_value || 0) * (r.record.quantity || 0),
        0,
      );
      const allRecs = rows.flatMap((r) => [r.record, ...r.subRows]);
      const finished = allRecs.filter((r) => r.status === "FINALIZADO");
      const totalMachineCost = finished.reduce(
        (sum, r) => sum + (Number(r.machine_cost) || 0),
        0,
      );
      groups.push({
        companyName,
        companyId: rows[0].record.company_id || null,
        rows,
        totalCharged,
        totalMachineCost,
        totalParts: rows.length,
      });
    });

    groups.sort((a, b) => a.companyName.localeCompare(b.companyName));
    return groups;
  }, [displayRows]);

  // Global totals
  const globalTotalCharged = companyGroups.reduce((s, g) => s + g.totalCharged, 0);
  const globalTotalMachineCost = companyGroups.reduce((s, g) => s + g.totalMachineCost, 0);

  function changeMonth(delta: number) {
    setSelectedMonth((prev) => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      return { year: y, month: m };
    });
    setExpandedCards(new Set());
    setPauseCache({});
  }

  function getCardKey(row: DisplayRow) {
    return row.record.group_id ? `g-${row.record.group_id}` : `s-${row.record.id}`;
  }

  async function toggleCard(row: DisplayRow) {
    const key = getCardKey(row);
    const next = new Set(expandedCards);

    if (next.has(key)) {
      next.delete(key);
      setExpandedCards(next);
      return;
    }

    next.add(key);
    setExpandedCards(next);

    if (!pauseCache[key]) {
      const allRecords = [row.record, ...row.subRows];
      const ids = allRecords.map((r) => r.id).join(",");
      try {
        const res = await fetch(`/api/history/pauses?record_ids=${ids}`);
        const d = await res.json();
        setPauseCache((prev) => ({ ...prev, [key]: d.pauses || [] }));
      } catch {
        setPauseCache((prev) => ({ ...prev, [key]: [] }));
      }
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <History className="h-6 w-6 text-accent" />
          Historico de Producao
        </h1>
        <p className="text-sm text-muted-foreground">
          {total} registro(s) em {MONTH_NAMES[selectedMonth.month]}
        </p>
      </div>

      {/* Month Navigator + Filters */}
      <div className="mb-6 grid gap-3 sm:gap-4 md:grid-cols-2">
        {/* Month Selector */}
        <div className="flex items-center justify-between rounded-xl bg-card p-4 shadow-sm">
          <button
            onClick={() => changeMonth(-1)}
            className="flex items-center gap-1 rounded-lg bg-muted px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 text-center">
            <Calendar className="h-5 w-5 text-accent" />
            <span className="text-lg font-bold text-foreground">
              {MONTH_NAMES[selectedMonth.month]}
            </span>
            <span className="text-sm text-muted-foreground">
              {selectedMonth.year}
            </span>
          </div>

          <button
            onClick={() => changeMonth(1)}
            className="flex items-center gap-1 rounded-lg bg-muted px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Operator + Part Filters */}
        <div className="flex flex-col gap-3 rounded-xl bg-card p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
            <select
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value)}
              className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="all">Todos Operadores</option>
              {operators.map((op: { id: number; name: string }) => (
                <option key={op.id} value={op.id}>{op.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-1 items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={searchPart}
              onChange={(e) => setSearchPart(e.target.value.toUpperCase())}
              placeholder="Buscar peca..."
              className="h-10 flex-1 rounded-lg border border-input bg-background px-3 font-mono text-sm text-foreground uppercase placeholder:font-sans placeholder:normal-case placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {displayRows.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <History className="h-3.5 w-3.5" />
              Total Pecas
            </div>
            <p className="mt-1 font-mono text-xl font-bold text-foreground">
              {displayRows.length}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              Empresas
            </div>
            <p className="mt-1 font-mono text-xl font-bold text-foreground">
              {companyGroups.length}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              Custo Maquina
            </div>
            <p className="mt-1 font-mono text-xl font-bold text-foreground">
              R$ {globalTotalMachineCost.toFixed(2)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              Valor Cobrado
            </div>
            <p className="mt-1 font-mono text-xl font-bold text-accent">
              R$ {globalTotalCharged.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : companyGroups.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <History className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
          <h3 className="mb-1 text-lg font-semibold text-card-foreground">
            Nenhum registro encontrado
          </h3>
          <p className="text-sm text-muted-foreground">
            Sem producoes em {MONTH_NAMES[selectedMonth.month]} {selectedMonth.year}.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {companyGroups.map((group) => (
            <div key={group.companyName}>
              {/* Company Header */}
              <div className="mb-3 rounded-xl bg-primary px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="h-5 w-5 shrink-0 text-primary-foreground/70" />
                    <h2 className="truncate text-base font-bold text-primary-foreground">
                      {group.companyName}
                    </h2>
                    <span className="shrink-0 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                      {group.totalParts}
                    </span>
                  </div>
                  <div className="hidden items-center gap-4 sm:flex">
                    <div className="text-right">
                      <p className="text-[10px] font-medium uppercase text-primary-foreground/50">
                        Custo Maq.
                      </p>
                      <p className="font-mono text-sm font-bold text-primary-foreground/80">
                        R$ {group.totalMachineCost.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-medium uppercase text-primary-foreground/50">
                        Cobrado
                      </p>
                      <p className="font-mono text-sm font-bold text-primary-foreground">
                        R$ {group.totalCharged.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4 sm:hidden">
                  <div>
                    <p className="text-[10px] font-medium uppercase text-primary-foreground/50">Custo Maq.</p>
                    <p className="font-mono text-xs font-bold text-primary-foreground/80">R$ {group.totalMachineCost.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase text-primary-foreground/50">Cobrado</p>
                    <p className="font-mono text-xs font-bold text-primary-foreground">R$ {group.totalCharged.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {group.rows.map((row) => {
                  const rec = row.record;
                  const cardKey = getCardKey(row);
                  const expanded = expandedCards.has(cardKey);
                  const chargedPerPiece = Number(rec.charged_value) || 0;
                  const chargedTotal = chargedPerPiece * (rec.quantity || 0);
                  const pauses = pauseCache[cardKey] || [];

                  return (
                    <div
                      key={cardKey}
                      className={`rounded-2xl border bg-card shadow-sm transition-all hover:shadow-md ${
                        expanded ? "border-accent/50" : "border-border"
                      }`}
                    >
                      {/* Card - Clicavel */}
                      <div
                        onClick={() => toggleCard(row)}
                        className="cursor-pointer select-none p-4"
                      >
                        {/* Top row */}
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              {expanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronExpand className="h-4 w-4" />
                              )}
                            </div>
                            <span className="font-mono text-base font-bold text-foreground">
                              {rec.part_code}
                            </span>
                            {rec.part_description && (
                              <span className="hidden text-sm text-muted-foreground sm:inline">
                                {rec.part_description}
                              </span>
                            )}
                            {row.isGroup && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                <Layers className="h-3 w-3" />
                                {row.groupSize} ops
                              </span>
                            )}
                            {rec.total_pause_ms > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--warning))]/10 px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--warning))]">
                                <Pause className="h-3 w-3" />
                                {Math.round(rec.total_pause_ms / 60000)}min
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {new Date(rec.start_time).toLocaleDateString("pt-BR")}
                            </span>
                            <StatusBadge status={rec.status} />
                          </div>
                        </div>

                        {/* Info row */}
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                          <InfoCell label="Operacao" value={rec.operation_name} />
                          <InfoCell label="Operador" value={rec.operator_name} />
                          <InfoCell label="Qtd" value={String(rec.quantity)} mono bold />
                          <InfoCell
                            label="Base/Hora"
                            value={rec.base_cost_per_hour ? Number(rec.base_cost_per_hour).toFixed(2) : "-"}
                            mono
                          />
                          <InfoCell
                            label="Maq/Hora"
                            value={rec.machine_cost_per_hour ? `R$ ${Number(rec.machine_cost_per_hour).toFixed(2)}` : "-"}
                            mono
                          />
                          <InfoCell
                            label="Custo Maq."
                            value={rec.machine_cost ? `R$ ${Number(rec.machine_cost).toFixed(2)}` : "-"}
                            mono
                          />
                          <InfoCell
                            label="Valor/Pc"
                            value={chargedPerPiece > 0 ? `R$ ${chargedPerPiece.toFixed(2)}` : "-"}
                            mono accent
                          />
                          <InfoCell
                            label="Valor Total"
                            value={chargedTotal > 0 ? `R$ ${chargedTotal.toFixed(2)}` : "-"}
                            mono bold accent
                          />
                        </div>

                        {/* Profitability bar */}
                        {(() => {
                          const allRecs = row.isGroup ? [rec, ...row.subRows] : [rec];
                          const allDone = allRecs.every((r) => r.status === "FINALIZADO");
                          const totalTime = allRecs.reduce((a, r) => a + (Number(r.total_time_min) || 0), 0);
                          const realPerMin = totalTime > 0 ? chargedTotal / totalTime : 0;
                          const TARGET = 1.667;

                          return (
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-1.5">
                              <div className="flex flex-wrap items-center gap-3 text-xs">
                                <span className="text-muted-foreground">
                                  <strong className="font-mono text-foreground">{totalTime.toFixed(1)}</strong> min
                                </span>
                                <span className="hidden h-3 w-px bg-border sm:block" />
                                <span className="text-muted-foreground">
                                  Real/Min{" "}
                                  <strong
                                    className={`font-mono ${
                                      allDone
                                        ? realPerMin < TARGET - 0.01
                                          ? "text-destructive"
                                          : realPerMin > TARGET + 0.01
                                            ? "text-emerald-500"
                                            : "text-foreground"
                                        : "text-foreground"
                                    }`}
                                  >
                                    R$ {realPerMin.toFixed(2)}
                                  </strong>
                                </span>
                                <span className="hidden h-3 w-px bg-border sm:block" />
                                <span className="text-muted-foreground">
                                  Meta <strong className="font-mono text-muted-foreground">R$ {TARGET.toFixed(2)}</strong>
                                </span>
                              </div>
                              <ProfitBadge allDone={allDone} realPerMin={realPerMin} target={TARGET} totalTime={totalTime} />
                            </div>
                          );
                        })()}
                      </div>

                      {/* Expanded Details */}
                      {expanded && (
                        <div className="border-t border-border bg-muted/30 px-4 pb-4 pt-3">
                          {/* Group operations */}
                          {row.isGroup && row.subRows.length > 0 && (
                            <div className="mb-4">
                              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                                <Layers className="h-3.5 w-3.5" />
                                Operacoes da peca ({row.groupSize})
                              </p>
                              <div className="space-y-1.5">
                                <OperationRow rec={rec} index={1} highlight />
                                {row.subRows.map((sub, idx) => (
                                  <OperationRow key={sub.id} rec={sub} index={idx + 2} />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Pause history */}
                          <div>
                            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                              <Pause className="h-3.5 w-3.5" />
                              Historico de Pausas
                            </p>
                            {pauses.length === 0 ? (
                              <div className="rounded-xl bg-background p-3 text-center text-sm text-muted-foreground">
                                Nenhuma pausa registrada.
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {pauses.map((p) => {
                                  const opName = row.isGroup
                                    ? [rec, ...row.subRows].find((r) => r.id === p.production_record_id)?.operation_name || "-"
                                    : rec.operation_name;
                                  return (
                                    <div key={p.id} className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl bg-background p-3">
                                      {row.isGroup && <InfoCell label="Operacao" value={opName} small />}
                                      <InfoCell label="Motivo" value={p.reason} small bold />
                                      <InfoCell
                                        label="Pausado em"
                                        value={new Date(p.paused_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                        small mono
                                      />
                                      <InfoCell
                                        label="Retomado"
                                        value={
                                          p.resumed_at
                                            ? new Date(p.resumed_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                                            : "Em pausa"
                                        }
                                        small mono
                                      />
                                      <div>
                                        <p className="text-[10px] font-medium uppercase text-muted-foreground">Duracao do Pause</p>
                                        <p className="font-mono text-sm font-bold text-[hsl(var(--warning))]">
                                          {p.duration_min !== null ? `${p.duration_min} min` : "..."}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- Helper Components ---- */

function InfoCell({
  label,
  value,
  mono,
  bold,
  accent,
  small,
}: {
  label: string;
  value: string;
  mono?: boolean;
  bold?: boolean;
  accent?: boolean;
  small?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
      <p
        className={`text-sm ${mono ? "font-mono" : ""} ${bold ? "font-bold" : "font-medium"} ${
          accent ? "text-accent" : "text-foreground"
        } ${small ? "text-xs" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        status === "FINALIZADO"
          ? "bg-muted text-muted-foreground"
          : status === "EM_PRODUCAO"
            ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]"
            : "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]"
      }`}
    >
      {status === "EM_PRODUCAO" ? "Producao" : status === "PAUSADO" ? "Pausado" : "Finalizado"}
    </span>
  );
}

function ProfitBadge({
  allDone,
  realPerMin,
  target,
  totalTime,
}: {
  allDone: boolean;
  realPerMin: number;
  target: number;
  totalTime: number;
}) {
  if (totalTime === 0) {
    return <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Sem dados</span>;
  }
  if (!allDone) {
    return <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Em andamento</span>;
  }
  if (realPerMin < target - 0.01) {
    return <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">Ruim</span>;
  }
  if (realPerMin > target + 0.01) {
    return <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">Excelente</span>;
  }
  return <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Bom</span>;
}

function OperationRow({ rec, index, highlight }: { rec: HistoryRecord; index: number; highlight?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl bg-background p-3 ${highlight ? "ring-1 ring-accent/30" : ""}`}>
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
          highlight ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
        }`}
      >
        {index}
      </span>
      <InfoCell label="Data" value={new Date(rec.start_time).toLocaleDateString("pt-BR")} small />
      <InfoCell label="Operacao" value={rec.operation_name} small bold />
      <InfoCell label="Operador" value={rec.operator_name} small />
      <InfoCell label="Tempo" value={rec.total_time_min ? `${rec.total_time_min} min` : "-"} small mono />
      <StatusBadge status={rec.status} />
    </div>
  );
}
