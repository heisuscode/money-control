import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { IconeChave, IconeItem } from '@/components/IconeItem'
import { chaveIcone, ICONES_CATEGORIA, NOME_ICONE, type ChaveIcone } from '@/lib/icones'
import { Topbar } from '@/components/Topbar'
import { PageBody } from '@/components/PageBody'
import { Button, Card, Field, Input, Select } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatNumber, maskMoneyInput, parseMoney } from '@/lib/format'
import { inMonth } from '@/lib/finance'
import type { Categoria, TipoCategoria } from '@/lib/types'
import { cn } from '@/lib/cn'

const CORES = ['#16A34A', '#E5484D', '#004AAD', '#06B6D4', '#2F6BD4', '#A855F7', '#F59E0B', '#8A95A6']

export default function Categorias() {
  const { categorias, despesas, receitas, loading, reload } = useData()
  const toast = useToast()
  const [tipo, setTipo] = useState<TipoCategoria>('despesa')
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Categoria | null>(null)
  const [excluir, setExcluir] = useState<Categoria | null>(null)

  const now = new Date()
  const gastoPorCat = useMemo(() => {
    const map = new Map<string, number>()
    const movs = tipo === 'despesa' ? despesas : receitas
    for (const m of movs) {
      if (!m.categoria_id || !inMonth(m.data, now.getFullYear(), now.getMonth())) continue
      map.set(m.categoria_id, (map.get(m.categoria_id) ?? 0) + Number(m.valor))
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [despesas, receitas, tipo])

  const doTipo = categorias.filter((c) => c.tipo === tipo)
  const padrao = doTipo.filter((c) => c.is_padrao)
  const custom = doTipo.filter((c) => !c.is_padrao)

  async function confirmarExcluir() {
    if (!excluir) return
    const { error } = await supabase.from('categorias').delete().eq('id', excluir.id)
    if (error) return toast('error', 'Não foi possível excluir.')
    toast('success', 'Categoria excluída.')
    setExcluir(null)
    reload(['categorias'])
  }

  function card(c: Categoria) {
    const gasto = gastoPorCat.get(c.id) ?? 0
    const temLimite = c.orcamento > 0
    const pct = temLimite ? Math.min(100, (gasto / c.orcamento) * 100) : 0
    const estourou = temLimite && gasto > c.orcamento
    return (
      <Card key={c.id} className="group">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <IconeItem icone={c.icone} nome={c.nome} cor={c.cor} />
            <div>
              <div className="flex items-center gap-2 text-[14px] font-bold text-text-1">
                {c.nome}
                {!c.is_padrao && (
                  <span className="rounded bg-violet/15 px-1.5 py-0.5 text-[9px] font-extrabold text-violet">
                    CUSTOM
                  </span>
                )}
              </div>
            </div>
          </div>
          {!c.is_padrao && (
            <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
              <button onClick={() => { setEditando(c); setModal(true) }} className="text-text-3 hover:text-text-1">
                <Pencil size={14} />
              </button>
              <button onClick={() => setExcluir(c)} className="text-danger">
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-text-3">
            <span>{temLimite ? 'Orçamento' : 'Sem limite'}</span>
            <span className="num">
              {formatCurrency(gasto)}{temLimite && ` / ${formatCurrency(c.orcamento)}`}
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-subtle">
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${temLimite ? pct : 0}%`, background: estourou ? '#E5484D' : c.cor }}
            />
          </div>
        </div>
      </Card>
    )
  }

  return (
    <>
      <Topbar
        title="Categorias"
        subtitle="Categorias padrão + personalizadas · orçamento por categoria"
        actions={
          <button className="btn-primary" onClick={() => { setEditando(null); setModal(true) }}>
            <Plus size={16} /> Nova categoria
          </button>
        }
      />
      <PageBody>
        <SegmentedTabs
          value={tipo}
          onChange={(v) => setTipo(v as TipoCategoria)}
          tabs={[
            { value: 'despesa', label: 'Despesas' },
            { value: 'receita', label: 'Receitas' },
          ]}
        />

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Card key={i}><div className="h-20 animate-pulse" /></Card>)}
          </div>
        ) : (
          <>
            <div>
              <p className="mb-3 text-[13px] font-bold text-text-2">
                Categorias padrão <span className="text-text-3">{padrao.length}</span>
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{padrao.map(card)}</div>
            </div>

            <div>
              <p className="mb-3 text-[13px] font-bold text-text-2">
                Personalizadas <span className="text-text-3">{custom.length}</span>
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {custom.map(card)}
                <button
                  onClick={() => { setEditando(null); setModal(true) }}
                  className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-line text-text-3 transition hover:border-brand hover:text-brand"
                >
                  <Plus size={22} />
                  <span className="text-[13px] font-semibold">Criar categoria</span>
                </button>
              </div>
            </div>
          </>
        )}
      </PageBody>

      <CategoriaModal
        open={modal}
        onOpenChange={setModal}
        editar={editando}
        tipoInicial={tipo}
        onSaved={() => reload(['categorias'])}
      />
      <ConfirmDialog
        open={!!excluir}
        onOpenChange={(v) => !v && setExcluir(null)}
        message={`Excluir a categoria "${excluir?.nome}"?`}
        onConfirm={confirmarExcluir}
      />
    </>
  )
}

function CategoriaModal({
  open,
  onOpenChange,
  editar,
  tipoInicial,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editar: Categoria | null
  tipoInicial: TipoCategoria
  onSaved: () => void
}) {
  const { user } = useAuth()
  const toast = useToast()
  const [nome, setNome] = useState('')
  const [icone, setIcone] = useState<ChaveIcone>('etiqueta')
  const [cor, setCor] = useState('#004AAD')
  const [tipo, setTipo] = useState<TipoCategoria>(tipoInicial)
  const [orcamento, setOrcamento] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setNome(editar?.nome ?? '')
      setIcone(editar ? chaveIcone(editar.icone, editar.nome) : 'etiqueta')
      setCor(editar?.cor ?? '#004AAD')
      setTipo(editar?.tipo ?? tipoInicial)
      setOrcamento(editar && editar.orcamento > 0 ? formatNumber(editar.orcamento) : '')
      setErro(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function salvar() {
    setErro(null)
    if (!nome.trim()) return setErro('Informe o nome da categoria.')
    if (!user) return
    setLoading(true)
    try {
      const payload = {
        nome: nome.trim(),
        icone,
        cor,
        tipo,
        orcamento: parseMoney(orcamento),
      }
      if (editar) {
        const { error } = await supabase.from('categorias').update(payload).eq('id', editar.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('categorias')
          .insert({ ...payload, usuario_id: user.id, is_padrao: false })
        if (error) throw error
      }
      toast('success', editar ? 'Categoria atualizada.' : 'Categoria criada.')
      onSaved()
      onOpenChange(false)
    } catch {
      setErro('Erro ao salvar a categoria.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={editar ? 'Editar categoria' : 'Nova categoria'} maxWidth={440}>
      <div className="flex flex-col gap-4">
        <Field label="Nome">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Pet" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCategoria)}>
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
            </Select>
          </Field>
          <Field label="Orçamento (opcional)">
            <Input value={orcamento} onChange={(e) => setOrcamento(maskMoneyInput(e.target.value))} placeholder="0,00" inputMode="decimal" className="num" />
          </Field>
        </div>

        <Field label="Ícone">
          <div className="flex flex-wrap gap-2">
            {ICONES_CATEGORIA.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcone(i)}
                aria-label={NOME_ICONE[i]}
                aria-pressed={icone === i}
                title={NOME_ICONE[i]}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg border',
                  icone === i ? 'border-brand bg-active-bg text-brand' : 'border-line text-text-2 hover:bg-subtle',
                )}
              >
                <IconeChave chave={i} size={17} />
              </button>
            ))}
          </div>
        </Field>

        <Field label="Cor">
          <div className="flex flex-wrap gap-2">
            {CORES.map((c) => (
              <button
                key={c}
                onClick={() => setCor(c)}
                className={cn('h-8 w-8 rounded-full border-2', cor === c ? 'border-text-1' : 'border-transparent')}
                style={{ background: c }}
              />
            ))}
          </div>
        </Field>

        {erro && <p className="text-[12px] font-medium text-danger">{erro}</p>}
        <div className="mt-2 flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="flex-1" loading={loading} onClick={salvar}>Salvar</Button>
        </div>
      </div>
    </Modal>
  )
}
