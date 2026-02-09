"use client";

import useSWR from "swr";
import { useState } from "react";
import { Clock, Calendar, Coffee, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function formatTime(dateString: string | null) {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatDuration(minutes: number | null) {
    if (!minutes && minutes !== 0) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    if (hours > 0) return `${hours}h ${mins}min`;
    return `${mins}min`;
}

interface AbsenceLog {
    id: number;
    reason: string;
    paused_at: string;
    resumed_at: string | null;
    duration_minutes: number | null;
    part_code: string | null;
    operator_name: string;
}

export default function AusenciasClientPage({ operators }: { operators: { id: number; name: string }[] }) {
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split("T")[0];
    });
    const [selectedOperator, setSelectedOperator] = useState<string>("all");

    const { data, isLoading, error } = useSWR(
        `/api/absences?date=${selectedDate}&operator_id=${selectedOperator}`,
        fetcher,
        { refreshInterval: 30000 }
    );

    const logs: AbsenceLog[] = data?.logs || [];

    function changeDate(delta: number) {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + delta);
        setSelectedDate(date.toISOString().split("T")[0]);
    }

    return (
        <div className="mx-auto max-w-5xl px-4 py-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                    <AlertCircle className="h-6 w-6 text-accent" />
                    Registro de Ausências
                </h1>
                <p className="text-sm text-muted-foreground">
                    Monitoramento de pausas (exceto almoço/fim de turno)
                </p>
            </div>

            {/* Filters */}
            <div className="mb-6 grid gap-4 md:grid-cols-2">
                {/* Date Selector */}
                <div className="flex items-center justify-between rounded-xl bg-card p-4 shadow-sm">
                    <button
                        onClick={() => changeDate(-1)}
                        className="flex items-center gap-1 rounded-lg bg-muted px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                    </button>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-accent" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>
                    <button
                        onClick={() => changeDate(1)}
                        className="flex items-center gap-1 rounded-lg bg-muted px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
                    >
                        Próximo
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

            {/* Logs List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
                </div>
            ) : error ? (
                <div className="rounded-xl bg-destructive/10 p-6 text-center">
                    <p className="text-destructive">Erro ao carregar registros</p>
                </div>
            ) : logs.length === 0 ? (
                <div className="rounded-xl bg-muted p-12 text-center">
                    <Coffee className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
                    <h3 className="text-lg font-semibold text-foreground">
                        Nenhuma ausência registrada
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Nenhuma pausa extra registrada para esta data.
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Operador</th>
                                    <th className="px-4 py-3 font-medium">Horário</th>
                                    <th className="px-4 py-3 font-medium">Duração</th>
                                    <th className="px-4 py-3 font-medium">Motivo</th>
                                    <th className="px-4 py-3 font-medium">Peça</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-foreground">
                                            {log.operator_name}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-[hsl(var(--warning))] font-medium">
                                                    Saída: {formatTime(log.paused_at)}
                                                </span>
                                                {log.resumed_at ? (
                                                    <span className="text-[hsl(var(--success))]">
                                                        Retorno: {formatTime(log.resumed_at)}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs italic">
                                                        Em andamento
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-mono font-medium">
                                            {log.resumed_at ? (
                                                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-accent text-xs">
                                                    {formatDuration(log.duration_minutes)}
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-[hsl(var(--warning))]/10 px-2 py-0.5 text-[hsl(var(--warning))] text-xs">
                                                    -
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                <Coffee className="h-3.5 w-3.5 text-muted-foreground" />
                                                {log.reason}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-muted-foreground">
                                            {log.part_code || "-"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
