export function passwordScore(pw: string): number {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score // 0..4
}

const LABELS = ['Muito fraca', 'Fraca', 'Média', 'Boa', 'Forte']
const COLORS = ['#E5484D', '#E5484D', '#F59E0B', '#16A34A', '#16A34A']

/** Medidor de força (4 barras) — telas de cadastro e nova senha. */
export function PasswordStrength({ password }: { password: string }) {
  const score = passwordScore(password)
  if (!password) return null
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{ background: i < score ? COLORS[score] : 'var(--border)' }}
          />
        ))}
      </div>
      <span className="text-[11px] font-bold" style={{ color: COLORS[score] }}>
        {LABELS[score]}
      </span>
    </div>
  )
}
