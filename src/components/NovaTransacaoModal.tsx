import { useEffect, useMemo, useState } from 'react'
import { Search, Zap, Calendar as CalendarIcon } from 'lucide-react'
import { Modal } from './ui/Modal'
import { Button, Field, Input, Select } from './ui'
import { CurrencyChip } from './CurrencyChip'
import { CURRENCIES, getCurrency } from '@/lib/currencies'
import { convert } from '@/lib/exchange'
import { formatCurrency, formatDate, formatNumber, maskMoneyInput, parseMoney, todayISO } from '@/lib/format'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useToast } from './ui/Toast'
import type { FrequenciaRecorrencia, Movimentacao, TipoCategoria } from '@/lib/types'
import { cn } from '@/lib/cn'
import { useFinanceiro } from '@/financeiro/FinanceiroContext'
import { dividirEmParcelas } from '@/financeiro/logic'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  tipoInicial: TipoCategoria
  editar?: Movimentacao
}

export function NovaTransacaoModal({ open, onOpenChange, tipoInicial, editar }: Props) {
  const { rates, categorias, reload } = useData()
  const { user } = useAuth()
  const toast = useToast()
  const { carteiras, salvarRecorrencia, removerRecorrencia } = useFinanceiro()

  const [tipo, setTipo] = useState<TipoCategoria>(tipoInicial)
  const [valorStr, setValorStr] = useState('')
  const [moeda, setMoeda] = useState('BRL')
  const [descricao, setDescricao] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [carteiraId, setCarteiraId] = useState('')
  const [data, setData] = useState(todayISO())
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [recorrente, setRecorrente] = useState(false)
  const [frequenciaRec, setFrequenciaRec] = useState<FrequenciaRecorrencia>('mensal')
  const [parcelas, setParcelas] = useState(1)

  // Reinicia / carrega valores ao abrir
  useEffect(() => {
    if (!open) return
    if (editar) {
      setTipo(editar.tipo ?? tipoInicial)
      setValorStr(formatNumber(editar.valor_original))
      setMoeda(editar.moeda_original)
      setDescricao(editar.descricao)
      setCategoriaId(editar.categoria_id ?? '')
      setData(editar.data)
      setCarteiraId(editar.carteira_id ?? '')
    } else {
      setTipo(tipoInicial)
      setValorStr('')
      setMoeda('BRL')
      setDescricao('')
      setCategoriaId('')
      setCarteiraId('')
      setData(todayISO())
    }
    setRecorrente(false)
    setFrequenciaRec('mensal')
    setParcelas(1)
    setErro(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editar, tipoInicial])

  const cats = useMemo(() => categorias.filter((c) => c.tipo === tipo), [categorias, tipo])
  const carteiraSelecionada = carteiras.find((c) => c.id === carteiraId)
  const isCartaoCredito = carteiraSelecionada?.tipo === 'cartao_credito'
  const carteirasDisponiveis = tipo === 'receita' ? carteiras.filter((c) => c.tipo !== 'cartao_credito') : carteiras

  useEffect(() => {
    if (tipo === 'receita' && isCartaoCredito) setCarteiraId('')
  }, [tipo, isCartaoCredito])

  // Despesa recorrente num cartão de crédito não tem "próximo vencimento"
  // próprio — ela entra na fatura e o vencimento é o do cartão.
  useEffect(() => {
    if (isCartaoCredito) setFrequenciaRec('mensal')
  }, [isCartaoCredito])

  // Parcelamento só existe para despesa nova no cartão de crédito.
  const podeParcelar = isCartaoCredito && tipo === 'despesa' && !editar
  const parcelado = podeParcelar && parcelas > 1
  useEffect(() => {
    if (!podeParcelar) setParcelas(1)
  }, [podeParcelar])
  useEffect(() => {
    if (parcelado) setRecorrente(false)
  }, [parcelado])

  const valorNum = parseMoney(valorStr)
  // taxa registrada = BRL por 1 unidade da moeda escolhida (RN07)
  const taxa = rates[moeda]?.brlPerUnit ?? 1
  const convertido = moeda === 'BRL' ? valorNum : convert(valorNum, moeda, 'BRL', rates)
  const divisao = dividirEmParcelas(Number(convertido.toFixed(2)), Math.max(parcelas, 1))

  const filtradas = CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(busca.toLowerCase()) ||
      c.name.toLowerCase().includes(busca.toLowerCase()),
  )

  async function salvar() {
    setErro(null)
    if (valorNum <= 0) return setErro('O valor deve ser maior que zero.')
    if (!descricao.trim()) return setErro('Informe uma descrição.')
    if (!user) return setErro('Sessão expirada. Faça login novamente.')

    setLoading(true)
    try {
      const tabela = tipo === 'receita' ? 'receitas' : 'despesas'
      const valorBRL = Number(convertido.toFixed(2))
      const registro = {
        usuario_id: user.id,
        descricao: descricao.trim(),
        valor: valorBRL,
        valor_convertido: valorBRL,
        valor_original: Number(valorNum.toFixed(2)),
        moeda_original: moeda,
        taxa: Number(taxa.toFixed(6)),
        taxa_timestamp: rates[moeda]?.timestamp ?? new Date().toISOString(),
        data,
        categoria_id: categoriaId || null,
        carteira_id: carteiraId || null,
      }
      if (editar) {
        const { error } = await supabase.from(tabela).update(registro).eq('id', editar.id)
        if (error) throw error
        toast('success', 'Transação atualizada.')
      } else if (parcelado) {
        // Compra parcelada = recorrência mensal com fim. A 1ª parcela é lançada agora
        // (na fatura desta data); as demais entram sozinhas, uma por mês.
        const d = new Date(`${data}T00:00:00`)
        const rec = await salvarRecorrencia({
          ativo: true,
          tipo,
          descricao: descricao.trim(),
          valor: divisao.valor,
          categoria_id: categoriaId || null,
          carteira_id: carteiraId || null,
          frequencia: 'mensal',
          dia: d.getDate(),
          data_inicio: data,
          ultima_execucao: data,
          parcelas_total: parcelas,
          valor_total: valorBRL,
        })
        const { error } = await supabase.from(tabela).insert({
          ...registro,
          descricao: `${descricao.trim()} (1/${parcelas})`,
          valor: divisao.valor,
          valor_convertido: divisao.valor,
          valor_original: Number((valorNum / parcelas).toFixed(2)),
          recorrencia_id: rec.id,
        })
        if (error) {
          await removerRecorrencia(rec.id).catch(() => {})
          throw error
        }
        toast('success', `Compra parcelada em ${parcelas}x registrada.`)
      } else if (recorrente) {
        // A recorrência nasce já "executada" nesta data: este lançamento é a 1ª
        // ocorrência (vinculada a ela) e as próximas são geradas automaticamente.
        const d = new Date(`${data}T00:00:00`)
        const rec = await salvarRecorrencia({
          ativo: true,
          tipo,
          descricao: descricao.trim(),
          valor: valorBRL,
          categoria_id: categoriaId || null,
          carteira_id: carteiraId || null,
          frequencia: frequenciaRec,
          dia: frequenciaRec === 'semanal' ? d.getDay() : d.getDate(),
          data_inicio: data,
          ultima_execucao: data,
          parcelas_total: null,
          valor_total: null,
        })
        const { error } = await supabase.from(tabela).insert({ ...registro, recorrencia_id: rec.id })
        if (error) {
          await removerRecorrencia(rec.id).catch(() => {})
          throw error
        }
        toast('success', tipo === 'receita' ? 'Receita recorrente criada.' : 'Despesa recorrente criada.')
      } else {
        const { error } = await supabase.from(tabela).insert(registro)
        if (error) throw error
        toast('success', tipo === 'receita' ? 'Receita registrada.' : 'Despesa registrada.')
      }
      await reload([tabela])
      onOpenChange(false)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setLoading(false)
    }
  }

  const moedaInfo = getCurrency(moeda)

  const sidePanel = (
    <div className="flex h-full flex-col">
      <p className="mb-3 text-[13px] font-bold text-text-1">Selecionar moeda</p>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar moeda..."
          className="pl-9"
        />
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto pr-1">
        {filtradas.map((c) => {
          const r = rates[c.code]?.brlPerUnit ?? 1
          const ativo = c.code === moeda
          return (
            <button
              key={c.code}
              onClick={() => setMoeda(c.code)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition',
                ativo ? 'bg-active-bg' : 'hover:bg-subtle',
              )}
            >
              <CurrencyChip code={c.code} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold text-text-1">{c.code}</div>
                <div className="truncate text-[11px] text-text-3">{c.name}</div>
              </div>
              <span className="num text-[12px] font-semibold text-text-2">
                {c.code === 'BRL' ? '1,00' : formatNumber(r)}
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-center text-[11px] text-text-3">
        {CURRENCIES.length} moedas no total
      </p>
    </div>
  )

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={editar ? 'Editar transação' : 'Nova transação'}
      side={sidePanel}
      maxWidth={460}
    >
      {/* Toggle tipo */}
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-subtle p-1">
        <button
          onClick={() => setTipo('despesa')}
          className={cn(
            'rounded-lg py-2 text-[13px] font-bold transition',
            tipo === 'despesa' ? 'bg-danger text-white' : 'text-text-2',
          )}
        >
          − Despesa
        </button>
        <button
          onClick={() => setTipo('receita')}
          className={cn(
            'rounded-lg py-2 text-[13px] font-bold transition',
            tipo === 'receita' ? 'bg-success text-white' : 'text-text-2',
          )}
        >
          + Receita
        </button>
      </div>

      {/* Valor + moeda */}
      <Field label="Valor">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="num absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-text-3">
              {moedaInfo.symbol}
            </span>
            <Input
              value={valorStr}
              onChange={(e) => setValorStr(maskMoneyInput(e.target.value))}
              placeholder="0,00"
              inputMode="decimal"
              className="num pl-12 text-[16px] font-semibold"
            />
          </div>
          <Select value={moeda} onChange={(e) => setMoeda(e.target.value)} className="w-28 flex-none">
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </Select>
        </div>
      </Field>

      {/* Preview de conversão (RF16/RF17) */}
      {moeda !== 'BRL' && valorNum > 0 && (
        <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-active-bg px-3 py-2.5 text-[13px] text-brand-700 dark:text-active-text">
          <Zap className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            Convertido para <b className="num">{formatCurrency(convertido)}</b> · taxa{' '}
            <b className="num">{formatNumber(taxa, 4)}</b> registrada.
          </span>
          <span className="rounded-md bg-success/15 px-1.5 py-0.5 text-[10px] font-bold text-success">
            ao vivo
          </span>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-4">
        <Field label="Descrição">
          <Input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: Tênis de corrida"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">
            <Select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
              <option value="">Sem categoria</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icone} {c.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Data">
            <div className="relative">
              <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
              <Input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="pl-9"
              />
            </div>
          </Field>
        </div>

        <Field
          label={tipo === 'receita' ? 'Recebido em (opcional)' : 'Pago com (opcional)'}
          hint={isCartaoCredito ? 'Entra na fatura do cartão e desconta do limite.' : undefined}
        >
          <Select value={carteiraId} onChange={(e) => setCarteiraId(e.target.value)}>
            <option value="">Sem carteira</option>
            {carteirasDisponiveis.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icone} {c.nome}
              </option>
            ))}
          </Select>
        </Field>

        {podeParcelar && (
          <div className="rounded-xl border border-line p-3">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-subtle p-1">
              {(['vista', 'parcelado'] as const).map((forma) => {
                const ativo = forma === 'parcelado' ? parcelado : !parcelado
                return (
                  <button
                    key={forma}
                    type="button"
                    onClick={() => setParcelas(forma === 'parcelado' ? Math.max(parcelas, 2) : 1)}
                    className={cn(
                      'rounded-md py-1.5 text-[13px] font-semibold transition',
                      ativo ? 'bg-surface text-brand shadow-sm' : 'text-text-2',
                    )}
                  >
                    {forma === 'vista' ? 'À vista' : 'Parcelado'}
                  </button>
                )
              })}
            </div>
            {parcelado && (
              <div className="mt-3 flex flex-col gap-2">
                <Field label="Número de parcelas">
                  <Select value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>
                    {Array.from({ length: 23 }, (_, i) => i + 2).map((n) => {
                      const d = dividirEmParcelas(Number(convertido.toFixed(2)), n)
                      return (
                        <option key={n} value={n}>
                          {n}x de {formatCurrency(d.valor)}
                        </option>
                      )
                    })}
                  </Select>
                </Field>
                {valorNum > 0 && (
                  <p className="text-[12px] text-text-3">
                    Total {formatCurrency(convertido)} em {parcelas}x de <b className="num">{formatCurrency(divisao.valor)}</b>
                    {divisao.ultima !== divisao.valor && <> (última de {formatCurrency(divisao.ultima)})</>}. A 1ª cai na
                    fatura desta compra e as demais entram sozinhas, uma por mês. O limite já desconta o total.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {!editar && !parcelado && (
          <div className="rounded-xl border border-line p-3">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={recorrente}
                onChange={(e) => setRecorrente(e.target.checked)}
                className="h-4 w-4 accent-brand"
              />
              <span className="flex-1 text-[13px] font-semibold text-text-1">
                Repetir esta {tipo === 'receita' ? 'receita' : 'despesa'} automaticamente
              </span>
            </label>
            {recorrente && (
              <div className="mt-3">
                {isCartaoCredito ? (
                  <p className="text-[12px] text-text-3">
                    Repete todo mês, cobrada no cartão <b>{carteiraSelecionada?.nome}</b> — o vencimento
                    é o da fatura do cartão, não uma data própria.
                  </p>
                ) : (
                  <>
                    <Field label="Frequência">
                      <Select value={frequenciaRec} onChange={(e) => setFrequenciaRec(e.target.value as FrequenciaRecorrencia)}>
                        <option value="mensal">Mensal</option>
                        <option value="semanal">Semanal</option>
                        <option value="anual">Anual</option>
                      </Select>
                    </Field>
                    <p className="mt-2 text-[11px] text-text-3">
                      Cria uma recorrência a partir de {formatDate(new Date(`${data}T00:00:00`), 'dd/MM')} — gerenciável em "Recorrências".
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {erro && <p className="mt-3 text-[12px] font-medium text-danger">{erro}</p>}

      <div className="mt-6 flex gap-3">
        <Button variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button className="flex-1" loading={loading} onClick={salvar}>
          {editar ? 'Salvar alterações' : 'Salvar transação'}
        </Button>
      </div>
    </Modal>
  )
}
