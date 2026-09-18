import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Área de conteúdo padrão (padding 22–24px / 26px sobre bg-app). */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-[18px] p-4 md:px-[26px] md:py-[22px]', className)}>
      {children}
    </div>
  )
}
