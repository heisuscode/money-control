import { cn } from '@/lib/cn'

interface Tab {
  value: string
  label: string
}

/** Abas em "pílula" usadas nas topbars (Todas/Receitas/Despesas etc.). */
export function SegmentedTabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: Tab[]
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  return (
    <div className={cn('inline-flex rounded-xl bg-subtle p-1', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition',
            value === t.value
              ? 'bg-surface text-brand shadow-sm'
              : 'text-text-2 hover:text-text-1',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
