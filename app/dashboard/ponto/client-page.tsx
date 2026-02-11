"use client";

import useSWR from "swr";
import { useState } from "react";
import { Clock, Calendar, Timer, Coffee, ChevronLeft, ChevronRight } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function formatTime(dateString: string | null) {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatMinutes(minutes: number | null) {
    if (!minutes && minutes !== 0) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    if (hours > 0) return `${hours}h ${mins}min`;
    return `${mins}min`;
}

export default function PontoPage({ operators }: { operators: { id: number; name: string }[] }) {
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split("T")[0];
    });
    const [selectedOperator, setSelectedOperator] = useState<string>("all");
    const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");

    // Calculate start/end dates based on viewMode
    const getRange = () => {
        const date = new Date(selectedDate + "T00:00:00"); // Fix: Force local time interpretation
        if (viewMode === "daily") {
            return { start: selectedDate, end: selectedDate };
        } else {
            // Weekly: Start Monday, End Friday
            // Adjust to get Monday of the week
            const day = date.getDay(); // 0 (Sun) to 6 (Sat)
            // Monday is 1. If Sunday (0), go back 6 days.
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);

            const start = new Date(date);
            start.setDate(diff);

            const end = new Date(start);
            end.setDate(start.getDate() + 4); // Friday

            return {
                start: start.toISOString().split("T")[0],
                end: end.toISOString().split("T")[0]
            };
        }
    };

    const { start: startDate, end: endDate } = getRange();

    const queryParams = new URLSearchParams({
        operator_id: selectedOperator,
    });

    if (viewMode === "daily") {
        queryParams.set("date", selectedDate);
    } else {
        queryParams.set("start_date", startDate);
        queryParams.set("end_date", endDate);
    }

    const { data, isLoading, error } = useSWR(
        `/api/time-records?${queryParams.toString()}`,
        fetcher,
        { refreshInterval: 30000 }
    );

    const records = data?.records || [];
    const dailyTotals = data?.dailyTotals || {};

    // Calculate total for the period
    const totalMinutes = Object.values(dailyTotals).reduce((a: number, b: any) => a + (Number(b) || 0), 0);

    function changeDate(delta: number) {
        const date = new Date(selectedDate + "T00:00:00"); // Fix: Force local time
        if (viewMode === "daily") {
            date.setDate(date.getDate() + delta);
        } else {
            date.setDate(date.getDate() + (delta * 7));
        }
        setSelectedDate(date.toISOString().split("T")[0]);
    }

    // Group records by date if weekly
    const groupedRecords = records.reduce((acc: any, record: any) => {
        const date = record.record_date.split("T")[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(record);
        return acc;
    }, {});

    // Sort dates in descending order (latest first)
    const sortedDates = Object.keys(groupedRecords).sort((a, b) => b.localeCompare(a));

    return (
        <div className="mx-auto max-w-4xl px-4 py-6">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                        <Clock className="h-6 w-6 text-accent" />
                        Controle de Ponto
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Registros automáticos de entrada e saída
                    </p>
                </div>

                {/* View Switcher */}
                <div className="flex rounded-lg bg-muted p-1">
                    <button
                        onClick={() => setViewMode("daily")}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${viewMode === "daily"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        Diário
                    </button>
                    <button
                        onClick={() => setViewMode("weekly")}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${viewMode === "weekly"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        Semanal
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-6 grid gap-4 md:grid-cols-2">
                {/* Date Selector */}
                <div className="flex items-center justify-between rounded-xl bg-card p-4 shadow-sm">
                    <button
                        onClick={() => changeDate(-1)}
                        className="flex items-center gap-1 rounded-lg bg-muted px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Anterior</span>
                    </button>

                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Calendar className="hidden h-5 w-5 text-accent sm:block" />
                        {viewMode === "daily" ? (
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent sm:px-3"
                            />
                        ) : (
                            <div className="flex flex-col items-center">
                                <span className="text-xs sm:text-sm">Semana de</span>
                                <span className="text-muted-foreground text-[10px] sm:text-xs">
                                    {startDate ? new Date(startDate + "T00:00:00").toLocaleDateString('pt-BR') : '-'} ate {endDate ? new Date(endDate + "T00:00:00").toLocaleDateString('pt-BR') : '-'}
                                </span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => changeDate(1)}
                        className="flex items-center gap-1 rounded-lg bg-muted px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
                    >
                        <span className="hidden sm:inline">Proximo</span>
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>

                {/* Operator Selector */}
                <div className="flex items-center gap-2 rounded-xl bg-card p-4 shadow-sm">
                    <span className="text-sm font-medium text-foreground">Operador:</span>
                    <select
                        value={selectedOperator}
                        onChange={(e) => setSelectedOperator(e.target.value)}
                        className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                        <option value="all">Todos os Operadores</option>
                        {operators.map((op) => (
                            <option key={op.id} value={op.id}>
                                {op.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary Box */}
            <div className="mb-6 rounded-xl bg-gradient-to-r from-accent/20 to-primary/20 p-4 shadow-sm sm:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">
                            {viewMode === "daily" ? "Total do Dia" : "Total da Semana"}
                        </p>
                        <p className="text-2xl font-bold text-foreground sm:text-3xl">
                            {formatMinutes(totalMinutes)}
                        </p>
                    </div>
                    <div className="rounded-full bg-accent/20 p-3 sm:p-4">
                        <Timer className="h-6 w-6 text-accent sm:h-8 sm:w-8" />
                    </div>
                </div>
                {viewMode === "daily" && (
                    <p className="mt-2 text-sm text-muted-foreground">
                        {new Date(selectedDate + "T00:00:00").toLocaleDateString("pt-BR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                        })}
                    </p>
                )}
            </div>

            {/* Records List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
                </div>
            ) : error ? (
                <div className="rounded-xl bg-destructive/10 p-6 text-center">
                    <p className="text-destructive">Erro ao carregar registros</p>
                </div>
            ) : records.length === 0 ? (
                <div className="rounded-xl bg-muted p-12 text-center">
                    <Clock className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
                    <h3 className="text-lg font-semibold text-foreground">
                        Nenhum registro
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Sem registros de ponto para este período.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {(viewMode === "weekly" ? sortedDates : [selectedDate]).map(dateKey => {
                        const dayRecords = viewMode === "weekly" ? groupedRecords[dateKey] : records;
                        if (!dayRecords || dayRecords.length === 0) return null;

                        const dayTotal = dailyTotals[dateKey] || 0;

                        return (
                            <div key={dateKey} className="space-y-3">
                                {viewMode === "weekly" && (
                                    <div className="flex items-center justify-between border-b border-border pb-2 pt-2">
                                        <h3 className="font-semibold text-foreground flex items-center gap-2 capitalize">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            {new Date(dateKey + 'T00:00:00').toLocaleDateString("pt-BR", {
                                                weekday: "long",
                                                day: "numeric",
                                                month: "numeric"
                                            })}
                                        </h3>
                                        <span className="text-sm font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                                            {formatMinutes(dayTotal)}
                                        </span>
                                    </div>
                                )}

                                {dayRecords.map((record: any) => (
                                    <div
                                        key={record.id}
                                        className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm hover:bg-accent/5 transition-colors"
                                    >
                                        <div className="flex flex-col items-center min-w-[90px]">
                                            <div className="flex items-center gap-1 text-[hsl(var(--success))]">
                                                <span className="text-lg font-bold">{formatTime(record.clock_in)}</span>
                                            </div>
                                            <div className="my-1 h-4 w-px bg-border" />
                                            <div className="flex items-center gap-1 text-destructive">
                                                <span className="text-lg font-bold">{formatTime(record.clock_out)}</span>
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            {record.operator_name && (selectedOperator === "all") && (
                                                <p className="mb-1 text-sm font-bold text-accent truncate">
                                                    {record.operator_name}
                                                </p>
                                            )}
                                            {record.part_code && (
                                                <p className="font-mono text-sm font-medium text-foreground truncate">
                                                    {record.part_code}
                                                </p>
                                            )}
                                            {record.reason && (
                                                <p className="flex items-center gap-1 text-sm text-muted-foreground truncate">
                                                    <Coffee className="h-3.5 w-3.5 flex-shrink-0" />
                                                    {record.reason}
                                                </p>
                                            )}
                                        </div>

                                        <div className="text-right">
                                            {record.clock_out ? (
                                                <span className="rounded-full bg-accent/10 px-3 py-1 font-mono text-sm font-bold text-accent whitespace-nowrap">
                                                    {formatMinutes(record.worked_minutes)}
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-[hsl(var(--success))]/10 px-3 py-1 text-sm font-medium text-[hsl(var(--success))] whitespace-nowrap">
                                                    Em curso
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
