import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import type { CategoriaGasto, Gasto, GastoInput } from "@/hooks/useGastos";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categorias: CategoriaGasto[];
  gasto?: Gasto | null;
  onSubmit: (input: Partial<GastoInput>) => Promise<void>;
}

const FORMAS = ["PIX", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Boleto", "Transferência", "Débito Automático", "Outro"] as const;
const FREQUENCIAS = [
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semanal", label: "Semanal" },
  { value: "anual", label: "Anual" },
] as const;
const STATUS = [
  { value: "pago", label: "Pago" },
  { value: "pendente", label: "Pendente" },
  { value: "vencido", label: "Vencido" },
  { value: "cancelado", label: "Cancelado" },
] as const;

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function GastoFormDialog({ open, onOpenChange, categorias, gasto, onSubmit }: Props) {
  const [descricao, setDescricao] = useState("");
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [valor, setValor] = useState<string>("");
  const [dataGasto, setDataGasto] = useState<string>(today());
  const [formaPagamento, setFormaPagamento] = useState<string>("");
  const [recorrente, setRecorrente] = useState<boolean>(false);
  const [frequencia, setFrequencia] = useState<string>("mensal");
  const [fornecedor, setFornecedor] = useState<string>("");
  const [status, setStatus] = useState<string>("pago");
  const [dataVencimento, setDataVencimento] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (gasto) {
      setDescricao(gasto.descricao);
      setCategoriaId(gasto.categoria_id);
      setValor(String(gasto.valor));
      setDataGasto(gasto.data_gasto);
      setFormaPagamento(gasto.forma_pagamento || "");
      setRecorrente(gasto.recorrente);
      setFrequencia(gasto.frequencia || "mensal");
      setFornecedor(gasto.fornecedor || "");
      setStatus(gasto.status);
      setDataVencimento(gasto.data_vencimento || "");
      setObservacoes(gasto.observacoes || "");
    } else if (open) {
      setDescricao("");
      setCategoriaId(categorias[0]?.id || "");
      setValor("");
      setDataGasto(today());
      setFormaPagamento("");
      setRecorrente(false);
      setFrequencia("mensal");
      setFornecedor("");
      setStatus("pago");
      setDataVencimento("");
      setObservacoes("");
    }
  }, [gasto, open, categorias]);

  const handleSave = async () => {
    if (!descricao.trim()) {
      toast({ title: "Preencha a descrição", variant: "destructive" });
      return;
    }
    const valorNum = Number(String(valor).replace(",", "."));
    if (!Number.isFinite(valorNum) || valorNum < 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }
    if (!categoriaId) {
      toast({ title: "Selecione uma categoria", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        descricao: descricao.trim(),
        categoria_id: categoriaId,
        valor: valorNum,
        data_gasto: dataGasto,
        forma_pagamento: (formaPagamento || null) as any,
        recorrente,
        frequencia: recorrente ? (frequencia as any) : null,
        fornecedor: fornecedor.trim() || null,
        status: status as any,
        data_vencimento: status === "pendente" || status === "vencido" ? (dataVencimento || null) : null,
        observacoes: observacoes.trim() || null,
        comprovante_url: null,
        cliente_id: null,
        processo_id: null,
      });
      toast({ title: gasto ? "Gasto atualizado" : "Gasto registrado" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{gasto ? "Editar gasto" : "Novo gasto"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="descricao">Descrição *</Label>
            <Input id="descricao" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Assinatura Supabase Pro" />
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Categoria *</Label>
              <Select value={categoriaId} onValueChange={setCategoriaId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categorias.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: c.cor }} />
                        {c.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="valor">Valor (R$) *</Label>
              <Input id="valor" type="number" step="0.01" min="0" inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" />
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="data">Data do gasto *</Label>
              <Input id="data" type="date" value={dataGasto} onChange={e => setDataGasto(e.target.value)} />
            </div>

            <div className="grid gap-1.5">
              <Label>Forma de pagamento</Label>
              <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {FORMAS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="venc">Vencimento</Label>
              <Input id="venc" type="date" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)}
                disabled={status !== "pendente" && status !== "vencido"} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="fornecedor">Fornecedor</Label>
            <Input id="fornecedor" value={fornecedor} onChange={e => setFornecedor(e.target.value)} placeholder="Ex: Supabase, AWS, Vivo..." />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="recorrente" className="cursor-pointer">Gasto recorrente</Label>
              <p className="text-xs text-muted-foreground">Marque para custos fixos mensais/anuais</p>
            </div>
            <Switch id="recorrente" checked={recorrente} onCheckedChange={setRecorrente} />
          </div>

          {recorrente && (
            <div className="grid gap-1.5">
              <Label>Frequência</Label>
              <Select value={frequencia} onValueChange={setFrequencia}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIAS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="obs">Observações</Label>
            <Textarea id="obs" value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : gasto ? "Salvar alterações" : "Registrar gasto"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
