interface LoadingStateProps {
  variant?: 'text' | 'skeleton'
  text?: string
  count?: number
}

export function LoadingState({ variant = 'text', text = 'Memuat...', count = 6 }: LoadingStateProps) {
  if (variant === 'skeleton') {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex aspect-square animate-pulse flex-col items-center justify-center gap-2 rounded-xl border-2 border-border-subtle bg-bg-surface"
          />
        ))}
      </div>
    )
  }
  return <p className="py-12 text-center text-body text-text-secondary">{text}</p>
}