// Módulo de câmbio (RF15–RF25).
// Fonte: AwesomeAPI (https://docs.awesomeapi.com.br/) — cotações em relação ao BRL.
// Estratégia de resiliência (RN08 / RNF11): cache em localStorage + cotações de
// fallback caso a API esteja indisponível; o app continua funcionando com a
// última cotação conhecida e permite taxa manual no formulário.

import { CURRENCIES } from './currencies'

export interface Rate {
  /** Quantos BRL valem 1 unidade da moeda. (BRL = 1) */
  brlPerUnit: number
  /** Variação percentual nas últimas 24h. */
  pct: number
  /** Quando a cotação foi obtida. */
  timestamp: string
}

export type RateMap = Record<string, Rate>

const CACHE_KEY = 'mc_rates_cache'
const CACHE_TTL_MS = 1000 * 60 * 30 // 30 min (RF21 — revalidação por frequência)

// Cotações aproximadas usadas só como fallback (BRL por 1 unidade).
const FALLBACK: Record<string, number> = {
  BRL: 1,
  USD: 5.49,
  EUR: 6.12,
  GBP: 7.03,
  JPY: 0.037,
  CAD: 4.02,
  AUD: 3.63,
  CHF: 6.45,
  CNY: 0.76,
  ARS: 0.0058,
  MXN: 0.29,
  CLP: 0.0059,
  UYU: 0.14,
  PYG: 0.00074,
  PEN: 1.46,
}

function buildFallback(): RateMap {
  const ts = new Date().toISOString()
  const map: RateMap = {}
  for (const c of CURRENCIES) {
    map[c.code] = { brlPerUnit: FALLBACK[c.code] ?? 1, pct: 0, timestamp: ts }
  }
  return map
}

function readCache(): { at: number; rates: RateMap } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeCache(rates: RateMap) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), rates }))
  } catch {
    /* ignore */
  }
}

/**
 * Busca as cotações de todas as moedas (em relação ao BRL).
 * Usa cache se ainda válido; em erro, devolve o último cache ou o fallback.
 */
export async function fetchRates(force = false): Promise<RateMap> {
  const cached = readCache()
  if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.rates
  }

  const foreign = CURRENCIES.filter((c) => c.code !== 'BRL').map((c) => `${c.code}-BRL`)
  const url = `https://economia.awesomeapi.com.br/last/${foreign.join(',')}`

  try {
    // Timeout para não travar a UI em rede lenta/indisponível (RN08/RNF11).
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 6000)
    const res = await fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer))
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as Record<
      string,
      { bid: string; pctChange: string; create_date?: string }
    >
    const ts = new Date().toISOString()
    const map: RateMap = { BRL: { brlPerUnit: 1, pct: 0, timestamp: ts } }
    for (const c of CURRENCIES) {
      if (c.code === 'BRL') continue
      const entry = data[`${c.code}BRL`]
      if (entry) {
        map[c.code] = {
          brlPerUnit: parseFloat(entry.bid),
          pct: parseFloat(entry.pctChange ?? '0'),
          timestamp: entry.create_date ? new Date(entry.create_date).toISOString() : ts,
        }
      } else {
        map[c.code] = { brlPerUnit: FALLBACK[c.code] ?? 1, pct: 0, timestamp: ts }
      }
    }
    writeCache(map)
    return map
  } catch (err) {
    console.warn('[câmbio] API indisponível, usando última cotação conhecida.', err)
    return cached?.rates ?? buildFallback()
  }
}

/** Converte um valor de uma moeda para outra usando o RateMap (base BRL). */
export function convert(amount: number, from: string, to: string, rates: RateMap): number {
  const f = rates[from]?.brlPerUnit ?? FALLBACK[from] ?? 1
  const t = rates[to]?.brlPerUnit ?? FALLBACK[to] ?? 1
  const inBRL = amount * f
  return inBRL / t
}

/** Taxa direta: quantas unidades de `to` valem 1 unidade de `from`. */
export function rateBetween(from: string, to: string, rates: RateMap): number {
  return convert(1, from, to, rates)
}
