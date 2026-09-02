export type BadgeVariant = 'new' | 'cooking' | 'ready' | 'done' | 'danger' | 'neutral' | 'cancelled'

const colorMap: Record<BadgeVariant, { bg: string; text: string; label: string }> = {
  new: { bg: 'bg-status-new/15', text: 'text-status-new', label: 'Baru' },
  cooking: { bg: 'bg-status-cooking/15', text: 'text-status-cooking', label: 'Dimasak' },
  ready: { bg: 'bg-status-ready/15', text: 'text-status-ready', label: 'Siap' },
  done: { bg: 'bg-status-done/15', text: 'text-status-done', label: 'Selesai' },
  danger: { bg: 'bg-status-danger/15', text: 'text-status-danger', label: 'Habis' },
  neutral: { bg: 'bg-bg-secondary', text: 'text-text-secondary', label: 'Diproses' },
  cancelled: { bg: 'bg-status-danger/15', text: 'text-status-danger', label: 'Dibatalkan' },
}

interface StatusBadgeProps {
  variant: BadgeVariant
  label?: string
}

export function StatusBadge({ variant, label }: StatusBadgeProps) {
  const c = colorMap[variant] ?? colorMap.neutral
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-caption font-bold uppercase tracking-wider ${c.bg} ${c.text}`}
    >
      {label ?? c.label}
    </span>
  )
}
