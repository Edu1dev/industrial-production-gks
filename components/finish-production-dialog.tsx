"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";

interface FinishProductionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    recordId: number;
    partCode: string;
    operationName: string;
    onFinished: () => void;
}

interface Operation {
    id: number;
    name: string;
    machine_cost_per_hour: number;
}

export function FinishProductionDialog({
    open,
    onOpenChange,
    recordId,
    partCode,
    operationName,
    onFinished,
}: FinishProductionDialogProps) {
    const [loading, setLoading] = useState(false);
    const [operations, setOperations] = useState<Operation[]>([]);
    const [selectedOperation, setSelectedOperation] = useState<number | null>(null);
    const [expectedTime, setExpectedTime] = useState("");

    useEffect(() => {
        if (open) {
            // Fetch available operations
            fetch("/api/operations")
                .then((res) => res.json())
                .then((data) => {
                    if (data.operations) {
                        setOperations(data.operations);
                    }
                })
                .catch(() => {
                    toast.error("Erro ao carregar operações");
                });
        }
    }, [open]);

    async function handleContinue() {
        if (!selectedOperation) {
            toast.error("Selecione uma operação");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/production/${recordId}/continue`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    next_operation_id: selectedOperation,
                    expected_time_minutes: expectedTime ? Number(expectedTime) : null
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Erro ao continuar operação");
                return;
            }

            toast.success(
                `Operação finalizada! Próxima operação iniciada (pausada): ${data.new_record?.operation_name}`
            );
            onOpenChange(false);
            onFinished();
            setExpectedTime("");
            setSelectedOperation(null);
        } catch {
            toast.error("Erro de conexão");
        } finally {
            setLoading(false);
        }
    }

    async function handleFinishOnly() {
        setLoading(true);
        try {
            const res = await fetch(`/api/production/${recordId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "finish" }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Erro ao finalizar");
                return;
            }

            toast.success("Produção finalizada completamente!");
            onOpenChange(false);
            onFinished();
        } catch {
            toast.error("Erro de conexão");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-xl">Finalizar Produção</DialogTitle>
                    <DialogDescription>
                        Você está finalizando a operação <strong>{operationName}</strong> da peça{" "}
                        <strong className="font-mono">{partCode}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="rounded-lg border border-border bg-muted/50 p-4">
                        <p className="text-sm font-medium text-foreground mb-3">
                            Esta peça vai passar por outra operação?
                        </p>

                        <div className="space-y-3">
                            <select
                                value={selectedOperation || ""}
                                onChange={(e) =>
                                    setSelectedOperation(e.target.value ? parseInt(e.target.value) : null)
                                }
                                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                                disabled={loading}
                            >
                                <option value="">Não, finalizar completamente</option>
                                {operations.map((op) => (
                                    <option key={op.id} value={op.id}>
                                        {op.name} (R$ {Number(op.machine_cost_per_hour).toFixed(2)}/h)
                                    </option>
                                ))}
                            </select>

                            {selectedOperation && (
                                <div>
                                    <label htmlFor="expectedTime" className="text-xs font-medium text-muted-foreground mb-1 block">
                                        Tempo Esperado Total (minutos) - Opcional
                                    </label>
                                    <input
                                        id="expectedTime"
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={expectedTime}
                                        onChange={(e) => setExpectedTime(e.target.value)}
                                        placeholder="Ex: 45.5"
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                                    />
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        A próxima operação iniciará em estado PAUSADO
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    {selectedOperation ? (
                        <Button
                            onClick={handleContinue}
                            disabled={loading}
                            className="w-full sm:w-auto bg-primary hover:bg-primary/90"
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <ArrowRight className="mr-2 h-4 w-4" />
                            )}
                            Continuar para próxima operação
                        </Button>
                    ) : (
                        <Button
                            onClick={handleFinishOnly}
                            disabled={loading}
                            className="w-full sm:w-auto bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-[hsl(var(--success-foreground))]"
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                            )}
                            Finalizar completamente
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
