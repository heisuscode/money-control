import { getCurrency } from '@/lib/currencies'

/** Chip redondo colorido com símbolo da moeda (usado em listas e seletores). */
export function CurrencyChip({ code, size = 28 }: { code: string; size?: number }) {
  const c = getCurrency(code)
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
      style={{ width: size, height: size, background: c.color }}
      title={c.name}
    >
      {c.symbol.length <= 2 ? c.symbol : c.code.slice(0, 1)}
    </span>
  )
}
