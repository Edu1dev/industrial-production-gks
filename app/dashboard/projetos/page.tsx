"use client";

import React from "react";
import useSWR from "swr";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  FolderKanban,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  RotateCcw,
  Undo2,
  Building2,
  CheckCircle2,
  Clock,
  Play,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Project {
  id: number;
  part_code: string;
  company_id: number;
  company_name: string;
  description: string;
  quantity: number;
  estimated_time_hours: number | null;
  charged_value_per_piece: number;
  material_cost: number;
  status: string;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  completed_at: string | null;
  real_time_minutes: number | null;
  completed_operations: number;
  operations_list: {
    id: number;
    operation_name: string;
    status: string;
    operator_name: string;
    start_time: string;
    end_time: string | null;
  }[] | null;
}

interface Company {
  id: number;
  name: string;
}

export default function ProjetosPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const queryParams = new URLSearchParams();
  if (statusFilter) queryParams.set("status", statusFilter);
  if (companyFilter) queryParams.set("company_id", companyFilter);

  const { data, mutate, isLoading } = useSWR(
    `/api/projects?${queryParams.toString()}`,
    fetcher,
  );
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [form, setForm] = useState({
    part_code: "",
    company_id: "",
    quantity: "1",
    description: "",
    estimated_time_hours: "",
    charged_value_per_piece: "",
    material_cost: "",
  });

  const projects: Project[] = data?.projects || [];

  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => {
        if (data.companies) setCompanies(data.companies);
      })
      .catch(() => { });
  }, []);

  function resetForm() {
    setForm({
      part_code: "",
      company_id: "",
      quantity: "1",
      description: "",
      estimated_time_hours: "",
      charged_value_per_piece: "",
      material_cost: "",
    });
    setEditingId(null);
  }

  function startEdit(project: Project) {
    setForm({
      part_code: project.part_code,
      company_id: String(project.company_id),
      quantity: String(project.quantity),
      description: project.description || "",
      estimated_time_hours: project.estimated_time_hours ? String(project.estimated_time_hours) : "",
      charged_value_per_piece: String(project.charged_value_per_piece || ""),
      material_cost: project.material_cost ? String(project.material_cost) : "",
    });
    setEditingId(project.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.part_code.trim() || !form.company_id || !form.quantity || !form.description.trim()) {
      toast.error("Preencha todos os campos obrigatorios");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        part_code: form.part_code.trim(),
        company_id: parseInt(form.company_id),
        quantity: parseInt(form.quantity),
        description: form.description.trim(),
        estimated_time_hours: form.estimated_time_hours ? parseFloat(form.estimated_time_hours) : null,
        charged_value_per_piece: form.charged_value_per_piece ? parseFloat(form.charged_value_per_piece) : 0,
        material_cost: form.material_cost ? parseFloat(form.material_cost) : 0,
      };

      let res;
      if (editingId) {
        res = await fetch(`/api/projects/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao salvar");
        return;
      }

      toast.success(editingId ? "Projeto atualizado!" : `Projeto "${form.part_code}" criado!`);
      resetForm();
      setShowForm(false);
      mutate();
    } catch {
      toast.error("Erro de conexao");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Tem certeza que deseja excluir este projeto?")) return;

    setActionLoading(id);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao excluir");
        return;
      }
      toast.success("Projeto excluido");
      mutate();
    } catch {
      toast.error("Erro de conexao");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReopen(id: number) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reopen" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao reabrir");
        return;
      }
      toast.success("Projeto reaberto");
      mutate();
    } catch {
      toast.error("Erro de conexao");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRevert(id: number) {
    if (!confirm("Reverter a ultima operacao finalizada deste projeto?")) return;

    setActionLoading(id);
    try {
      const res = await fetch(`/api/projects/${id}/revert`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao reverter");
        return;
      }
      toast.success("Operacao revertida com sucesso");
      mutate();
    } catch {
      toast.error("Erro de conexao");
    } finally {
      setActionLoading(null);
    }
  }

  const statusColors: Record<string, string> = {
    PENDENTE: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
    EM_PRODUCAO: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
    FINALIZADO: "bg-muted text-muted-foreground",
  };

  const statusLabels: Record<string, string> = {
    PENDENTE: "Pendente",
    EM_PRODUCAO: "Em Producao",
    FINALIZADO: "Finalizado",
  };

  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [projectSearch, setProjectSearch] = useState("");

  // Group projects by company and calculate stats
  const companyStats = React.useMemo(() => {
    const stats: Record<number, { total: number; active: number; finalized: number }> = {};

    // Initialize with all available companies to ensure they appear even with 0 projects
    companies.forEach(c => {
      stats[c.id] = { total: 0, active: 0, finalized: 0 };
    });

    projects.forEach((p) => {
      if (!stats[p.company_id]) {
        stats[p.company_id] = { total: 0, active: 0, finalized: 0 };
      }
      stats[p.company_id].total++;
      if (p.status === "FINALIZADO") {
        stats[p.company_id].finalized++;
      } else {
        stats[p.company_id].active++;
      }
    });
    return stats;
  }, [projects, companies]);

  // Filter projects for the selected company
  const filteredProjects = selectedCompanyId
    ? projects.filter(
      (p) =>
        p.company_id === selectedCompanyId &&
        (statusFilter ? p.status === statusFilter : true) &&
        (projectSearch ? p.part_code.toLowerCase().includes(projectSearch.toLowerCase()) : true)
    )
    : [];

  const selectedCompanyName = companies.find((c) => c.id === selectedCompanyId)?.name;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Page Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <FolderKanban className="h-6 w-6 text-accent" />
            {selectedCompanyId ? `Projetos - ${selectedCompanyName}` : "Projetos por Empresa"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {selectedCompanyId
              ? "Gerencie os projetos desta empresa"
              : "Selecione uma empresa para ver seus projetos"}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedCompanyId && (
            <button
              onClick={() => {
                setSelectedCompanyId(null);
                setProjectSearch("");
              }}
              className="flex h-12 items-center gap-2 rounded-xl bg-muted px-5 font-bold text-muted-foreground transition-all hover:bg-muted/80"
            >
              <Undo2 className="h-5 w-5" />
              Voltar
            </button>
          )}
          <button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className="flex h-12 items-center gap-2 rounded-xl bg-accent px-5 font-bold text-accent-foreground transition-all hover:opacity-90"
          >
            <Plus className="h-5 w-5" />
            Novo Projeto
          </button>
        </div>
      </div>

      {/* Company Grid View */}
      {!selectedCompanyId && !isLoading && !showForm && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => {
            const stat = companyStats[company.id] || { total: 0, active: 0, finalized: 0 };
            return (
              <button
                key={company.id}
                onClick={() => setSelectedCompanyId(company.id)}
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 text-left shadow-sm transition-all hover:border-accent hover:shadow-md"
              >
                <div className="mb-4">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                    <Building2 className="h-6 w-6 text-accent group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="text-xl font-bold text-card-foreground group-hover:text-accent">
                    {company.name}
                  </h3>
                </div>

                <div className="flex w-full items-center justify-between border-t border-border pt-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-muted-foreground">Total</span>
                    <span className="text-lg font-bold text-foreground">{stat.total}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-medium text-[hsl(var(--success))]">Ativos</span>
                    <span className="text-lg font-bold text-[hsl(var(--success))]">{stat.active}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-medium text-muted-foreground">Finalizados</span>
                    <span className="text-lg font-bold text-muted-foreground">{stat.finalized}</span>
                  </div>
                </div>

                {stat.active > 0 && (
                  <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-[hsl(var(--success))]/10 px-2 py-1">
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[hsl(var(--success))]" />
                    <span className="text-[10px] font-bold text-[hsl(var(--success))]">EM PRODUCAO</span>
                  </div>
                )}
              </button>
            );
          })}
          {companies.length === 0 && (
            <div className="col-span-full rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
              <p className="text-muted-foreground">Nenhuma empresa cadastrada</p>
            </div>
          )}
        </div>
      )}

      {/* Project List View (Only visible when a company is selected) */}
      {selectedCompanyId && !isLoading && !showForm && (
        <>
          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Pesquisar por codigo..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                className="h-12 w-full rounded-xl border border-input bg-background pl-11 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-12 rounded-xl border border-input bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Todos os status</option>
              <option value="PENDENTE">Pendente</option>
              <option value="EM_PRODUCAO">Em Producao</option>
              <option value="FINALIZADO">Finalizado</option>
            </select>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
              <FolderKanban className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
              <h3 className="mb-1 text-lg font-semibold text-card-foreground">
                Nenhum projeto encontrado para esta empresa e filtros
              </h3>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredProjects.map((project) => {
                const ops = project.operations_list || [];
                const finishedOps = ops.filter((o) => o.status === "FINALIZADO");
                const activeOps = ops.filter((o) => o.status !== "FINALIZADO");
                const isExpanded = expandedId === project.id;

                return (
                  <div
                    key={project.id}
                    className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xl font-bold text-card-foreground">
                            {project.part_code}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[project.status]}`}
                          >
                            {statusLabels[project.status]}
                          </span>
                        </div>
                        {project.description && (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {project.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {/* Company name removed as it's redundant in this view */}
                          <span>Qtd: {project.quantity}</span>
                          {project.estimated_time_hours && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {project.estimated_time_hours}h/peca
                            </span>
                          )}
                          <span>R$ {Number(project.charged_value_per_piece).toFixed(2)}/peca</span>
                          {project.material_cost > 0 && (
                            <span>Mat: R$ {Number(project.material_cost).toFixed(2)}</span>
                          )}
                          {project.real_time_minutes !== null && project.real_time_minutes !== undefined && (
                            <span className="flex items-center gap-1 font-semibold text-[hsl(var(--success))]">
                              <Clock className="h-3.5 w-3.5" />
                              Tempo Real: {Math.floor(Number(project.real_time_minutes) / 60)}h {Math.round(Number(project.real_time_minutes) % 60)}min
                            </span>
                          )}
                          <span className="text-xs">
                            Criado em {new Date(project.created_at).toLocaleDateString("pt-BR")}
                            {project.created_by_name && ` por ${project.created_by_name}`}
                          </span>
                          {project.completed_at && (
                            <span className="text-xs text-[hsl(var(--success))]">
                              Finalizado em {new Date(project.completed_at).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Operations Summary */}
                    {ops.length > 0 && (
                      <div className="mt-3">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : project.id)}
                          className="flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          {finishedOps.length} operacao(oes) finalizada(s)
                          {activeOps.length > 0 && `, ${activeOps.length} ativa(s)`}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 space-y-1.5">
                            {ops.map((op, index) => {
                              const isDuplicate = ops.slice(0, index).some(
                                (prev) => prev.operation_name === op.operation_name && prev.status === "FINALIZADO"
                              ) && op.status === "FINALIZADO";
                              return (
                                <div
                                  key={op.id}
                                  className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm"
                                >
                                  {op.status === "FINALIZADO" ? (
                                    <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                                  ) : (
                                    <Play className="h-4 w-4 text-[hsl(var(--warning))]" />
                                  )}
                                  <span className="font-medium text-foreground">
                                    {op.operation_name}{isDuplicate ? " (Reajuste)" : ""}
                                  </span>
                                  <span className="text-muted-foreground">- {op.operator_name}</span>
                                  {op.status !== "FINALIZADO" && (
                                    <span className="rounded-full bg-[hsl(var(--warning))]/10 px-2 py-0.5 text-xs font-semibold text-[hsl(var(--warning))]">
                                      {op.status === "EM_PRODUCAO" ? "Em Producao" : "Pausado"}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {project.status === "PENDENTE" && (
                        <>
                          <button
                            onClick={() => startEdit(project)}
                            disabled={actionLoading === project.id}
                            className="flex h-10 items-center gap-1.5 rounded-lg bg-accent/10 px-4 text-sm font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(project.id)}
                            disabled={actionLoading === project.id}
                            className="flex h-10 items-center gap-1.5 rounded-lg bg-destructive/10 px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                          >
                            {actionLoading === project.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Excluir
                          </button>
                        </>
                      )}

                      {project.status === "FINALIZADO" && (
                        <button
                          onClick={() => handleReopen(project.id)}
                          disabled={actionLoading === project.id}
                          className="flex h-10 items-center gap-1.5 rounded-lg bg-accent/10 px-4 text-sm font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
                        >
                          {actionLoading === project.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                          Reabrir
                        </button>
                      )}

                      {finishedOps.length > 0 && (
                        <button
                          onClick={() => handleRevert(project.id)}
                          disabled={actionLoading === project.id}
                          className="flex h-10 items-center gap-1.5 rounded-lg bg-[hsl(var(--warning))]/10 px-4 text-sm font-medium text-[hsl(var(--warning))] transition-colors hover:bg-[hsl(var(--warning))]/20 disabled:opacity-50"
                        >
                          {actionLoading === project.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Undo2 className="h-4 w-4" />
                          )}
                          Reverter Ultima Operacao
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-bold text-card-foreground">
            {editingId ? "Editar Projeto" : "Novo Projeto"}
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="proj_part_code" className="mb-1.5 block text-sm font-medium text-card-foreground">
                Codigo da Peca *
              </label>
              <input
                id="proj_part_code"
                type="text"
                required
                value={form.part_code}
                onChange={(e) => setForm({ ...form, part_code: e.target.value.toUpperCase() })}
                placeholder="Ex: PCA-001"
                className="h-16 w-full rounded-xl border border-input bg-background px-4 font-mono text-2xl font-bold text-foreground uppercase placeholder:text-muted-foreground placeholder:font-normal placeholder:text-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label htmlFor="proj_company" className="mb-1.5 block text-sm font-medium text-card-foreground">
                Empresa *
              </label>
              <select
                id="proj_company"
                required
                value={form.company_id}
                onChange={(e) => setForm({ ...form, company_id: e.target.value })}
                className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Selecione...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="proj_quantity" className="mb-1.5 block text-sm font-medium text-card-foreground">
                Quantidade *
              </label>
              <input
                id="proj_quantity"
                type="number"
                required
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="proj_description" className="mb-1.5 block text-sm font-medium text-card-foreground">
                Descricao *
              </label>
              <textarea
                id="proj_description"
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descreva o projeto..."
                rows={3}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label htmlFor="proj_estimated_time" className="mb-1.5 block text-sm font-medium text-card-foreground">
                Tempo Previsto por Peca (horas)
              </label>
              <input
                id="proj_estimated_time"
                type="number"
                min="0"
                step="0.01"
                value={form.estimated_time_hours}
                onChange={(e) => setForm({ ...form, estimated_time_hours: e.target.value })}
                placeholder="Opcional"
                className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label htmlFor="proj_charged_value" className="mb-1.5 block text-sm font-medium text-card-foreground">
                Valor Cobrado por Peca (R$) *
              </label>
              <input
                id="proj_charged_value"
                type="number"
                min="0"
                step="0.01"
                value={form.charged_value_per_piece}
                onChange={(e) => setForm({ ...form, charged_value_per_piece: e.target.value })}
                placeholder="0.00"
                className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label htmlFor="proj_material_cost" className="mb-1.5 block text-sm font-medium text-card-foreground">
                Custo Materia-Prima (R$)
              </label>
              <input
                id="proj_material_cost"
                type="number"
                min="0"
                step="0.01"
                value={form.material_cost}
                onChange={(e) => setForm({ ...form, material_cost: e.target.value })}
                placeholder="0.00"
                className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex h-12 items-center gap-2 rounded-xl bg-[hsl(var(--success))] px-6 font-bold text-[hsl(var(--success-foreground))] transition-all hover:opacity-90 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
              {editingId ? "Salvar" : "Criar Projeto"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="flex h-12 items-center rounded-xl bg-muted px-6 font-medium text-muted-foreground transition-colors hover:bg-muted/80"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
