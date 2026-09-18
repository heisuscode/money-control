import { Modal } from './Modal'
import { Button } from './index'

export function ConfirmDialog({
  open,
  onOpenChange,
  title = 'Confirmar',
  message,
  confirmLabel = 'Excluir',
  destructive = true,
  loading,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title?: string
  message: string
  confirmLabel?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} maxWidth={400}>
      <p className="text-[14px] text-text-2">{message}</p>
      <div className="mt-6 flex gap-3">
        <Button variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button
          variant={destructive ? 'danger' : 'primary'}
          className="flex-1"
          loading={loading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
