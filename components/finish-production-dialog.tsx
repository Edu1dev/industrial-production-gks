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
    projectId?: number | null;
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
    projectId,
    onFinished,
}: FinishProductionDialogProps) {
    const [loading, setLoading] = useState(false);
    const [operations, setOperations] = useState<Operation[]>([]);
    const [selectedOperation, setSelectedOperation] = useState<number | null>(null);
    const [expectedTime, setExpectedTime] = useState("");

    useEffect(() => {
        if (open && !projectId) {
            // Only fetch operations for legacy (non-project) flow
            fetch("/api/operations")
                .then((res) => res.json())
                .then((data) => {
                    if (data.operations) {
                        setOperations(data.operations);
                    }
                })
                .catch(() => {
                    toast.error("Erro ao carregar operacoes");
                });
        }
    }, [open, projectId]);

    async function handleContinue() {
        if (!selectedOperation) {
            toast.error("Selecione uma operacao");
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
                toast.error(data.error || "Erro ao continuar operacao");
                return;
            }

            toast.success(
                `Operacao finalizada! Proxima operacao iniciada (pausada): ${data.new_record?.operation_name}`
            );
            onOpenChange(false);
            onFinished();
            setExpectedTime("");
            setSelectedOperation(null);
        } catch {
            toast.error("Erro de conexao");
        } finally {
            setLoading(false);
        }
    }

    async function handleFinish(completeProject: boolean) {
        setLoading(true);
        try {
            const res = await fetch(`/api/production/${recordId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "finish",
                    complete_project: completeProject,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Erro ao finalizar");
                return;
            }

            toast.success(
                completeProject
                    ? "Producao e projeto finalizados!"
                    : "Operacao finalizada!"
            );
            onOpenChange(false);
            onFinished();
        } catch {
            toast.error("Erro de conexao");
        } finally {
            setLoading(false);
        }
    }

    // Project-based finish dialog - simple confirmation
    if (projectId) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Finalizar Operacao</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja finalizar a operacao <strong>{operationName}</strong> da peca{" "}
                            <strong className="font-mono">{partCode}</strong>?
                        </DialogDescription>
                    </DialogHeader>

                    <p className="text-sm text-muted-foreground">
                        O projeto ficara disponivel para a proxima operacao.
                    </p>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => handleFinish(false)}
                            disabled={loading}
                            className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-[hsl(var(--success-foreground))]"
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                            )}
                            Sim, finalizar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    // Legacy finish dialog (non-project)
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-xl">Finalizar Producao</DialogTitle>
                    <DialogDescription>
                        Voce esta finalizando a operacao <strong>{operationName}</strong> da peca{" "}
                        <strong className="font-mono">{partCode}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="rounded-lg border border-border bg-muted/50 p-4">
                        <p className="text-sm font-medium text-foreground mb-3">
                            Esta peca vai passar por outra operacao?
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
                                <option value="">Nao, finalizar completamente</option>
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
                                        A proxima operacao iniciara em estado PAUSADO
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
                            Continuar para proxima operacao
                        </Button>
                    ) : (
                        <Button
                            onClick={() => handleFinish(false)}
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
