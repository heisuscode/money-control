import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

/* ---------------------------------- Button -------------------------------- */
type Variant = 'primary' | 'ghost' | 'danger' | 'subtle'
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', loading, className, children, disabled, ...rest }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition disabled:opacity-60 disabled:cursor-not-allowed px-[18px] py-[11px]'
    const styles: Record<Variant, string> = {
      primary: 'bg-brand text-white shadow-btn hover:bg-brand-700',
      ghost: 'bg-surface text-text-1 border border-line hover:bg-subtle font-semibold',
      subtle: 'bg-subtle text-text-1 hover:opacity-90 font-semibold',
      danger: 'bg-danger text-white hover:opacity-90',
    }
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, styles[variant], className)}
        {...rest}
      >
        {loading && <Spinner className="h-4 w-4" />}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'

/* ----------------------------------- Input -------------------------------- */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input ref={ref} className={cn('input-base', className)} {...rest} />
  ),
)
Input.displayName = 'Input'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...rest }, ref) => (
    <select ref={ref} className={cn('input-base cursor-pointer pr-8', className)} {...rest}>
      {children}
    </select>
  ),
)
Select.displayName = 'Select'

export function Field({
  label,
  htmlFor,
  children,
  hint,
  error,
}: {
  label: string
  htmlFor?: string
  children: ReactNode
  hint?: string
  error?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-text-2">
        {label}
      </label>
      {children}
      {error ? (
        <span className="text-[12px] font-medium text-danger">{error}</span>
      ) : hint ? (
        <span className="text-[12px] text-text-3">{hint}</span>
      ) : null}
    </div>
  )
}

/* ----------------------------------- Card --------------------------------- */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('panel p-[18px]', className)}>{children}</div>
}

export function CardHeader({
  title,
  action,
  className,
}: {
  title: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-4 flex items-center justify-between', className)}>
      <h3 className="card-title text-text-1">{title}</h3>
      {action}
    </div>
  )
}

/* ---------------------------------- Spinner ------------------------------- */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin', className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

/* --------------------------------- States --------------------------------- */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      {icon && <div className="mb-1 text-text-3">{icon}</div>}
      <p className="text-[15px] font-bold text-text-1">{title}</p>
      {description && <p className="max-w-xs text-[13px] text-text-2">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <p className="text-[14px] font-semibold text-danger">
        {message ?? 'Ocorreu um erro ao carregar os dados.'}
      </p>
      {onRetry && (
        <Button variant="ghost" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-subtle', className)} />
}

/* ----------------------------------- Chip --------------------------------- */
export function Chip({
  children,
  color,
  className,
}: {
  children: ReactNode
  color?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold',
        className,
      )}
      style={
        color
          ? { color, background: `color-mix(in srgb, ${color} 14%, transparent)` }
          : undefined
      }
    >
      {children}
    </span>
  )
}
