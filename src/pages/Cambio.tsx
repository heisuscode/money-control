import { useEffect, useMemo, useState } from 'react'
import { ArrowDownUp, Bell, TrendingUp, TrendingDown } from 'lucide-react'
import { Topbar } from '@/components/Topbar'
import { PageBody } from '@/components/PageBody'
import { Card, CardHeader, EmptyState, Select } from '@/components/ui'
import { Switch } from '@/components/ui/Switch'
import { CurrencyChip } from '@/components/CurrencyChip'
import { useData } from '@/contexts/DataContext'
import { CURRENCIES, getCurrency } from '@/lib/currencies'
import { convert } from '@/lib/exchange'
import { formatCurrency, formatNumber, maskMoneyInput, parseMoney } from '@/lib/format'
import { format } from 'date-fns'
import { cn } from '@/lib/cn'

const MONITORADAS = ['USD', 'EUR', 'GBP', 'JPY', 'CAD']

export default function Cambio() {
  const { rates, receitas, despesas, refreshRates } = useData()
  const [de, setDe] = useState('BRL')
  const [para, setPara] = useState('USD')
  const [valorStr, setValorStr] = useState(() => formatNumber(1000))
  const [alerta, setAlerta] = useState(() => localStorage.getItem('mc_alerta_usd') === '1')

  // Sempre que a tela de Câmbio é aberta, busca a cotação mais recente
  // (ignorando o cache de 30min usado no resto do app).
  useEffect(() => {
    refreshRates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const valor = parseMoney(valorStr)
  const recebe = convert(valor, de, para, rates)
  const taxaUnit = convert(1, de, para, rates)

  const estrangeiras = useMemo(
    () =>
      [...receitas, ...despesas]
        .filter((m) => m.moeda_original !== 'BRL')
        .sort((a, b) => (a.data < b.data ? 1 : -1))
        .slice(0, 8),
    [receitas, despesas],
  )

  const atualizado = rates.USD?.timestamp ? format(new Date(rates.USD.timestamp), 'HH:mm') : '--:--'

  function swap() {
    setDe(para)
    setPara(de)
  }

  return (
    <>
      <Topbar
        title={
          <span className="flex items-center gap-2">
            Câmbio
            <span className="rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-bold text-success">
              ● Taxas ao vivo
            </span>
          </span>
        }
        subtitle={`Atualizado ${atualizado} · BCB / ECB`}
      />
      <PageBody>
        <div className="grid gap-[18px] lg:grid-cols-[1.3fr_1fr]">
          <div className="flex flex-col gap-[18px]">
            <Card>
              <CardHeader title="Conversor" />
              <div className="relative flex flex-col gap-3">
                <ConvLinha
                  label="Você converte"
                  valor={valorStr}
                  onValor={(v) => setValorStr(maskMoneyInput(v))}
                  moeda={de}
                  onMoeda={setDe}
                  editavel
                />
                <button
                  onClick={swap}
                  className="absolute left-1/2 top-1/2 z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-white shadow-btn"
                  title="Inverter"
                >
                  <ArrowDownUp size={18} />
                </button>
                <ConvLinha
                  label="Você recebe"
                  valor={formatNumber(recebe)}
                  moeda={para}
                  onMoeda={setPara}
                  destaque
                />
              </div>
              <p className="num mt-3 text-[12px] text-text-3">
                1 {de} = {formatNumber(taxaUnit, 5)} {para} · taxa registrada na transação
              </p>
            </Card>

            <Card className="!p-0">
              <div className="border-b border-line px-5 py-4">
                <h3 className="card-title">Movimentações em moeda estrangeira</h3>
              </div>
              {estrangeiras.length === 0 ? (
                <EmptyState
                  title="Nenhuma movimentação em moeda estrangeira"
                  description="Registre uma transação em outra moeda para ver a exibição dupla aqui."
                />
              ) : (
                <div className="flex flex-col">
                  {estrangeiras.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 border-b border-line px-5 py-3.5 last:border-0">
                      <CurrencyChip code={m.moeda_original} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-semibold text-text-1">{m.descricao}</div>
                        <div className="num text-[11px] text-text-3">
                          Convertido a {formatNumber(m.taxa, 4)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={cn(
                            'num text-[14px] font-semibold',
                            m.tipo === 'receita' ? 'text-success' : 'text-text-1',
                          )}
                        >
                          {m.tipo === 'receita' ? '+ ' : '− '}
                          {formatCurrency(m.valor)}
                        </div>
                        <div className="num text-[11px] text-text-3">
                          {getCurrency(m.moeda_original).symbol} {formatNumber(m.valor_original)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card className="flex flex-col">
            <CardHeader
              title={
                <div>
                  <div>Moedas monitoradas</div>
                  <div className="mt-0.5 text-[12px] font-normal text-text-3">
                    Cotação em BRL · variação 24h
                  </div>
                </div>
              }
            />
            <div className="flex flex-col gap-1">
              {MONITORADAS.map((code) => {
                const r = rates[code]
                const c = getCurrency(code)
                const pct = r?.pct ?? 0
                return (
                  <button
                    key={code}
                    onClick={() => { setDe('BRL'); setPara(code) }}
                    title={`Converter BRL → ${code}`}
                    className="flex w-full items-center gap-3 border-b border-line py-3 text-left transition last:border-0 hover:bg-subtle"
                  >
                    <CurrencyChip code={code} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold text-text-1">{c.name}</div>
                      <div className="text-[11px] text-text-3">{code}</div>
                    </div>
                    <div className="text-right">
                      <div className="num text-[14px] font-semibold text-text-1">
                        {formatNumber(r?.brlPerUnit ?? 0)}
                      </div>
                      <div
                        className={cn(
                          'flex items-center justify-end gap-1 text-[11px] font-semibold',
                          pct >= 0 ? 'text-success' : 'text-danger',
                        )}
                      >
                        {pct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {Math.abs(pct).toFixed(1)}%
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-auto flex items-center gap-3 rounded-xl bg-active-bg px-3 py-3 dark:bg-card">
              <Bell size={16} className="text-brand dark:text-active-text" />
              <span className="flex-1 text-[12px] font-medium text-brand-700 dark:text-active-text">
                Avise-me quando o USD ficar abaixo de R$ 5,30
              </span>
              <Switch
                checked={alerta}
                onCheckedChange={(v) => {
                  setAlerta(v)
                  localStorage.setItem('mc_alerta_usd', v ? '1' : '0')
                }}
              />
            </div>
          </Card>
        </div>
      </PageBody>
    </>
  )
}

function ConvLinha({
  label,
  valor,
  onValor,
  moeda,
  onMoeda,
  editavel,
  destaque,
}: {
  label: string
  valor: string
  onValor?: (v: string) => void
  moeda: string
  onMoeda: (v: string) => void
  editavel?: boolean
  destaque?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-2xl border p-4',
        destaque ? 'border-brand bg-active-bg' : 'border-line bg-subtle',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[12px] text-text-3">{label}</div>
        {editavel ? (
          <input
            value={valor}
            onChange={(e) => onValor?.(e.target.value)}
            inputMode="decimal"
            className="num w-full bg-transparent text-[24px] font-semibold text-text-1 outline-none"
          />
        ) : (
          <div className={cn('num text-[24px] font-semibold', destaque ? 'text-brand' : 'text-text-1')}>
            {valor}
          </div>
        )}
      </div>
      <Select value={moeda} onChange={(e) => onMoeda(e.target.value)} className="w-28 flex-none bg-surface">
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code}
          </option>
        ))}
      </Select>
    </div>
  )
}
