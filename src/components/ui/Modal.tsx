import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  children: ReactNode
  /** largura máx em px do painel (desktop). */
  maxWidth?: number
  /** conteúdo extra à direita do painel (ex.: seletor de moeda). */
  side?: ReactNode
}

/**
 * Modal acessível (Radix Dialog). No mobile vira bottom sheet.
 */
export function Modal({ open, onOpenChange, title, children, maxWidth = 520, side }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 gap-0 overflow-hidden rounded-[22px] border border-line bg-surface shadow-card outline-none',
            'max-sm:bottom-0 max-sm:top-auto max-sm:left-0 max-sm:max-h-[92vh] max-sm:translate-x-0 max-sm:translate-y-0 max-sm:w-full max-sm:rounded-b-none max-sm:rounded-t-[22px]',
          )}
          style={{ maxWidth: side ? maxWidth + 240 : maxWidth }}
        >
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-[26px] max-sm:p-5">
            {title && (
              <div className="mb-5 flex items-center justify-between">
                <Dialog.Title className="text-[18px] font-extrabold tracking-tightest text-text-1">
                  {title}
                </Dialog.Title>
                <Dialog.Close className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-3 hover:bg-subtle">
                  <X className="h-4 w-4" />
                </Dialog.Close>
              </div>
            )}
            {children}
          </div>
          {side && (
            <div className="flex w-[240px] shrink-0 flex-col border-l border-line bg-app/60 p-4 max-sm:hidden">
              {side}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
